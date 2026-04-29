'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Order = {
    id: string; order_no: string; order_date: string; delivery_date: string | null
    status: string; companies: { name: string } | null
    order_items: { quantity: number; products: { name: string } | null }[]
}

export default function ShipperDashboard() {
    const router = useRouter()
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [userName, setUserName] = useState('')
    const [carrier, setCarrier] = useState('')
    const [trackingNo, setTrackingNo] = useState('')
    const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
        const load = async () => {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { router.push('/login'); return }
                const { data: p } = await supabase.from('or_user_profiles').select('name').eq('user_id', user.id).single()
                setUserName(p?.name || user.email || '')
                const { data: od } = await supabase.from('orders').select('id, order_no, order_date, delivery_date, status, companies(name), order_items(quantity, products(name))').order('order_date', { ascending: false }).limit(20)
                setOrders((od || []) as Order[])
                setLoading(false)
        }
        load()
  }, [router])

  const handleShip = async () => {
        if (!selectedId || !carrier || !trackingNo) { alert('\u914d\u9001\u4f1a\u793e\u3001\u8ffd\u8de1\u756a\u53f7\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044'); return }
        const { error } = await supabase.from('shipments').insert({ order_id: selectedId, carrier, tracking_number: trackingNo, status: 'shipped', shipped_at: new Date().toISOString() })
        if (!error) {
                await supabase.from('orders').update({ status: 'shipped', current_step: 2 }).eq('id', selectedId)
                alert('\u51fa\u8377\u767b\u9332\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f')
                setOrders(prev => prev.map(o => o.id === selectedId ? { ...o, status: 'shipped' } : o))
                setSelectedId(null); setCarrier(''); setTrackingNo('')
        }
  }

  const badge = (s: string) => {
        if (s === 'shipped') return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">\u767a\u9001\u6e08</span>
              if (s === 'approved') return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">\u672a\u51fa\u8377</span>
              if (s === 'completed') return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">\u7d0d\u54c1\u5b8c\u4e86</span>
              return <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">\u51fa\u8377\u6e96\u5099\u4e2d</span>
          }
    
      if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        
          const active = orders.filter(o => o.status !== 'completed')
          const shipped = orders.filter(o => o.status === 'shipped').length
              const unshipped = orders.filter(o => o.status !== 'shipped' && o.status !== 'completed').length
                
                  return (
                        <div className="min-h-screen bg-gray-50 flex">
                              <div className="w-56 bg-white border-r flex flex-col fixed h-full z-10 shadow-sm">
                                      <div className="p-4 border-b"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-sm font-bold">\u5546</div><div><div className="text-sm font-bold">\u5546\u6d41OS</div><div className="text-xs text-gray-400">\u767a\u9001\u8005\u30c0\u30c3\u30b7\u30e5\u30dc\u30fc\u30c9</div></div></div></div>
                                      <nav className="flex-1 p-3 space-y-1">
                                                <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded text-sm font-medium">\ud83c\udfe0 \u30db\u30fc\u30e0</div>
                                                <Link href="#" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">\ud83d\ude9a \u51fa\u8377\u4e00\u89a7</Link>Link>
                                                <Link href="#" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">\ud83d\udce6 \u5728\u5eab\u78ba\u8a8d</Link>Link>
                                      </nav>nav>
                                      <div className="p-3 border-t">
                                                <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} className="w-full px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100 text-left">\ud83d\udeaa \u30ed\u30b0\u30a2\u30a6\u30c8</button>button>
                                      </div>
                              </div>
                              <div className="ml-56 flex-1 p-6">
                                      <div className="flex items-center justify-between mb-6">
                                                <h1 className="text-2xl font-bold">\u30c0\u30c3\u30b7\u30e5\u30dc\u30fc\u30c9</h1>h1>
                                                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-sm">\ud83d\udc64 {userName}</div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-4 mb-6">
                                                <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500"><div className="text-xs text-gray-500">\ud83d\ude9a \u4eca\u65e5\u306e\u51fa\u8377\u4ef6\u6570</div><div className="text-3xl font-bold mt-1">{active.length}<span className="text-sm font-normal text-gray-500 ml-1">\u4ef6</span></div><div className="text-xs text-gray-400">(\u51fa\u8377\u6e08 {shipped}\u4ef6)</div></div>
                                                <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500"><div className="text-xs text-gray-500">\ud83d\udce6 \u672a\u51fa\u8377\u4ef6\u6570</div><div className="text-3xl font-bold mt-1">{unshipped}<span className="text-sm font-normal text-gray-500 ml-1">\u4ef6</span></div><div className="text-xs text-gray-400">(\u8981\u5bfe\u5fdc)</div></div>
                                                <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500"><div className="text-xs text-gray-500">\u2705 \u51fa\u8377\u6e08</div><div className="text-3xl font-bold mt-1">{shipped}<span className="text-sm font-normal text-gray-500 ml-1">\u4ef6</span></div><div className="text-xs text-gray-400">\u672c\u65e5\u5b8c\u4e86</div></div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-6">
                                                <div className="col-span-2 bg-white rounded-xl shadow-sm p-5">
                                                            <h2 className="font-semibold mb-4">\u4eca\u65e5\u51fa\u8377\u3059\u308b\u4e00\u89a7 <span className="text-sm font-normal text-gray-500">\u6700\u7d42\u66f4\u65b0: {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span></h2>h2>
                                                            <table className="w-full text-sm">
                                                                          <thead><tr className="border-b text-gray-500 text-xs"><th className="text-left py-2">\u6ce8\u6587\u756a\u53f7</th>th><th className="text-left py-2">\u5e97\u8217\u540d</th>th><th className="text-left py-2">\u5546\u54c1</th>th><th className="text-left py-2">\u6570\u91cf</th>th><th className="text-left py-2">\u7d0d\u54c1\u5e0c\u671b\u65e5</th>th><th className="text-left py-2">\u72b6\u614b</th>th><th className="text-left py-2">\u64cd\u4f5c</th>th></tr>tr></thead>thead>
                                                                          <tbody>
                                                                            {orders.slice(0, 8).map(o => {
                                            const it = o.order_items[0]
                                                                return <tr key={o.id} className={`border-b hover:bg-gray-50 ${selectedId === o.id ? 'bg-blue-50' : ''}`}>
                                                                                    <td className="py-2 text-blue-600 font-medium">{o.order_no}</td>td>
                                                                                    <td className="py-2">{o.companies?.name || '-'}</td>td>
                                                                                    <td className="py-2">{it?.products?.name || '-'}</td>td>
                                                                                    <td className="py-2">{it?.quantity || 0}\u672c</td>td>
                                                                                                          <td className="py-2 text-gray-600">{o.delivery_date || '-'}</td>td>
                                                                                    <td className="py-2">{badge(o.status)}</td>td>
                                                                                    <td className="py-2">{o.status !== 'shipped' && o.status !== 'completed'
                                                                                                            ? <button onClick={() => setSelectedId(o.id)} className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">\u51fa\u8377\u767b\u9332</button>button>
                                                                                                          : <span className="text-xs text-gray-400">\u767b\u9332\u6e08</span>}</td>td>
                                                                </tr>tr>
                                                                  })}
                                                                          </tbody>tbody>
                                                            </table>table>
                                                </div>
                                                <div className="space-y-4">
                                                            <div className="bg-white rounded-xl shadow-sm p-5">
                                                                          <h2 className="font-semibold mb-3">\u51fa\u8377\u767b\u9332</h2>h2>
                                                              {selectedId && <p className="text-xs text-blue-600 mb-2">\u9078\u629e\u4e2d: {orders.find(o => o.id === selectedId)?.order_no}</p>}
                                                                          <div className="space-y-3">
                                                                                          <div><label className="text-xs text-gray-500 block mb-1">\u2460 \u914d\u9001\u4f1a\u793e\u3092\u9078\u629e</label>label>
                                                                                                            <select value={carrier} onChange={e => setCarrier(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                                                                                                                                <option value="">\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044</option>option>
                                                                                                                                <option>\u30e4\u30de\u30c8\u9045\u4fbf</option>option><option>\u4f50\u5ddd\u6025\u4fbf</option>option><option>\u65e5\u672c\u90f5\u4fbf</option>option><option>\u798f\u5c71\u901a\u904b</option>option>
                                                                                                              </select>select></div>
                                                                                          <div><label className="text-xs text-gray-500 block mb-1">\u2461 \u8ffd\u8de1\u756a\u53f7\u3092\u5165\u529b</label>label>
                                                                                                            <input value={trackingNo} onChange={e => setTrackingNo(e.target.value)} placeholder="\u8ffd\u8de1\u756a\u53f7\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                                                                                          <button onClick={handleShip} disabled={!selectedId} className={`w-full py-2 rounded-lg text-sm font-medium text-white ${selectedId ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}>
                                                                                                            \u2462 \u51fa\u8377\u5b8c\u4e86\u306b\u3059\u308b</button>button>
                                                                          </div>
                                                            </div>
                                                            <div className="bg-white rounded-xl shadow-sm p-5">
                                                                          <h2 className="font-semibold mb-2">\u4ed6\u7d0d\u54c1\u66f8</h2>h2>
                                                                          <button className="w-full py-2 border rounded-lg text-sm hover:bg-gray-50">\ud83d\udcdd \u4ed6\u7d0d\u54c1\u66f8\u3092\u5370\u5237</button>button>
                                                            </div>
                                                            <div className="bg-blue-50 rounded-xl p-4 text-xs text-gray-700">
                                                                          <p className="font-medium mb-1">\u51fa\u8377\u30eb\u30fc\u30eb\uff1a\u5e73\u65e5</p>
                                                                          <p>12:00\u307e\u3067\u306e\u51fa\u8377\u767b\u9332\u3067\u3001\u7fcc\u65e5\u7d0d\u54c1\u3068\u306a\u308a\u307e\u3059\u3002</p>
                                                            </div>
                                                </div>
                                      </div>
                              </div>
                        </div>
                      )
                    }</span>
