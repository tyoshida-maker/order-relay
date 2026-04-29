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
                  .eq('user_id', user.id)
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
        if (status === 'completed') return <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">\u7d0d\u54c1\u5b8c\u4e86</span>
              if (status === 'approved') return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">\u51fa\u8377\u4f9d\u983c\u6e08</span>
              if (status === 'issue') return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">\u554f\u984c\u6848\u4ef6</span>
              return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">\u627f\u8a8d\u5f85\u3061</span>
          }
    
      const handleApprove = async (orderId: string) => {
            const res = await fetch('/api/approve-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId, step: 1 }),
            })
                  const data = await res.json()
                        if (data.success) {
                                alert('\u627f\u8a8d\u30e1\u30fc\u30eb\u3092\u9001\u4fe1\u3057\u307e\u3057\u305f')
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
                                                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-sm font-bold">\u5546</div>
                                                        <div>
                                                                      <div className="text-sm font-bold">\u5546\u6d41OS</div>
                                                                      <div className="text-xs text-gray-400">\u4e2d\u9593\u696d\u8005\u7ba1\u7406\u753b\u9762</div>
                                                        </div>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">\u30bc\u30ed\u30c6\u30c3\u30af\u682a\u5f0f\u4f1a\u793e</div>
                                  </div>
                                  <nav className="flex-1 p-3 space-y-1">
                                            <div className="px-3 py-2 bg-blue-600 rounded text-sm font-medium">\ud83c\udfe0 \u30c0\u30c3\u30b7\u30e5\u30dc\u30fc\u30c9</div>
                                            <Link href="/orders" className="block px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700">\ud83d\udccb \u53d7\u767a\u6ce8\u7ba1\u7406</Link>
                                            <Link href="#" className="block px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700">\ud83d\udcdc \u7d0d\u54c1\u66f8\u7ba1\u7406</Link>
                                            <Link href="#" className="block px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700">\uffe5 \u8acb\u6c42\u7ba1\u7406</Link>
                                            <Link href="/companies" className="block px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700">\ud83c\udfe2 \u53d6\u5f15\u5148\u7ba1\u7406</Link>
                                            <Link href="/products" className="block px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700">\ud83d\udce6 \u5546\u54c1\u7ba1\u7406</Link>
                                            <Link href="/admin/users" className="block px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700">\u2699\ufe0f \u8a2d\u5b9a</Link>
                            </nav>
                                  <div className="p-3 border-t border-gray-700">
                                            <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
                                                          className="w-full px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700 text-left">\ud83d\udeaa \u30ed\u30b0\u30a2\u30a6\u30c8</button>
                                  </div>
                          </div>
                    
                      {/* Main */}
                          <div className="ml-56 flex-1 p-6">
                            {/* Header */}
                                  <div className="flex items-center justify-between mb-6">
                                            <h1 className="text-2xl font-bold text-gray-800">\u30c0\u30c3\u30b7\u30e5\u30dc\u30fc\u30c9</h1>h1>
                                            <div className="flex items-center gap-4">
                                                        <span className="text-sm text-gray-500">{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</span>
                                                        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                                                                      <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs">\ud83d\udc64</div>
                                                                      <span className="text-sm font-medium">{userName}</span>
                                                        </div>
                                            </div>
                                  </div>
                          
                            {/* Stats Cards */}
                                  <div className="grid grid-cols-4 gap-4 mb-6">
                                            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
                                                        <div className="text-xs text-gray-500 mb-1">\u65b0\u898f\u6ce8\u6587</div>
                                                        <div className="text-3xl font-bold text-gray-800">{stats.newOrders}<span className="text-sm font-normal text-gray-500 ml-1">\u4ef6</span></div>
                                                        <div className="text-xs text-gray-400 mt-1">\u672c\u65e5\u53d7\u4fe1</div>
                                                        <Link href="/orders" className="text-xs text-blue-500 mt-2 block">\u8a73\u7d30\u3092\u898b\u308b &gt;</Link>
                                            </div>
                                            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
                                                        <div className="text-xs text-gray-500 mb-1">\u627f\u8a8d\u5f85\u3061</div>
                                                        <div className="text-3xl font-bold text-gray-800">{stats.pendingApproval}<span className="text-sm font-normal text-gray-500 ml-1">\u4ef6</span></div>
                                                        <div className="text-xs text-gray-400 mt-1">\u78ba\u8a8d\u304c\u5fc5\u8981</div>
                                                        <Link href="/orders" className="text-xs text-blue-500 mt-2 block">\u8a73\u7d30\u3092\u898b\u308b &gt;</Link>
                                            </div>
                                            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                                                        <div className="text-xs text-gray-500 mb-1">\u51fa\u8377\u4f9d\u983c\u6e08</div>
                                                        <div className="text-3xl font-bold text-gray-800">{stats.shippingRequested}<span className="text-sm font-normal text-gray-500 ml-1">\u4ef6</span></div>
                                                        <div className="text-xs text-gray-400 mt-1">\u4e5d\u5dde\u98df\u7ce7\u306b\u4f9d\u983c\u6e08</div>
                                                        <Link href="/orders" className="text-xs text-blue-500 mt-2 block">\u8a73\u7d30\u3092\u898b\u308b &gt;</Link>
                                            </div>
                                            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
                                                        <div className="text-xs text-gray-500 mb-1">\u554f\u984c\u6848\u4ef6</div>
                                                        <div className="text-3xl font-bold text-gray-800">{stats.issues}<span className="text-sm font-normal text-gray-500 ml-1">\u4ef6</span></div>
                                                        <div className="text-xs text-gray-400 mt-1">\u5bfe\u5fdc\u304c\u5fc5\u8981</div>
                                                        <Link href="/orders" className="text-xs text-blue-500 mt-2 block">\u8a73\u7d30\u3092\u898b\u308b &gt;</Link>
                                            </div>
                                  </div>
                          
                                  <div className="grid grid-cols-3 gap-6">
                                    {/* Orders Table */}
                                            <div className="col-span-2 bg-white rounded-xl shadow-sm p-5">
                                                        <div className="flex items-center justify-between mb-4">
                                                                      <h2 className="font-semibold text-gray-800">\u53d7\u767a\u6ce8\u72b6\u6cc1\uff08\u6700\u65b0\u4e00\u89a7\uff09</h2>h2>
                                                                      <Link href="/orders" className="text-sm text-blue-500">\u3059\u3079\u3066\u306e\u53d7\u767a\u6ce8\u3092\u898b\u308b &gt;</Link>
                                                        </div>
                                                        <table className="w-full text-sm">
                                                                      <thead>
                                                                                      <tr className="border-b text-gray-500 text-xs">
                                                                                                        <th className="text-left py-2">\u6ce8\u6587\u756a\u53f7</th>
                                                                                                        <th className="text-left py-2">\u6ce8\u6587\u65e5</th>
                                                                                                        <th className="text-left py-2">\u767a\u6ce8\u8005</th>
                                                                                                        <th className="text-left py-2">\u5546\u54c1\u30fb\u6570\u91cf</th>
                                                                                                        <th className="text-left py-2">\u7d0d\u54c1\u5e0c\u671b\u65e5</th>
                                                                                                        <th className="text-left py-2">\u30b9\u30c6\u30fc\u30bf\u30b9</th>
                                                                                                        <th className="text-left py-2">\u64cd\u4f5c</th>
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
                                                                                                                                                <td className="py-2 text-gray-700">{productName} {qty}\u672c</td>
                                                                                                                                                <td className="py-2 text-gray-600">{order.delivery_date || '-'}</td>
                                                                                                                                                <td className="py-2">{getStatusBadge(order.status, order.current_step)}</td>
                                                                                                                                                <td className="py-2">
                                                                                                                                                  {(order.status === 'pending' || order.current_step === 0) ? (
                                                                                                                                                      <button onClick={() => handleApprove(order.id)}
                                                                                                                                                                                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">\u627f\u8a8d</button>
                                                                                                                                                    ) : (
                                                                                                                                                      <Link href={`/orders/${order.id}`} className="px-2 py-1 border text-xs rounded hover:bg-gray-100">\u8a73\u7d30</Link>
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
                                                                      <h2 className="font-semibold text-gray-800 mb-3">\u8acb\u6c42\u30b5\u30de\u30ea\u30fc\uff08\u4eca\u6708\uff09</h2>h2>
                                                                      <div className="space-y-3">
                                                                                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                                                                        <span className="text-sm text-gray-600">\u4eca\u6708\u306e\u8acb\u6c42\u984d</span>
                                                                                                        <span className="font-bold text-gray-800">\uffe5{totalAmount.toLocaleString()}</span>
                                                                                        </div>
                                                                                      <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                                                                                                        <span className="text-sm text-gray-600">\u672a\u5165\u91d1\u984d</span>
                                                                                                        <span className="font-bold text-yellow-700">\uffe5-</span>
                                                                                        </div>
                                                                                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                                                                                        <span className="text-sm text-gray-600">\u5165\u91d1\u6e08\u307f\u984d</span>
                                                                                                        <span className="font-bold text-green-700">\uffe5-</span>
                                                                                        </div>
                                                                      </div>
                                                        </div>
                                            
                                              {/* Business Flow */}
                                                        <div className="bg-white rounded-xl shadow-sm p-5">
                                                                      <h2 className="font-semibold text-gray-800 mb-3">\u672c\u65e5\u306e\u696d\u52d9\u30d5\u30ed\u30fc</h2>h2>
                                                                      <div className="space-y-2">
                                                                        {[
                      { label: '\u6ce8\u6587\u53d7\u4fe1', count: stats.newOrders, color: 'bg-blue-500', status: '\u5b8c\u4e86' },
                      { label: '\u627f\u8a8d', count: stats.pendingApproval, color: 'bg-yellow-500', status: '\u5bfe\u5fdc\u4e2d' },
                      { label: '\u51fa\u8377\u4f9d\u983c', count: stats.shippingRequested, color: 'bg-green-500', status: '\u5b8c\u4e86' },
                      { label: '\u7d0d\u54c1\u66f8\u767a\u884c', count: 0, color: 'bg-purple-500', status: '\u5bfe\u5fdc\u4e2d' },
                      { label: '\u8acb\u6c42\u66f8\u767a\u884c', count: 0, color: 'bg-orange-500', status: '\u5bfe\u5fdc\u4e2d' },
                      { label: '\u5165\u91d1\u78ba\u8a8d', count: 0, color: 'bg-teal-500', status: '\u5b8c\u4e86' },
                                      ].map((step, i) => (
                                                          <div key={i} className="flex items-center justify-between text-xs">
                                                                              <div className="flex items-center gap-2">
                                                                                                    <div className={`w-2 h-2 rounded-full ${step.color}`}></div>
                                                                                                    <span className="text-gray-700">{step.label}</span>
                                                                              </div>
                                                                              <div className="flex items-center gap-2">
                                                                                                    <span className="font-bold">{step.count}\u4ef6</span>
                                                                                                    <span className={`px-1.5 py-0.5 rounded text-xs ${step.status === '\u5b8c\u4e86' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{step.status}</span>
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
}</span>
