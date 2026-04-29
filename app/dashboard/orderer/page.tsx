'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Order = {
      id: string; order_no: string; order_date: string; delivery_date: string | null
      status: string; current_step: number | null
      order_items: { quantity: number; unit_price: number | null; products: { name: string } | null }[]
}

export default function OrdererDashboard() {
      const router = useRouter()
      const [orders, setOrders] = useState<Order[]>([])
      const [loading, setLoading] = useState(true)
      const [companyName, setCompanyName] = useState('')
      const [userName, setUserName] = useState('')

  useEffect(() => {
          const load = async () => {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) { router.push('/login'); return }
                    const { data: profile } = await supabase.from('or_user_profiles').select('name, role, company_id').eq('user_id', user.id).single()
                    setUserName(profile?.name || user.email || '')
                    if (profile?.company_id) {
                                const { data: co } = await supabase.from('companies').select('name').eq('id', profile.company_id).single()
                                setCompanyName(co?.name || '')
                    }
                    const { data: od } = await supabase.from('orders').select('id, order_no, order_date, delivery_date, status, current_step, order_items(quantity, unit_price, products(name))').order('order_date', { ascending: false }).limit(10)
                    setOrders((od || []) as Order[])
                    setLoading(false)
          }
          load()
  }, [router])

  const badge = (s: string) => {
          if (s === 'completed') return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">納品完了</span>span>
                  if (s === 'approved') return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">発送準備中</span>span>
                  if (s === 'shipped') return <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">発送済</span>span>
                  return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">注文受付</span>span>
              }
        
        if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>div></div>div>
              
              const lo = orders[0]; const li = lo?.order_items[0]
              const total = orders.reduce((s, o) => s + o.order_items.reduce((ss, i) => ss + (i.unit_price || 0) * i.quantity, 0), 0)
                    const steps = ['注文受付', '発送準備中', '発送済', '配送中', '納品予定']
                          const cs = lo?.current_step || 0
                                
                                return (
                                        <div className="min-h-screen bg-gray-50 flex">
                                              <div className="w-56 bg-white border-r flex flex-col fixed h-full z-10 shadow-sm">
                                                      <div className="p-4 border-b"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-sm font-bold">発</div>div><div><div className="text-sm font-bold">商流OS</div>div><div className="text-xs text-gray-400">発注者ダッシュボード</div>div></div>div></div>div></div>div>
                                                      <nav className="flex-1 p-3 space-y-1">
                                                                <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded text-sm font-medium">🏠 ダッシュボード</div>div>
                                                                <Link href="/orders/new" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">📝 発注する</Link>Link>
                                                                <Link href="/orders" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">📋 発注一覧</Link>Link>
                                                                <Link href="#" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">🚚 発送状況</Link>Link>
                                                                <Link href="#" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">¥ 請求一覧</Link>Link>
                                                                <Link href="#" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">⭐ お気に入りの発注</Link>Link>
                                                      </nav>nav>
                                                      <div className="p-3 border-t">
                                                                <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} className="w-full px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100 text-left">🚪 ログアウト</button>button>
                                                      </div>div>
                                              </div>div>
                                              <div className="ml-56 flex-1 p-6">
                                                      <div className="flex items-center justify-between mb-6">
                                                                <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>h1>
                                                                <div className="flex items-center gap-3">
                                                                            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-sm">🏢 <span className="font-medium">{companyName || '発注者'}</span>span></div>div>
                                                                            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-sm">👤 <span>{userName}</span>span></div>div>
                                                                </div>div>
                                                      </div>div>
                                                      <div className="grid grid-cols-4 gap-4 mb-6">
                                                                <div className="bg-white rounded-xl shadow-sm p-4 border"><div className="text-xs text-gray-500 mb-1">📅 次の納品予定</div>div><div className="text-lg font-bold">{lo?.delivery_date || '-'}</div>div><div className="text-xs text-gray-400">{li?.products?.name || '-'}</div>div></div>div>
                                                                <div className="bg-green-50 rounded-xl shadow-sm p-4 border border-green-100"><div className="text-xs text-gray-500 mb-1">🚚 発送状況</div>div><div className="mt-1">{badge(lo?.status || 'pending')}</div>div><div className="text-xs text-gray-400 mt-1">{lo?.delivery_date ? `${lo.delivery_date} 発送予定` : '-'}</div>div></div>div>
                                                                <div className="bg-orange-50 rounded-xl shadow-sm p-4 border border-orange-100"><div className="text-xs text-gray-500 mb-1">📦 直近の発注</div>div><div className="text-lg font-bold">{lo?.order_date || '-'}</div>div><div className="text-xs text-gray-400">{li?.products?.name} {li?.quantity}本</div>div></div>div>
                                                                <div className="bg-purple-50 rounded-xl shadow-sm p-4 border border-purple-100"><div className="text-xs text-gray-500 mb-1">¥ 今月の請求額</div>div><div className="text-lg font-bold">¥{total.toLocaleString()}</div>div><div className="text-xs text-gray-400">({new Date().getMonth() + 1}月分)</div>div></div>div>
                                                      </div>div>
                                                      <div className="grid grid-cols-3 gap-6">
                                                                <div className="col-span-2 bg-white rounded-xl shadow-sm p-5">
                                                                            <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-gray-800">発注一覧</h2>h2><Link href="/orders" className="text-sm text-blue-500">すべて見る &gt;</Link>Link></div>div>
                                                                            <table className="w-full text-sm">
                                                                                          <thead><tr className="border-b text-gray-500 text-xs"><th className="text-left py-2">発注日</th>th><th className="text-left py-2">注文番号</th>th><th className="text-left py-2">商品</th>th><th className="text-left py-2">納品予定</th>th><th className="text-left py-2">ステータス</th>th><th className="text-right py-2">金額</th>th></tr>tr></thead>thead>
                                                                                          <tbody>
                                                                                              {orders.slice(0, 5).map(o => {
                                                              const it = o.order_items[0]; const amt = o.order_items.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0)
                                                                                    return <tr key={o.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/orders/${o.id}`)}><td className="py-2 text-gray-600">{o.order_date}</td>td><td className="py-2 text-blue-600 font-medium">{o.order_no}</td>td><td className="py-2">{it?.products?.name || '-'} {it?.quantity}本</td>td><td className="py-2 text-gray-600">{o.delivery_date || '-'}</td>td><td className="py-2">{badge(o.status)}</td>td><td className="py-2 text-right">¥{amt.toLocaleString()}</td>td></tr>tr>
                                                                                        })}
                                                                                              </tbody>tbody>
                                                                            </table>table>
                                                                </div>div>
                                                                <div className="space-y-4">
                                                                            <div className="bg-white rounded-xl shadow-sm p-5">
                                                                                          <h2 className="font-semibold text-gray-800 mb-3">発送状況の確認</h2>h2>
                                                                                          <div className="flex items-center gap-1 flex-wrap">
                                                                                              {steps.map((label, i) => (<div key={i} className="flex items-center"><div className={`w-3 h-3 rounded-full ${i <= cs ? 'bg-blue-600' : 'bg-gray-200'}`}></div>div>{i < steps.length - 1 && <div className={`w-4 h-0.5 ${i < cs ? 'bg-blue-600' : 'bg-gray-200'}`}></div>div>}</div>div>))}
                                                                                              </div>div>
                                                                                          <div className="text-xs text-blue-600 mt-1">{steps[cs]}</div>div>
                                                                                          <Link href="/orders" className="block w-full text-center py-2 mt-3 bg-blue-600 text-white text-sm rounded-lg">詳しい発送状況 &gt;</Link>Link>
                                                                            </div>div>
                                                                            <div className="bg-white rounded-xl shadow-sm p-5">
                                                                                          <h2 className="font-semibold text-gray-800 mb-3">よく使う機能</h2>h2>
                                                                                          <div className="space-y-2">
                                                                                                          <Link href="/orders/new" className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 text-sm"><span>⭐ お気に入りの発注をする</span>span><span>›</span>span></Link>Link>
                                                                                                          <Link href="#" className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 text-sm"><span>📄 請求書ダウンロード</span>span><span>›</span>span></Link>Link>
                                                                                              </div>div>
                                                                            </div>div>
                                                                            <div className="bg-white rounded-xl shadow-sm p-5">
                                                                                          <h2 className="font-semibold text-gray-800 mb-2">お知らせ</h2>h2>
                                                                                          <div className="p-2 bg-blue-50 rounded text-xs text-gray-600">納品ルール：平日 12:00までの発注は翌日納品となります。</div>div>
                                                                            </div>div>
                                                                </div>div>
                                                      </div>div>
                                              </div>div>
                                        </div>div>
                                      )
                                    }</span>
