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
                const { data: p } = await supabase.from('or_user_profiles').select('name').eq('id', user.id).single()
                setUserName(p?.name || user.email || '')
                const { data: od } = await supabase.from('orders').select('id, order_no, order_date, delivery_date, status, companies(name), order_items(quantity, products(name))').order('order_date', { ascending: false }).limit(20)
                setOrders((od || []) as Order[])
                setLoading(false)
        }
        load()
  }, [router])

  const handleShip = async () => {
        if (!selectedId || !carrier || !trackingNo) { alert('配送会社、追跡番号を入力してください'); return }
        const { error } = await supabase.from('shipments').insert({ order_id: selectedId, carrier, tracking_number: trackingNo, status: 'shipped', shipped_at: new Date().toISOString() })
        if (!error) {
                await supabase.from('orders').update({ status: 'shipped', current_step: 2 }).eq('id', selectedId)
                alert('出荷登録が完了しました')
                setOrders(prev => prev.map(o => o.id === selectedId ? { ...o, status: 'shipped' } : o))
                setSelectedId(null); setCarrier(''); setTrackingNo('')
        }
  }

  const badge = (s: string) => {
        if (s === 'shipped') return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">発送済</span>
              if (s === 'approved') return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">未出荷</span>
              if (s === 'completed') return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">納品完了</span>
              return <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">出荷準備中</span>
          }
    
      if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        
          const active = orders.filter(o => o.status !== 'completed')
          const shipped = orders.filter(o => o.status === 'shipped').length
              const unshipped = orders.filter(o => o.status !== 'shipped' && o.status !== 'completed').length
                
                  return (
                        <div className="min-h-screen bg-gray-50 flex">
                              <div className="w-56 bg-white border-r flex flex-col fixed h-full z-10 shadow-sm">
                                      <div className="p-4 border-b"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-sm font-bold">商</div><div><div className="text-sm font-bold">商流OS</div><div className="text-xs text-gray-400">発送者ダッシュボード</div></div></div></div>
                                      <nav className="flex-1 p-3 space-y-1">
                                                <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded text-sm font-medium">🏠 ホーム</div>
                                                <Link href="#" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">🚚 出荷一覧</Link>
                                                <Link href="#" className="block px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">📦 在庫確認</Link>
                                      </nav>
                                      <div className="p-3 border-t">
                                                <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} className="w-full px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-100 text-left">🚪 ログアウト</button>
                                      </div>
                              </div>
                              <div className="ml-56 flex-1 p-6">
                                      <div className="flex items-center justify-between mb-6">
                                                <h1 className="text-2xl font-bold">ダッシュボード</h1>
                                                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-sm">👤 {userName}</div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-4 mb-6">
                                                <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500"><div className="text-xs text-gray-500">🚚 今日の出荷件数</div><div className="text-3xl font-bold mt-1">{active.length}<span className="text-sm font-normal text-gray-500 ml-1">件</span></div><div className="text-xs text-gray-400">(出荷済 {shipped}件)</div></div>
                                                <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500"><div className="text-xs text-gray-500">📦 未出荷件数</div><div className="text-3xl font-bold mt-1">{unshipped}<span className="text-sm font-normal text-gray-500 ml-1">件</span></div><div className="text-xs text-gray-400">(要対応)</div></div>
                                                <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500"><div className="text-xs text-gray-500">✅ 出荷済</div><div className="text-3xl font-bold mt-1">{shipped}<span className="text-sm font-normal text-gray-500 ml-1">件</span></div><div className="text-xs text-gray-400">本日完了</div></div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-6">
                                                <div className="col-span-2 bg-white rounded-xl shadow-sm p-5">
                                                            <h2 className="font-semibold mb-4">今日出荷する一覧 <span className="text-sm font-normal text-gray-500">最終更新: {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span></h2>
                                                            <table className="w-full text-sm">
                                                                          <thead><tr className="border-b text-gray-500 text-xs"><th className="text-left py-2">注文番号</th><th className="text-left py-2">店舗名</th><th className="text-left py-2">商品</th><th className="text-left py-2">数量</th><th className="text-left py-2">納品希望日</th><th className="text-left py-2">状態</th><th className="text-left py-2">操作</th></tr></thead>
                                                                          <tbody>
                                                                            {orders.slice(0, 8).map(o => {
                                            const it = o.order_items[0]
                                                                return <tr key={o.id} className={`border-b hover:bg-gray-50 ${selectedId === o.id ? 'bg-blue-50' : ''}`}>
                                                                                    <td className="py-2 text-blue-600 font-medium">{o.order_no}</td>
                                                                                    <td className="py-2">{o.companies?.name || '-'}</td>
                                                                                    <td className="py-2">{it?.products?.name || '-'}</td>
                                                                                    <td className="py-2">{it?.quantity || 0}本</td>
                                                                                                          <td className="py-2 text-gray-600">{o.delivery_date || '-'}</td>
                                                                                    <td className="py-2">{badge(o.status)}</td>
                                                                                    <td className="py-2">{o.status !== 'shipped' && o.status !== 'completed'
                                                                                                            ? <button onClick={() => setSelectedId(o.id)} className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">出荷登録</button>
                                                                                                          : <span className="text-xs text-gray-400">登録済</span>}</td>
                                                                </tr>
                                                                  })}
                                                                          </tbody>
                                                            </table>
                                                </div>
                                                <div className="space-y-4">
                                                            <div className="bg-white rounded-xl shadow-sm p-5">
                                                                          <h2 className="font-semibold mb-3">出荷登録</h2>
                                                              {selectedId && <p className="text-xs text-blue-600 mb-2">選択中: {orders.find(o => o.id === selectedId)?.order_no}</p>}
                                                                          <div className="space-y-3">
                                                                                          <div><label className="text-xs text-gray-500 block mb-1">① 配送会社を選択</label>
                                                                                                            <select value={carrier} onChange={e => setCarrier(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                                                                                                                                <option value="">選択してください</option>
                                                                                                                                <option>ヤマト遅便</option><option>佐川急便</option><option>日本郵便</option><option>福山通運</option>
                                                                                                              </select></div>
                                                                                          <div><label className="text-xs text-gray-500 block mb-1">② 追跡番号を入力</label>
                                                                                                            <input value={trackingNo} onChange={e => setTrackingNo(e.target.value)} placeholder="追跡番号を入力してください" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                                                                                          <button onClick={handleShip} disabled={!selectedId} className={`w-full py-2 rounded-lg text-sm font-medium text-white ${selectedId ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}>
                                                                                                            ③ 出荷完了にする</button>
                                                                          </div>
                                                            </div>
                                                            <div className="bg-white rounded-xl shadow-sm p-5">
                                                                          <h2 className="font-semibold mb-2">他納品書</h2>
                                                                          <button className="w-full py-2 border rounded-lg text-sm hover:bg-gray-50">📝 他納品書を印刷</button>
                                                            </div>
                                                            <div className="bg-blue-50 rounded-xl p-4 text-xs text-gray-700">
                                                                          <p className="font-medium mb-1">出荷ルール：平日</p>
                                                                          <p>12:00までの出荷登録で、翌日納品となります。</p>
                                                            </div>
                                                </div>
                                      </div>
                              </div>
                        </div>
                      )
}
