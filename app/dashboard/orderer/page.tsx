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
        if (s === 'completed') return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">\u7d0d\u54c1\u5b8c\u4e86</span>
              if (s === 'approved') return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">\u767a\u9001\u6e96\u5099\u4e2d</span>
              if (s === 'shipped') return <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">\u767a\u9001\u6e08</span>
              return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">\u6ce8\u6587\u53d7\u4ed8</span>
          }
    
      if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        
          const lo = orders[0]; const li = lo?.order_items[0]
          const total = orders.reduce((s, o) => s + o.order_items.reduce((ss, i) => ss + (i.unit_price || 0) * i.quantity, 0), 0)
              const steps = ['\u6ce8\u6587\u53d7\u4ed8', '\u767a\u9001\u6e96\u5099\u4e2d', '\u767a\u9001\u6e08', '\u914d\u9054\u4e2d', '\u7d0d\u54c1\u4e88\u5b9a']
                  const cs = lo?.current_step || 0
                    
                      return (
                            <div className="min-h-screen bg-gray-50 flex">
                                  <div className="w-56 bg-white border-r flex flex-col fixed h-full z-10 shadow-sm">
                                          <div className="p-4 border-b"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-sm font-bold">\u5546</div><div><div className="text-sm font-bold">\u5546\u6d41OS</div><div className="text-xs text-gray-400">\u767a\u6ce8\u8005\u30c0\u30c3\u30b7\u30e5\u30dc\u30fc\u30c9</div></div></div></div>
                                          <nav className="flex-1 p-3 space-y-1">
                                                    <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded text-sm font-medium">\ud83c\udfe0 \u30c0\u30c3\u30b7\u30e5\u30dc\u30fc\u30c9</div>
                                                    <Link href="/orders/new" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">\ud83d\udcdd \u767a\u6ce8\u3059\u308b</Link>
                                                    <Link href="/orders" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">\ud83d\udccb \u767a\u6ce8\u4e00\u89a7</Link>
                                                    <Link href="#" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">\ud83d\ude9a \u767a\u9001\u72b6\u6cc1</Link>
                                                    <Link href="#" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">\uffe5 \u8acb\u6c42\u4e00\u89a7</Link>
                                                    <Link href="#" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">\u2605 \u3044\u3064\u3082\u306e\u767a\u6ce8</Link>
                                          </nav>
                                          <div className="p-3 border-t">
                                                    <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} className="w-full px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100 text-left">\ud83d\udeaa \u30ed\u30b0\u30a2\u30a6\u30c8</button>
                                          </div>
                                  </div>
                                  <div className="ml-56 flex-1 p-6">
                                          <div className="flex items-center justify-between mb-6">
                                                    <h1 className="text-2xl font-bold text-gray-800">\u30c0\u30c3\u30b7\u30e5\u30dc\u30fc\u30c9</h1>h1>
                                                    <div className="flex items-center gap-3">
                                                                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-sm">\ud83c\udfe2 <span className="font-medium">{companyName || '\u767a\u6ce8\u8005'}</span></div>
                                                                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-sm">\ud83d\udc64 <span>{userName}</span></div>
                                                    </div>
                                          </div>
                                          <div className="grid grid-cols-4 gap-4 mb-6">
                                                    <div className="bg-white rounded-xl shadow-sm p-4 border"><div className="text-xs text-gray-500 mb-1">\ud83d\udcc5 \u6b21\u306e\u7d0d\u54c1\u4e88\u5b9a</div><div className="text-lg font-bold">{lo?.delivery_date || '-'}</div><div className="text-xs text-gray-400">{li?.products?.name || '-'}</div></div>
                                                    <div className="bg-green-50 rounded-xl shadow-sm p-4 border border-green-100"><div className="text-xs text-gray-500 mb-1">\ud83d\ude9a \u767a\u9001\u72b6\u6cc1</div><div className="mt-1">{badge(lo?.status || 'pending')}</div><div className="text-xs text-gray-400 mt-1">{lo?.delivery_date ? `${lo.delivery_date} \u767a\u9001\u4e88\u5b9a` : '-'}</div></div>
                                                    <div className="bg-orange-50 rounded-xl shadow-sm p-4 border border-orange-100"><div className="text-xs text-gray-500 mb-1">\ud83d\udcd3 \u76f4\u8fd1\u306e\u767a\u6ce8</div><div className="text-lg font-bold">{lo?.order_date || '-'}</div><div className="text-xs text-gray-400">{li?.products?.name} {li?.quantity}\u672c</div></div>
                                                    <div className="bg-purple-50 rounded-xl shadow-sm p-4 border border-purple-100"><div className="text-xs text-gray-500 mb-1">\uffe5 \u4eca\u6708\u306e\u8acb\u6c42\u91d1\u984d</div><div className="text-lg font-bold">\uffe5{total.toLocaleString()}</div><div className="text-xs text-gray-400">({new Date().getMonth() + 1}\u6708\u5206)</div></div>
                                          </div>
                                          <div className="grid grid-cols-3 gap-6">
                                                    <div className="col-span-2 bg-white rounded-xl shadow-sm p-5">
                                                                <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-gray-800">\u767a\u6ce8\u4e00\u89a7</h2>h2><Link href="/orders" className="text-sm text-blue-500">\u3059\u3079\u3066\u898b\u308b &gt;</Link></div>
                                                                <table className="w-full text-sm">
                                                                              <thead><tr className="border-b text-gray-500 text-xs"><th className="text-left py-2">\u767a\u6ce8\u65e5</th><th className="text-left py-2">\u6ce8\u6587\u756a\u53f7</th><th className="text-left py-2">\u5546\u54c1</th><th className="text-left py-2">\u7d0d\u54c1\u4e88\u5b9a</th><th className="text-left py-2">\u30b9\u30c6\u30fc\u30bf\u30b9</th><th className="text-right py-2">\u91d1\u984d</th></tr></thead>
                                                                              <tbody>
                                                                                {orders.slice(0, 5).map(o => {
                                                const it = o.order_items[0]; const amt = o.order_items.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0)
                                                                    return <tr key={o.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/orders/${o.id}`)}><td className="py-2 text-gray-600">{o.order_date}</td><td className="py-2 text-blue-600 font-medium">{o.order_no}</td><td className="py-2">{it?.products?.name || '-'} {it?.quantity}\u672c</td><td className="py-2 text-gray-600">{o.delivery_date || '-'}</td><td className="py-2">{badge(o.status)}</td><td className="py-2 text-right">\uffe5{amt.toLocaleString()}</td></tr>
                                                                      })}
                                                                              </tbody>
                                                                </table>
                                                    </div>
                                                    <div className="space-y-4">
                                                                <div className="bg-white rounded-xl shadow-sm p-5">
                                                                              <h2 className="font-semibold text-gray-800 mb-3">\u767a\u9001\u72b6\u6cc1\u306e\u78ba\u8a8d</h2>h2>
                                                                              <div className="flex items-center gap-1 flex-wrap">
                                                                                {steps.map((label, i) => (<div key={i} className="flex items-center"><div className={`w-3 h-3 rounded-full ${i <= cs ? 'bg-blue-600' : 'bg-gray-200'}`}></div>{i < steps.length - 1 && <div className={`w-4 h-0.5 ${i < cs ? 'bg-blue-600' : 'bg-gray-200'}`}></div>}</div>))}
                                                                              </div>
                                                                              <div className="text-xs text-blue-600 mt-1">{steps[cs]}</div>
                                                                              <Link href="/orders" className="block w-full text-center py-2 mt-3 bg-blue-600 text-white text-sm rounded-lg">\u8a73\u3057\u3044\u767a\u9001\u72b6\u6cc1 &gt;</Link>
                                                                </div>
                                                                <div className="bg-white rounded-xl shadow-sm p-5">
                                                                              <h2 className="font-semibold text-gray-800 mb-3">\u3088\u304f\u4f7f\u3046\u6a5f\u80fd</h2>h2>
                                                                              <div className="space-y-2">
                                                                                              <Link href="/orders/new" className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 text-sm"><span>\u2605 \u3044\u3064\u3082\u306e\u767a\u6ce8\u3092\u3059\u308b</span><span>\u203a</span></Link>
                                                                                              <Link href="#" className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 text-sm"><span>\ud83d\udcdc \u8acb\u6c42\u66f8\u3092\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9</span><span>\u203a</span></Link>
                                                                              </div>
                                                                </div>
                                                                <div className="bg-white rounded-xl shadow-sm p-5">
                                                                              <h2 className="font-semibold text-gray-800 mb-2">\u304a\u77e5\u3089\u305b</h2>h2>
                                                                              <div className="p-2 bg-blue-50 rounded text-xs text-gray-600">\u7d0d\u54c1\u30eb\u30fc\u30eb\uff1a\u5e73\u65e5 12:00\u307e\u3067\u306e\u767a\u6ce8\u306f\u7fcc\u65e5\u7d0d\u54c1\u3068\u306a\u308a\u307e\u3059\u3002</div>
                                                                </div>
                                                    </div>
                                          </div>
                                  </div>
                            </div>
                          )
                        }</span>
