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
  ordered: 'çºæ³¨åä»', approved: 'æ¿èªæ¸', sent_to_shipper: 'åºè·ä¾é ¼',
  preparing: 'åºè·æºåä¸­', in_transit: 'ééä¸­', shipped: 'åºè·æ¸',
  delivered: 'ç´åå®äº', delayed: 'éå»¶ä¸­', cancelled: 'ï½·ï½¬ï¾ï½¾ï¾',
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
  if (!dt) return 'â'
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

      {/* å·¦ã¡ã¤ã³ */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* ãããã¼ */}
        <div className="bg-white rounded-xl border px-5 py-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-600">ééããã·ã¥ãã¼ãï¼å¨ä½ç£è¦ï¼</span>
            <span className="ml-3 text-xs text-gray-400">æçµæ´æ°: {lastUpdated}</span>
            <button onClick={load} className="ml-2 text-xs text-blue-500 hover:underline">â» æ´æ°</button>
          </div>
          <Link href="/tracking/new"
            className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium">
            ï¼ åºè·ç»é²
          </Link>
        </div>

        {/* KPIã«ã¼ã */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'æ¬æ¥åºè·ä»¶æ°', value: metrics.total, unit: 'ä»¶', color: 'text-blue-700', bg: 'bg-blue-50', icon: 'ð¦' },
            { label: 'ééä¸­ä»¶æ°', value: metrics.inTransit, unit: 'ä»¶', color: 'text-cyan-700', bg: 'bg-cyan-50', icon: 'ð' },
            { label: 'æ¬æ¥ç´åäºå®', value: metrics.todayDelivery, unit: 'ä»¶', color: 'text-orange-600', bg: 'bg-orange-50', icon: 'ð' },
            { label: 'éå»¶ä»¶æ°', value: metrics.delayed, unit: 'ä»¶', color: metrics.delayed > 0 ? 'text-red-600' : 'text-gray-400', bg: metrics.delayed > 0 ? 'bg-red-50' : 'bg-gray-50', icon: metrics.delayed > 0 ? 'â ï¸' : 'â' },
            { label: 'æªåºè·ä»¶æ°', value: metrics.noShipment, unit: 'ä»¶', color: metrics.noShipment > 0 ? 'text-yellow-700' : 'text-gray-400', bg: metrics.noShipment > 0 ? 'bg-yellow-50' : 'bg-gray-50', icon: 'ð' },
          ].map(k => (
            <div key={k.label} className={`${k.bg} rounded-xl border p-3`}>
              <div className="text-lg mb-0.5">{k.icon}</div>
              <div className={`text-2xl font-bold ${k.color}`}>{k.value}<span className="text-sm font-normal ml-0.5">{k.unit}</span></div>
              <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>

        {/* æ¬æ¥ã®ç´åäºå®ä¸è¦§ */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-semibold text-sm text-gray-700">ð æ¬æ¥ã®ç´åäºå®ä¸è¦§ï¼ééäºå®æå»é ï¼</div>
            <span className="text-xs text-gray-400">{todayOrders.length}ä»¶</span>
          </div>
          {loading ? (
            <div className="text-center text-gray-400 py-8 text-sm">èª­ã¿è¾¼ã¿ä¸­...</div>
          ) : todayOrders.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">æ¬æ¥ã®ééãã¼ã¿ãªã</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['çºæ³¨No','åºèï¼çºæ³¨åï¼','åå','æ°é','ééç¤¾','è¿½è·¡çªå·','ééäºå®','ã¹ãã¼ã¿ã¹',''].map(h => (
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
                      <td className="px-3 py-2">{o.companies?.short_name || o.companies?.name || 'â'}</td>
                      <td className="px-3 py-2 max-w-[120px] truncate">{item?.products?.name || 'â'}</td>
                      <td className="px-3 py-2">{item?.quantity ?? 'â'}</td>
                      <td className="px-3 py-2">{ship?.carrier || 'â'}</td>
                      <td className="px-3 py-2 font-mono">
                        {ship?.tracking_url ? (
                          <a href={ship.tracking_url} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                            {ship.tracking_number || 'â'}
                          </a>
                        ) : ship?.tracking_number || 'â'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {ship?.estimated_from ? fmt(ship.estimated_from) + (ship.estimated_to ? 'ã' + new Date(ship.estimated_to).getHours() + ':' + String(new Date(ship.estimated_to).getMinutes()).padStart(2,'0') : '') : o.delivery_date || 'â'}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[ship?.status || o.status] || 'bg-gray-100 text-gray-500'}`}>
                          {isDelayed ? 'â ï¸éå»¶' : STATUS_LABEL[ship?.status || o.status] || ship?.status || o.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/tracking/${ship?.id || ''}`}
                          onClick={e => e.stopPropagation()}
                          className="text-blue-500 hover:underline whitespace-nowrap">
                          {ship ? 'è©³ç´°' : 'åºè·ç»é²'}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* éå»¶ã¢ã©ã¼ã */}
        {delayedOrders.length > 0 && (
          <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
            <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex items-center gap-2">
              <span className="text-red-600 font-semibold text-sm">â ï¸ éå»¶ã¢ã©ã¼ã</span>
              <span className="text-xs text-red-500">{delayedOrders.length}ä»¶ã®éééå»¶ãçºçãã¦ãã¾ã</span>
            </div>
            <div className="divide-y">
              {delayedOrders.map(o => {
                const ship = o.shipments?.find(s => s.status === 'delayed' || s.delayed)
                const item = o.order_items?.[0]
                return (
                  <div key={o.id} className="px-4 py-3 flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="text-xs font-mono text-gray-500">{o.order_no}</div>
                      <div className="text-sm font-medium">{o.companies?.name} â {item?.products?.name}</div>
                      <div className="text-xs text-red-600">ééäºå®: {fmt(ship?.estimated_from || null)} {ship?.estimated_to ? 'ã '+fmt(ship.estimated_to) : ''}</div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {ship && (
                        <Link href={`/tracking/${ship.id}`}
                          className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">
                          éå»¶åå®¹ãæ´æ°ã»åéç¥
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* åç¤¾ã®è¦ç¹ */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold text-sm text-gray-700">ð åç¤¾ã®è¦ç¹ï¼å¿è¦ãªæå ±ãè¦ããï¼</div>
          <div className="grid grid-cols-3 gap-0 divide-x">
            {[
              {
                company: 'ã¨ããã¤ããï¼åºèï¼', color: 'bg-orange-50',
                items: ['èªåã®æ³¨æã»ééç¶æ³ã»çè·äºå®', 'éå»¶æå ±ã®ã¿'],
              },
              {
                company: 'ã¼ã­ããã¯ãã¡ã¼ã ', color: 'bg-blue-50',
                items: ['å¨ä½ã®å£²å£²ã»ééç¶æ³ã»éå»¶ç¶æ³', 'åºè·ç®¡ç'],
              },
              {
                company: 'ä¹å·é£ç³§ï¼åºè·ï¼', color: 'bg-green-50',
                items: ['èªç¤¾åºåã®æ³¨æã»åºè·ç»é²ã»è¿½è·¡ç¶æ³'],
              },
            ].map(c => (
              <div key={c.company} className={`${c.color} p-4`}>
                <div className="text-xs font-semibold text-gray-700 mb-2">{c.company}</div>
                {c.items.map(i => (
                  <div key={i} className="text-xs text-gray-600 flex gap-1 mb-1">
                    <span className="text-green-500 flex-shrink-0">â</span>{i}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* åãåããåæ¸å¹æ */}
        <div className="bg-white rounded-xl border p-4">
          <div className="font-semibold text-sm text-gray-700 mb-3">ð¬ åãåããåæ¸å¹æï¼å°å¥å¹æï¼</div>
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div>
              <div className="font-medium text-gray-700 mb-1">å°å¥åï¼å¤éä¼è¨ï¼</div>
              <div className="space-y-1 text-gray-500">
                <div>åºè âãã¾ã å±ããªãâ¦ã</div>
                <div>â åµæªå®¶ã«é£çµ¡ â ã¼ã­ããã¯ã«é£çµ¡ â ä¹å·é£ç³§ã«é£çµ¡</div>
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">å°å¥å¾ï¼èªå·±è§£æ±ºï¼</div>
              <div className="space-y-1">
                <div className="text-green-600 font-medium">åºè â è¿½è·¡ãã¼ã¸ãè¦ã â è§£æ±ºï¼30ç§ï¼</div>
                <div className="text-gray-500">åãåããä»¶æ°: <span className="text-green-600 font-bold">80ã90%åæ¸</span></div>
                <div className="text-gray-500">å¯¾å¿æé: æ40ã60æéåæ¸</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* å³ããã«ï¼åºèå¥ééè¿½è·¡ç»é¢ */}
      <div className="w-80 flex-shrink-0 space-y-3">
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-blue-700 text-white px-4 py-3 text-sm font-semibold">
            ðª åºèå¥ï¼ééè¿½è·¡ç»é¢
            <div className="text-xs font-normal text-blue-200 mt-0.5">ã¹ãã/PCå±éã¤ã¡ã¼ã¸</div>
          </div>

          {selected ? (() => {
            const ship = selected.shipments?.[0]
            const item = selected.order_items?.[0]
            const events = [...(ship?.shipment_events || [])].sort((a,b) => a.event_time > b.event_time ? 1 : -1)
            const isDelayed = ship?.status === 'delayed' || ship?.delayed
            return (
              <div className="p-4 space-y-3">
                {/* æ³¨ææå ± */}
                <div>
                  <div className="text-xs text-gray-400 mb-1">æ³¨ææå ±</div>
                  <div className="text-xs space-y-1">
                    <div><span className="text-gray-500">æ³¨æNo.</span> <span className="font-mono font-medium">{selected.order_no}</span></div>
                    <div><span className="text-gray-500">æ³¨ææ¥</span> {selected.order_date}</div>
                    <div><span className="text-gray-500">åå</span> {item?.products?.name || 'â'} Ã {item?.quantity}æ¬</div>
                    <div><span className="text-gray-500">çºæ³¨å</span> {selected.companies?.name || 'â'}</div>
                  </div>
                </div>

                {/* ç¾å¨ã®ééç¶æ³ */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">ç¾å¨ã®ééç¶æ³</div>
                  {ship ? (
                    <div>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-bold mb-2 ${isDelayed ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        <span>{isDelayed ? 'â ï¸' : 'ð'}</span>
                        <span>{isDelayed ? 'éå»¶ä¸­' : STATUS_LABEL[ship.status] || ship.status}</span>
                      </div>
                      {ship.estimated_from && (
                        <div>
                          <div className="text-xs text-gray-500">ééäºå®æé</div>
                          <div className="text-sm font-bold text-blue-700">
                            {fmt(ship.estimated_from)}{ship.estimated_to ? ' ã ' + new Date(ship.estimated_to).getHours() + ':' + String(new Date(ship.estimated_to).getMinutes()).padStart(2,'0') : ''}
                          </div>
                          {isDelayed && <div className="text-xs text-red-500 mt-0.5">â»å®éã®ééã¯ããããéããå¯è½æ§ãããã¾ã</div>}
                        </div>
                      )}
                      <div className="mt-2 text-xs">
                        <span className="text-gray-500">ééä¼ç¤¾:</span> <span>{ship.carrier}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-500">è¿½è·¡çªå·:</span>{' '}
                        {ship.tracking_url ? (
                          <a href={ship.tracking_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono">{ship.tracking_number}</a>
                        ) : <span className="font-mono">{ship.tracking_number}</span>}
                      </div>
                      {ship.tracking_url && (
                        <a href={ship.tracking_url} target="_blank" rel="noopener noreferrer"
                          className="mt-2 block text-center text-xs bg-white border border-blue-300 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                          è¿½è·¡ãã¼ã¸ãéã â
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">åºè·ç»é²å¾ã¡</div>
                  )}
                </div>

                {/* ã¿ã¤ã ã©ã¤ã³ */}
                {events.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-2">ééç¶æ³ã®è©³ç´°</div>
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

                {/* ãç¥ããè¨­å® */}
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
                  ð ééç¶æ³ã®å¤åããé£çµ¡ã«LINEã§ãç¥ãããåãåãã¾ãã
                </div>

                <div className="flex gap-2">
                  {ship && (
                    <Link href={`/tracking/${ship.id}`}
                      className="flex-1 text-center text-xs bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                      è©³ç´°ã»ã¹ãã¼ã¿ã¹æ´æ°
                    </Link>
                  )}
                  {!ship && (
                    <Link href={`/tracking/new?order_id=${selected.id}`}
                      className="flex-1 text-center text-xs bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600">
                      åºè·ç»é²ãã
                    </Link>
                  )}
                </div>
              </div>
            )
          })() : (
            <div className="p-4 text-sm text-gray-400 text-center">çºæ³¨ãé¸æãã¦ãã ãã</div>
          )}
        </div>

        {/* ã·ã§ã¼ãã«ãã */}
        <div className="bg-white rounded-xl border p-3 space-y-2">
          <div className="text-xs font-semibold text-gray-600">ã·ã§ã¼ãã«ãã</div>
          {[
            { href: '/orders/new', label: 'ð çºæ³¨å¥å', color: 'bg-orange-50 text-orange-700 border-orange-200' },
            { href: '/tracking/new', label: 'ð åºè·ç»é²', color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { href: '/tracking', label: 'ð è¿½è·¡çªå·æ¤ç´¢', color: 'bg-gray-50 text-gray-700 border-gray-200' },
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
