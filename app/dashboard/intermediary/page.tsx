'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Order = {
    id: string
    order_no: string
    order_date: string
    delivery_date: string | null
    status: string
    current_step: number | null
    companies: { name: string } | null
    order_items: { quantity: number; unit_price: number | null; products: { name: string } | null }[]
}

export default function IntermediaryDashboard() {
    const router = useRouter()
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [userName, setUserName] = useState('')
    const [stats, setStats] = useState({ newOrders: 0, pendingApproval: 0, shippingRequested: 0, issues: 0 })

  useEffect(() => {
        const load = async () => {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { router.push('/login'); return }

                const { data: profile } = await supabase
                  .from('or_user_profiles')
                  .select('name, role')
                  .eq('id', user.id)
                  .single()

                if (profile?.role !== 'admin' && profile?.role !== 'intermediary') {
                          router.push('/')
                          return
                }
                setUserName(profile?.name || user.email || '')

                const { data: orderData } = await supabase
                  .from('orders')
                  .select('id, order_no, order_date, delivery_date, status, current_step, companies(name), order_items(quantity, unit_price, products(name))')
                  .order('order_date', { ascending: false })
                  .limit(20)

                const list = (orderData || []) as Order[]
                setOrders(list)

                const today = new Date().toISOString().split('T')[0]
                setStats({
                          newOrders: list.filter(o => o.order_date.startsWith(today)).length,
                          pendingApproval: list.filter(o => o.status === 'pending' || o.current_step === 0).length,
                          shippingRequested: list.filter(o => o.status === 'approved').length,
                          issues: list.filter(o => o.status === 'issue').length,
                })
                setLoading(false)
        }
        load()
  }, [router])

  const getStatusBadge = (status: string, step: number | null) => {
        if (status === 'completed') return <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">納品完了</span>
              if (status === 'approved') return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">出荷依頼済</span>
              if (status === 'issue') return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">問題案件</span>
              return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">承認待ち</span>
          }
    
      const handleApprove = async (orderId: string) => {
            const res = await fetch('/api/approve-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId, step: 1 }),
            })
                  const data = await res.json()
                        if (data.success) {
                                alert('承認メールを送信しました')
                        }
      }
        
          if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
            
              const totalAmount = orders.reduce((sum, o) => {
                return sum + o.order_items.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0)
          }, 0)
            
              return (
                    <div className="min-h-screen bg-gray-50 flex">
                      {/* Sidebar */}
                          <div className="w-56 bg-gray-900 text-white flex flex-col fixed h-full z-10">
                                  <div className="p-4 border-b border-gray-700">
                                            <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-sm font-bold">商</div>
                                                        <div>
                                                                      <div className="text-sm font-bold">商流OS</div>
                                                                      <div className="text-xs text-gray-400">中間業者管理画面</div>
                                                        </div>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">ゼロテック株式会社</div>
                                  </div>
                                  <nav className="flex-1 p-3 space-y-1">
                                            <div className="px-3 py-2 bg-blue-600 rounded text-sm font-medium">🏠 ダッシュボード</div>
                                            <Link href="/orders" className="block px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700">📋 受発注管理</Link>
                                            <Link href="#" className="block px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700">📜 納品書管理</Link>
                                            <Link href="#" className="block px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700">￥ 請求管理</Link>
                                            <Link href="/companies" className="block px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700">🏢 取引先管理</Link>
                                            <Link href="/products" className="block px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700">📦 商品管理</Link>
                                            <Link href="/admin/users" className="block px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700">⚙️ 設定</Link>
                            </nav>
                                  <div className="p-3 border-t border-gray-700">
                                            <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
                                                          className="w-full px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700 text-left">🚪 ログアウト</button>
                                  </div>
                          </div>
                    
                      {/* Main */}
                          <div className="ml-56 flex-1 p-6">
                            {/* Header */}
                                  <div className="flex items-center justify-between mb-6">
                                            <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>
                                            <div className="flex items-center gap-4">
                                                        <span className="text-sm text-gray-500">{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</span>
                                                        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                                                                      <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs">👤</div>
                                                                      <span className="text-sm font-medium">{userName}</span>
                                                        </div>
                                            </div>
                                  </div>
                          
                            {/* Stats Cards */}
                                  <div className="grid grid-cols-4 gap-4 mb-6">
                                            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
                                                        <div className="text-xs text-gray-500 mb-1">新規注文</div>
                                                        <div className="text-3xl font-bold text-gray-800">{stats.newOrders}<span className="text-sm font-normal text-gray-500 ml-1">件</span></div>
                                                        <div className="text-xs text-gray-400 mt-1">本日受信</div>
                                                        <Link href="/orders" className="text-xs text-blue-500 mt-2 block">詳細を見る &gt;</Link>
                                            </div>
                                            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
                                                        <div className="text-xs text-gray-500 mb-1">承認待ち</div>
                                                        <div className="text-3xl font-bold text-gray-800">{stats.pendingApproval}<span className="text-sm font-normal text-gray-500 ml-1">件</span></div>
                                                        <div className="text-xs text-gray-400 mt-1">確認が必要</div>
                                                        <Link href="/orders" className="text-xs text-blue-500 mt-2 block">詳細を見る &gt;</Link>
                                            </div>
                                            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                                                        <div className="text-xs text-gray-500 mb-1">出荷依頼済</div>
                                                        <div className="text-3xl font-bold text-gray-800">{stats.shippingRequested}<span className="text-sm font-normal text-gray-500 ml-1">件</span></div>
                                                        <div className="text-xs text-gray-400 mt-1">九州食糧に依頼済</div>
                                                        <Link href="/orders" className="text-xs text-blue-500 mt-2 block">詳細を見る &gt;</Link>
                                            </div>
                                            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
                                                        <div className="text-xs text-gray-500 mb-1">問題案件</div>
                                                        <div className="text-3xl font-bold text-gray-800">{stats.issues}<span className="text-sm font-normal text-gray-500 ml-1">件</span></div>
                                                        <div className="text-xs text-gray-400 mt-1">対応が必要</div>
                                                        <Link href="/orders" className="text-xs text-blue-500 mt-2 block">詳細を見る &gt;</Link>
                                            </div>
                                  </div>
                          
                                  <div className="grid grid-cols-3 gap-6">
                                    {/* Orders Table */}
                                            <div className="col-span-2 bg-white rounded-xl shadow-sm p-5">
                                                        <div className="flex items-center justify-between mb-4">
                                                                      <h2 className="font-semibold text-gray-800">受発注状況（最新一覧）</h2>
                                                                      <Link href="/orders" className="text-sm text-blue-500">すべての受発注を見る &gt;</Link>
                                                        </div>
                                                        <table className="w-full text-sm">
                                                                      <thead>
                                                                                      <tr className="border-b text-gray-500 text-xs">
                                                                                                        <th className="text-left py-2">注文番号</th>
                                                                                                        <th className="text-left py-2">注文日</th>
                                                                                                        <th className="text-left py-2">発注者</th>
                                                                                                        <th className="text-left py-2">商品・数量</th>
                                                                                                        <th className="text-left py-2">納品希望日</th>
                                                                                                        <th className="text-left py-2">ステータス</th>
                                                                                                        <th className="text-left py-2">操作</th>
                                                                                        </tr>
                                                                      </thead>
                                                                      <tbody>
                                                                        {orders.slice(0, 8).map(order => {
                                        const item = order.order_items[0]
                                                            const productName = item?.products?.name || '-'
                                                                                const qty = item?.quantity || 0
                                                                                                    return (
                                                                                                                          <tr key={order.id} className="border-b hover:bg-gray-50">
                                                                                                                                                <td className="py-2 text-blue-600 font-medium">{order.order_no}</td>
                                                                                                                                                <td className="py-2 text-gray-600">{order.order_date}</td>
                                                                                                                                                <td className="py-2 text-gray-700">{order.companies?.name || '-'}</td>
                                                                                                                                                <td className="py-2 text-gray-700">{productName} {qty}本</td>
                                                                                                                                                <td className="py-2 text-gray-600">{order.delivery_date || '-'}</td>
                                                                                                                                                <td className="py-2">{getStatusBadge(order.status, order.current_step)}</td>
                                                                                                                                                <td className="py-2">
                                                                                                                                                  {(order.status === 'pending' || order.current_step === 0) ? (
                                                                                                                                                      <button onClick={() => handleApprove(order.id)}
                                                                                                                                                                                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">承認</button>
                                                                                                                                                    ) : (
                                                                                                                                                      <Link href={`/orders/${order.id}`} className="px-2 py-1 border text-xs rounded hover:bg-gray-100">詳細</Link>
                                                                                                                                                                        )}
                                                                                                                                                  </td>
                                                                                                                            </tr>
                                                                                                                        )
                                                                        })}
                                                                      </tbody>
                                                        </table>
                                            </div>
                                  
                                    {/* Right Panel */}
                                            <div className="space-y-4">
                                              {/* Billing Summary */}
                                                        <div className="bg-white rounded-xl shadow-sm p-5">
                                                                      <h2 className="font-semibold text-gray-800 mb-3">請求サマリー（今月）</h2>
                                                                      <div className="space-y-3">
                                                                                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                                                                        <span className="text-sm text-gray-600">今月の請求額</span>
                                                                                                        <span className="font-bold text-gray-800">￥{totalAmount.toLocaleString()}</span>
                                                                                        </div>
                                                                                      <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                                                                                                        <span className="text-sm text-gray-600">未入金額</span>
                                                                                                        <span className="font-bold text-yellow-700">￥-</span>
                                                                                        </div>
                                                                                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                                                                                        <span className="text-sm text-gray-600">入金済み額</span>
                                                                                                        <span className="font-bold text-green-700">￥-</span>
                                                                                        </div>
                                                                      </div>
                                                        </div>
                                            
                                              {/* Business Flow */}
                                                        <div className="bg-white rounded-xl shadow-sm p-5">
                                                                      <h2 className="font-semibold text-gray-800 mb-3">本日の業務フロー</h2>
                                                                      <div className="space-y-2">
                                                                        {[
                      { label: '注文受信', count: stats.newOrders, color: 'bg-blue-500', status: '完了' },
                      { label: '承認', count: stats.pendingApproval, color: 'bg-yellow-500', status: '対応中' },
                      { label: '出荷依頼', count: stats.shippingRequested, color: 'bg-green-500', status: '完了' },
                      { label: '納品書発行', count: 0, color: 'bg-purple-500', status: '対応中' },
                      { label: '請求書発行', count: 0, color: 'bg-orange-500', status: '対応中' },
                      { label: '入金確認', count: 0, color: 'bg-teal-500', status: '完了' },
                                      ].map((step, i) => (
                                                          <div key={i} className="flex items-center justify-between text-xs">
                                                                              <div className="flex items-center gap-2">
                                                                                                    <div className={`w-2 h-2 rounded-full ${step.color}`}></div>
                                                                                                    <span className="text-gray-700">{step.label}</span>
                                                                              </div>
                                                                              <div className="flex items-center gap-2">
                                                                                                    <span className="font-bold">{step.count}件</span>
                                                                                                    <span className={`px-1.5 py-0.5 rounded text-xs ${step.status === '完了' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{step.status}</span>
                                                                              </div>
                                                          </div>
                                                        ))}
                                                                      </div>
                                                        </div>
                                            </div>
                                  </div>
                          </div>
                    </div>
                  )
}
