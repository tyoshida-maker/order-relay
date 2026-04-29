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
        if (s === 'completed') return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">ç´åå®äº</span>
              if (s === 'approved') return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">çºéæºåä¸­</span>
              if (s === 'shipped') return <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">çºéæ¸</span>
              return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">æ³¨æåä»</span>
          }
    
      if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        
          const lo = orders[0]; const li = lo?.order_items[0]
          const total = orders.reduce((s, o) => s + o.order_items.reduce((ss, i) => ss + (i.unit_price || 0) * i.quantity, 0), 0)
              const steps = ['æ³¨æåä»', 'çºéæºåä¸­', 'çºéæ¸', 'ééä¸­', 'ç´åäºå®']
                  const cs = lo?.current_step || 0
                    
                      return (
                            <div className="min-h-screen bg-gray-50 flex">
                                  <div className="w-56 bg-white border-r flex flex-col fixed h-full z-10 shadow-sm">
                                          <div className="p-4 border-b"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-sm font-bold">å</div><div><div className="text-sm font-bold">åæµOS</div><div className="text-xs text-gray-400">çºæ³¨èããã·ã¥ãã¼ã</div></div></div></div>
                                          <nav className="flex-1 p-3 space-y-1">
                                                    <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded text-sm font-medium">ð  ããã·ã¥ãã¼ã</div>
                                                    <Link href="/orders/new" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">ð çºæ³¨ãã</Link>
                                                    <Link href="/orders" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">ð çºæ³¨ä¸è¦§</Link>
                                                    <Link href="#" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">ð çºéç¶æ³</Link>
                                                    <Link href="#" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">ï¿¥ è«æ±ä¸è¦§</Link>
                                                    <Link href="#" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">â ãã¤ãã®çºæ³¨</Link>
                                          </nav>
                                          <div className="p-3 border-t">
                                                    <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} className="w-full px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100 text-left">ðª ã­ã°ã¢ã¦ã</button>
                                          </div>
                                  </div>
                                  <div className="ml-56 flex-1 p-6">
                                          <div className="flex items-center justify-between mb-6">
                                                    <h1 className="text-2xl font-bold text-gray-800">ããã·ã¥ãã¼ã</h1>
                                                    <div className="flex items-center gap-3">
                                                                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-sm">ð¢ <span className="font-medium">{companyName || 'çºæ³¨è'}</span></div>
                                                                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-sm">ð¤ <span>{userName}</span></div>
                                                    </div>
                                          </div>
                                          <div className="grid grid-cols-4 gap-4 mb-6">
                                                    <div className="bg-white rounded-xl shadow-sm p-4 border"><div className="text-xs text-gray-500 mb-1">ð æ¬¡ã®ç´åäºå®</div><div className="text-lg font-bold">{lo?.delivery_date || '-'}</div><div className="text-xs text-gray-400">{li?.products?.name || '-'}</div></div>
                                                    <div className="bg-green-50 rounded-xl shadow-sm p-4 border border-green-100"><div className="text-xs text-gray-500 mb-1">ð çºéç¶æ³</div><div className="mt-1">{badge(lo?.status || 'pending')}</div><div className="text-xs text-gray-400 mt-1">{lo?.delivery_date ? `${lo.delivery_date} çºéäºå®` : '-'}</div></div>
                                                    <div className="bg-orange-50 rounded-xl shadow-sm p-4 border border-orange-100"><div className="text-xs text-gray-500 mb-1">ð ç´è¿ã®çºæ³¨</div><div className="text-lg font-bold">{lo?.order_date || '-'}</div><div className="text-xs text-gray-400">{li?.products?.name} {li?.quantity}æ¬</div></div>
                                                    <div className="bg-purple-50 rounded-xl shadow-sm p-4 border border-purple-100"><div className="text-xs text-gray-500 mb-1">ï¿¥ ä»æã®è«æ±éé¡</div><div className="text-lg font-bold">ï¿¥{total.toLocaleString()}</div><div className="text-xs text-gray-400">({new Date().getMonth() + 1}æå)</div></div>
                                          </div>
                                          <div className="grid grid-cols-3 gap-6">
                                                    <div className="col-span-2 bg-white rounded-xl shadow-sm p-5">
                                                                <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-gray-800">çºæ³¨ä¸è¦§</h2><Link href="/orders" className="text-sm text-blue-500">ãã¹ã¦è¦ã &gt;</Link></div>
                                                                <table className="w-full text-sm">
                                                                              <thead><tr className="border-b text-gray-500 text-xs"><th className="text-left py-2">çºæ³¨æ¥</th><th className="text-left py-2">æ³¨æçªå·</th><th className="text-left py-2">åå</th><th className="text-left py-2">ç´åäºå®</th><th className="text-left py-2">ã¹ãã¼ã¿ã¹</th><th className="text-right py-2">éé¡</th></tr></thead>
                                                                              <tbody>
                                                                                {orders.slice(0, 5).map(o => {
                                                const it = o.order_items[0]; const amt = o.order_items.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0)
                                                                    return <tr key={o.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/orders/${o.id}`)}><td className="py-2 text-gray-600">{o.order_date}</td><td className="py-2 text-blue-600 font-medium">{o.order_no}</td><td className="py-2">{it?.products?.name || '-'} {it?.quantity}æ¬</td><td className="py-2 text-gray-600">{o.delivery_date || '-'}</td><td className="py-2">{badge(o.status)}</td><td className="py-2 text-right">ï¿¥{amt.toLocaleString()}</td></tr>
                                                                      })}
                                                                              </tbody>
                                                                </table>
                                                    </div>
                                                    <div className="space-y-4">
                                                                <div className="bg-white rounded-xl shadow-sm p-5">
                                                                              <h2 className="font-semibold text-gray-800 mb-3">çºéç¶æ³ã®ç¢ºèª</h2>
                                                                              <div className="flex items-center gap-1 flex-wrap">
                                                                                {steps.map((label, i) => (<div key={i} className="flex items-center"><div className={`w-3 h-3 rounded-full ${i <= cs ? 'bg-blue-600' : 'bg-gray-200'}`}></div>{i < steps.length - 1 && <div className={`w-4 h-0.5 ${i < cs ? 'bg-blue-600' : 'bg-gray-200'}`}></div>}</div>))}
                                                                              </div>
                                                                              <div className="text-xs text-blue-600 mt-1">{steps[cs]}</div>
                                                                              <Link href="/orders" className="block w-full text-center py-2 mt-3 bg-blue-600 text-white text-sm rounded-lg">è©³ããçºéç¶æ³ &gt;</Link>
                                                                </div>
                                                                <div className="bg-white rounded-xl shadow-sm p-5">
                                                                              <h2 className="font-semibold text-gray-800 mb-3">ããä½¿ãæ©è½</h2>
                                                                              <div className="space-y-2">
                                                                                              <Link href="/orders/new" className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 text-sm"><span>â ãã¤ãã®çºæ³¨ããã</span><span>âº</span></Link>
                                                                                              <Link href="#" className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 text-sm"><span>ð è«æ±æ¸ããã¦ã³ã­ã¼ã</span><span>âº</span></Link>
                                                                              </div>
                                                                </div>
                                                                <div className="bg-white rounded-xl shadow-sm p-5">
                                                                              <h2 className="font-semibold text-gray-800 mb-2">ãç¥ãã</h2>
                                                                              <div className="p-2 bg-blue-50 rounded text-xs text-gray-600">ç´åã«ã¼ã«ï¼å¹³æ¥ 12:00ã¾ã§ã®çºæ³¨ã¯ç¿æ¥ç´åã¨ãªãã¾ãã</div>
                                                                </div>
                                                    </div>
                                          </div>
                                  </div>
                            </div>
                          )
}
