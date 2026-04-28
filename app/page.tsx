'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type OrderRow = {
  id: string
  order_no: string
  order_date: string
  delivery_date: string | null
  status: string
  notes: string | null
  companies: { name: string; short_name: string | null } | null
  shipments: {
    id: string
    carrier: string
    tracking_number: string
    tracking_url: string | null
    status: string
    shipped_at: string | null
    estimated_from: string | null
    estimated_to: string | null
    delivered_at: string | null
    delayed: boolean
    shipment_events: { event_time: string; description: string; location: string | null }[]
  }[]
  order_items: {
    quantity: number
    products: { name: string } | null
  }[]
}

const STATUS_LABEL: Record<string, string> = {
  ordered: '発注受付', approved: '承認済', sent_to_shipper: '出荷依頼',
  preparing: '出荷準備中', in_transit: '配送中', shipped: '出荷済',
  delivered: '納品完了', delayed: '遅延中', cancelled: 'ｷｬﾝｾﾙ',
}
const STATUS_COLOR: Record<string, string> = {
  ordered: 'bg-gray-100 text-gray-600',
  approved: 'bg-purple-100 text-purple-700',
  preparing: 'bg-yellow-100 text-yellow-700',
  in_transit: 'bg-blue-100 text-blue-700',
  shipped: 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-green-100 text-green-700',
  delayed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-400',
}

function fmt(dt: string | null) {
  if (!dt) return '―'
  const d = new Date(dt)
  return (d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')
}

export default function TrackingDashboard() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')

  const load = async () => {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_no, order_date, delivery_date, status, notes,
        companies(name, short_name),
        shipments(id, carrier, tracking_number, tracking_url, status, shipped_at, estimated_from, estimated_to, delivered_at, delayed, shipment_events(event_time, description, location)),
        order_items(quantity, products(name))
      `)
      .not('status', 'eq', 'cancelled')
      .order('delivery_date', { ascending: true, nullsFirst: false })
    if (error) console.error(error)
    setOrders((data || []) as OrderRow[])
    setLastUpdated(new Date().toLocaleTimeString('ja-JP'))
    setLoading(false)
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 60000)
    return () => clearInterval(iv)
  }, [])

  const today = new Date().toISOString().slice(0, 10)

  const metrics = useMemo(() => {
    const shipAll = orders.flatMap(o => o.shipments || [])
    return {
      total: orders.length,
      inTransit: shipAll.filter(s => ['in_transit','shipped'].includes(s.status)).length,
      todayDelivery: orders.filter(o => o.delivery_date === today).length,
      delayed: shipAll.filter(s => s.status === 'delayed' || s.delayed).length,
      noShipment: orders.filter(o => !o.shipments?.length && !['delivered','cancelled'].includes(o.status)).length,
    }
  }, [orders, today])

  const todayOrders = useMemo(() =>
    orders.filter(o => o.delivery_date === today || o.shipments?.some(s => ['in_transit','shipped','delayed'].includes(s.status)))
  , [orders, today])

  const delayedOrders = useMemo(() =>
    orders.filter(o => o.shipments?.some(s => s.status === 'delayed' || s.delayed))
  , [orders])

  const selected = orders.find(o => o.id === selectedId) || todayOrders[0] || orders[0]

  return (
    <div className="flex gap-4 min-h-screen bg-slate-50 -mx-4 -my-6 px-4 py-4">

      {/* 左メイン */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* ヘッダー */}
        <div className="bg-white rounded-xl border px-5 py-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-600">配送ダッシュボード（全体監視）</span>
            <span className="ml-3 text-xs text-gray-400">最終更新: {lastUpdated}</span>
            <button onClick={load} className="ml-2 text-xs text-blue-500 hover:underline">↻ 更新</button>
          </div>
          <Link href="/tracking/new"
            className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium">
            ＋ 出荷登録
          </Link>
        </div>

        {/* KPIカード */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: '本日出荷件数', value: metrics.total, unit: '件', color: 'text-blue-700', bg: 'bg-blue-50', icon: '📦' },
            { label: '配送中件数', value: metrics.inTransit, unit: '件', color: 'text-cyan-700', bg: 'bg-cyan-50', icon: '🚚' },
            { label: '本日納品予定', value: metrics.todayDelivery, unit: '件', color: 'text-orange-600', bg: 'bg-orange-50', icon: '📅' },
            { label: '遅延件数', value: metrics.delayed, unit: '件', color: metrics.delayed > 0 ? 'text-red-600' : 'text-gray-400', bg: metrics.delayed > 0 ? 'bg-red-50' : 'bg-gray-50', icon: metrics.delayed > 0 ? '⚠️' : '✓' },
            { label: '未出荷件数', value: metrics.noShipment, unit: '件', color: metrics.noShipment > 0 ? 'text-yellow-700' : 'text-gray-400', bg: metrics.noShipment > 0 ? 'bg-yellow-50' : 'bg-gray-50', icon: '📋' },
          ].map(k => (
            <div key={k.label} className={`${k.bg} rounded-xl border p-3`}>
              <div className="text-lg mb-0.5">{k.icon}</div>
              <div className={`text-2xl font-bold ${k.color}`}>{k.value}<span className="text-sm font-normal ml-0.5">{k.unit}</span></div>
              <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>

        {/* 本日の納品予定一覧 */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-semibold text-sm text-gray-700">📅 本日の納品予定一覧（配達予定時刻順）</div>
            <span className="text-xs text-gray-400">{todayOrders.length}件</span>
          </div>
          {loading ? (
            <div className="text-center text-gray-400 py-8 text-sm">読み込み中...</div>
          ) : todayOrders.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">本日の配送データなし</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['発注No','店舗（発注元）','商品','数量','配送社','追跡番号','配達予定','ステータス',''].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {todayOrders.map(o => {
                  const ship = o.shipments?.[0]
                  const item = o.order_items?.[0]
                  const isDelayed = ship?.status === 'delayed' || ship?.delayed
                  return (
                    <tr key={o.id}
                      onClick={() => setSelectedId(o.id)}
                      className={`cursor-pointer hover:bg-blue-50 transition ${selectedId === o.id ? 'bg-blue-50' : ''} ${isDelayed ? 'bg-red-50 hover:bg-red-100' : ''}`}
                    >
                      <td className="px-3 py-2 font-mono">{o.order_no}</td>
                      <td className="px-3 py-2">{o.companies?.short_name || o.companies?.name || '―'}</td>
                      <td className="px-3 py-2 max-w-[120px] truncate">{item?.products?.name || '―'}</td>
                      <td className="px-3 py-2">{item?.quantity ?? '―'}</td>
                      <td className="px-3 py-2">{ship?.carrier || '―'}</td>
                      <td className="px-3 py-2 font-mono">
                        {ship?.tracking_url ? (
                          <a href={ship.tracking_url} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                            {ship.tracking_number || '―'}
                          </a>
                        ) : ship?.tracking_number || '―'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {ship?.estimated_from ? fmt(ship.estimated_from) + (ship.estimated_to ? '〜' + new Date(ship.estimated_to).getHours() + ':' + String(new Date(ship.estimated_to).getMinutes()).padStart(2,'0') : '') : o.delivery_date || '―'}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[ship?.status || o.status] || 'bg-gray-100 text-gray-500'}`}>
                          {isDelayed ? '⚠️遅延' : STATUS_LABEL[ship?.status || o.status] || ship?.status || o.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/tracking/${ship?.id || ''}`}
                          onClick={e => e.stopPropagation()}
                          className="text-blue-500 hover:underline whitespace-nowrap">
                          {ship ? '詳細' : '出荷登録'}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 遅延アラート */}
        {delayedOrders.length > 0 && (
          <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
            <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex items-center gap-2">
              <span className="text-red-600 font-semibold text-sm">⚠️ 遅延アラート</span>
              <span className="text-xs text-red-500">{delayedOrders.length}件の配送遅延が発生しています</span>
            </div>
            <div className="divide-y">
              {delayedOrders.map(o => {
                const ship = o.shipments?.find(s => s.status === 'delayed' || s.delayed)
                const item = o.order_items?.[0]
                return (
                  <div key={o.id} className="px-4 py-3 flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="text-xs font-mono text-gray-500">{o.order_no}</div>
                      <div className="text-sm font-medium">{o.companies?.name} — {item?.products?.name}</div>
                      <div className="text-xs text-red-600">配達予定: {fmt(ship?.estimated_from || null)} {ship?.estimated_to ? '〜 '+fmt(ship.estimated_to) : ''}</div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {ship && (
                        <Link href={`/tracking/${ship.id}`}
                          className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">
                          遅延内容を更新・再通知
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 各社の視点 */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold text-sm text-gray-700">📊 各社の視点（必要な情報が見える）</div>
          <div className="grid grid-cols-3 gap-0 divide-x">
            {[
              {
                company: 'とりもつえん（店舗）', color: 'bg-orange-50',
                items: ['自分の注文・配送状況・着荷予定', '遅延情報のみ'],
              },
              {
                company: 'ゼロテックファーム', color: 'bg-blue-50',
                items: ['全体の売売・配送状況・遅延状況', '出荷管理'],
              },
              {
                company: '九州食糧（出荷）', color: 'bg-green-50',
                items: ['自社出分の注文・出荷登録・追跡状況'],
              },
            ].map(c => (
              <div key={c.company} className={`${c.color} p-4`}>
                <div className="text-xs font-semibold text-gray-700 mb-2">{c.company}</div>
                {c.items.map(i => (
                  <div key={i} className="text-xs text-gray-600 flex gap-1 mb-1">
                    <span className="text-green-500 flex-shrink-0">✓</span>{i}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 問い合わせ削減効果 */}
        <div className="bg-white rounded-xl border p-4">
          <div className="font-semibold text-sm text-gray-700 mb-3">💬 問い合わせ削減効果（導入効果）</div>
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div>
              <div className="font-medium text-gray-700 mb-1">導入前（多重伝言）</div>
              <div className="space-y-1 text-gray-500">
                <div>店舗 →「まだ届かない…」</div>
                <div>→ 創未家に連絡 → ゼロテックに連絡 → 九州食糧に連絡</div>
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">導入後（自己解決）</div>
              <div className="space-y-1">
                <div className="text-green-600 font-medium">店舗 → 追跡ページを見る → 解決（30秒）</div>
                <div className="text-gray-500">問い合わせ件数: <span className="text-green-600 font-bold">80〜90%削減</span></div>
                <div className="text-gray-500">対応時間: 月40〜60時間削減</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 右パネル：店舗別配送追跡画面 */}
      <div className="w-80 flex-shrink-0 space-y-3">
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-blue-700 text-white px-4 py-3 text-sm font-semibold">
            🏪 店舗別：配送追跡画面
            <div className="text-xs font-normal text-blue-200 mt-0.5">スマホ/PC共通イメージ</div>
          </div>

          {selected ? (() => {
            const ship = selected.shipments?.[0]
            const item = selected.order_items?.[0]
            const events = [...(ship?.shipment_events || [])].sort((a,b) => a.event_time > b.event_time ? 1 : -1)
            const isDelayed = ship?.status === 'delayed' || ship?.delayed
            return (
              <div className="p-4 space-y-3">
                {/* 注文情報 */}
                <div>
                  <div className="text-xs text-gray-400 mb-1">注文情報</div>
                  <div className="text-xs space-y-1">
                    <div><span className="text-gray-500">注文No.</span> <span className="font-mono font-medium">{selected.order_no}</span></div>
                    <div><span className="text-gray-500">注文日</span> {selected.order_date}</div>
                    <div><span className="text-gray-500">商品</span> {item?.products?.name || '―'} × {item?.quantity}本</div>
                    <div><span className="text-gray-500">発注元</span> {selected.companies?.name || '―'}</div>
                  </div>
                </div>

                {/* 現在の配送状況 */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">現在の配送状況</div>
                  {ship ? (
                    <div>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-bold mb-2 ${isDelayed ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        <span>{isDelayed ? '⚠️' : '🚚'}</span>
                        <span>{isDelayed ? '遅延中' : STATUS_LABEL[ship.status] || ship.status}</span>
                      </div>
                      {ship.estimated_from && (
                        <div>
                          <div className="text-xs text-gray-500">配達予定時間</div>
                          <div className="text-sm font-bold text-blue-700">
                            {fmt(ship.estimated_from)}{ship.estimated_to ? ' 〜 ' + new Date(ship.estimated_to).getHours() + ':' + String(new Date(ship.estimated_to).getMinutes()).padStart(2,'0') : ''}
                          </div>
                          {isDelayed && <div className="text-xs text-red-500 mt-0.5">※実際の配達はこれより遅れる可能性があります</div>}
                        </div>
                      )}
                      <div className="mt-2 text-xs">
                        <span className="text-gray-500">配送会社:</span> <span>{ship.carrier}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-500">追跡番号:</span>{' '}
                        {ship.tracking_url ? (
                          <a href={ship.tracking_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono">{ship.tracking_number}</a>
                        ) : <span className="font-mono">{ship.tracking_number}</span>}
                      </div>
                      {ship.tracking_url && (
                        <a href={ship.tracking_url} target="_blank" rel="noopener noreferrer"
                          className="mt-2 block text-center text-xs bg-white border border-blue-300 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                          追跡ページを開く ↗
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">出荷登録待ち</div>
                  )}
                </div>

                {/* タイムライン */}
                {events.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-2">配送状況の詳細</div>
                    <div className="space-y-2">
                      {events.slice(-4).map((ev, i) => (
                        <div key={i} className="flex gap-2 text-xs">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-0.5 flex-shrink-0"></div>
                            {i < Math.min(events.length, 4) - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-0.5"></div>}
                          </div>
                          <div className="pb-2">
                            <div className="text-gray-400">{fmt(ev.event_time)}</div>
                            <div className="font-medium text-gray-700">{ev.description}</div>
                            {ev.location && <div className="text-gray-400">{ev.location}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* お知らせ設定 */}
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
                  🔔 配送状況の変化やご連絡にLINEでお知らせを受け取れます。
                </div>

                <div className="flex gap-2">
                  {ship && (
                    <Link href={`/tracking/${ship.id}`}
                      className="flex-1 text-center text-xs bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                      詳細・ステータス更新
                    </Link>
                  )}
                  {!ship && (
                    <Link href={`/tracking/new?order_id=${selected.id}`}
                      className="flex-1 text-center text-xs bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600">
                      出荷登録する
                    </Link>
                  )}
                </div>
              </div>
            )
          })() : (
            <div className="p-4 text-sm text-gray-400 text-center">発注を選択してください</div>
          )}
        </div>

        {/* ショートカット */}
        <div className="bg-white rounded-xl border p-3 space-y-2">
          <div className="text-xs font-semibold text-gray-600">ショートカット</div>
          {[
            { href: '/orders/new', label: '📝 発注入力', color: 'bg-orange-50 text-orange-700 border-orange-200' },
            { href: '/tracking/new', label: '🚚 出荷登録', color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { href: '/tracking', label: '🔍 追跡番号検索', color: 'bg-gray-50 text-gray-700 border-gray-200' },
          ].map(s => (
            <Link key={s.href} href={s.href}
              className={`block text-xs border rounded-lg px-3 py-2 hover:opacity-80 ${s.color}`}>
              {s.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
