'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Shipment, ShipmentEvent, Order } from '@/lib/supabase'

type ShipmentDetail = Shipment & {
  orders: (Order & { companies: { name: string } | null }) | null
  shipment_events: ShipmentEvent[]
}

const STATUS_LABEL: Record<string, string> = {
  preparing: '出荷準備中',
  shipped: '出荷済み',
  in_transit: '配送中',
  delivered: '納品完了',
  delayed: '遅延中',
  cancelled: 'キャンセル',
}

const STATUS_COLOR: Record<string, string> = {
  preparing: 'bg-gray-100 text-gray-700',
  shipped: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-green-100 text-green-700',
  delayed: 'bg-red-100 text-red-700',
}

export default function TrackingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [newEvent, setNewEvent] = useState({ description: '', location: '' })

  const load = async () => {
    const { data, error } = await supabase
      .from('shipments')
      .select(`*, orders(*, companies(name)), shipment_events(*)`)
      .eq('id', id)
      .single()
    if (error) console.error(error)
    setShipment(data as ShipmentDetail)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const updateStatus = async (status: string) => {
    setUpdating(true)
    const updates: Record<string, string | boolean> = { status }
    if (status === 'delivered') updates.delivered_at = new Date().toISOString()
    if (status === 'delayed') updates.delayed = true

    await supabase.from('shipments').update(updates).eq('id', id)
    await supabase.from('shipment_events').insert({
      shipment_id: id,
      event_time: new Date().toISOString(),
      description: STATUS_LABEL[status] + 'に更新',
      location: '管理者',
    })
    await load()
    setUpdating(false)
  }

  const addEvent = async () => {
    if (!newEvent.description) return
    setUpdating(true)
    await supabase.from('shipment_events').insert({
      shipment_id: id,
      event_time: new Date().toISOString(),
      description: newEvent.description,
      location: newEvent.location || null,
    })
    setNewEvent({ description: '', location: '' })
    await load()
    setUpdating(false)
  }

  if (loading) return <div className="text-center py-12 text-gray-400">読み込み中...</div>
  if (!shipment) return <div className="text-center py-12 text-gray-400">データが見つかりません</div>

  const events = [...(shipment.shipment_events || [])].sort((a, b) => a.event_time > b.event_time ? 1 : -1)

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.push('/tracking')} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
        ← 一覧に戻る
      </button>

      <div className="bg-white rounded-xl border p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">発注番号</div>
            <div className="text-lg font-bold">{shipment.orders?.order_no || '-'}</div>
            <div className="text-sm text-gray-500">{shipment.orders?.companies?.name || '-'}</div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLOR[shipment.status] || 'bg-gray-100'}`}>
            {STATUS_LABEL[shipment.status] || shipment.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-400">配送業者</span><div className="font-medium mt-0.5">{shipment.carrier}</div></div>
          <div>
            <span className="text-gray-400">追跡番号</span>
            <div className="font-mono font-medium mt-0.5">
              {shipment.tracking_url ? (
                <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {shipment.tracking_number}
                </a>
              ) : shipment.tracking_number || '-'}
            </div>
          </div>
          <div><span className="text-gray-400">出荷日時</span><div className="font-medium mt-0.5">{shipment.shipped_at ? new Date(shipment.shipped_at).toLocaleString('ja-JP') : '-'}</div></div>
          <div><span className="text-gray-400">配達予定</span><div className="font-medium mt-0.5">{shipment.estimated_from ? new Date(shipment.estimated_from).toLocaleString('ja-JP') : '-'}</div></div>
          {shipment.delivered_at && (
            <div><span className="text-gray-400">納品完了</span><div className="font-medium mt-0.5 text-green-600">{new Date(shipment.delivered_at).toLocaleString('ja-JP')}</div></div>
          )}
        </div>

        {/* ステータス更新ボタン */}
        <div className="mt-4 flex flex-wrap gap-2">
          {shipment.status !== 'in_transit' && shipment.status !== 'delivered' && (
            <button onClick={() => updateStatus('in_transit')} disabled={updating}
              className="px-3 py-1.5 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 disabled:opacity-50">
              🚚 配送中に更新
            </button>
          )}
          {shipment.status !== 'delayed' && shipment.status !== 'delivered' && (
            <button onClick={() => updateStatus('delayed')} disabled={updating}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50">
              ⚠️ 遅延アラート
            </button>
          )}
          {shipment.status !== 'delivered' && (
            <button onClick={() => updateStatus('delivered')} disabled={updating}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
              ✅ 納品完了
            </button>
          )}
        </div>
      </div>

      {/* イベントログ */}
      <div className="bg-white rounded-xl border p-6 mb-4">
        <h2 className="font-semibold text-gray-700 mb-4">配送履歴</h2>
        {events.length === 0 ? (
          <div className="text-gray-400 text-sm">履歴なし</div>
        ) : (
          <div className="space-y-3">
            {events.map((ev, i) => (
              <div key={ev.id || i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 flex-shrink-0"></div>
                  {i < events.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>}
                </div>
                <div className="pb-3">
                  <div className="text-xs text-gray-400">{new Date(ev.event_time).toLocaleString('ja-JP')}</div>
                  <div className="text-sm font-medium">{ev.description}</div>
                  {ev.location && <div className="text-xs text-gray-500">{ev.location}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* イベント追加 */}
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm font-medium text-gray-700 mb-2">履歴を追加</div>
          <div className="flex gap-2">
            <input
              className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
              placeholder="例: 配送センター通過"
              value={newEvent.description}
              onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
            />
            <input
              className="w-36 border rounded-lg px-3 py-1.5 text-sm"
              placeholder="場所"
              value={newEvent.location}
              onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))}
            />
            <button onClick={addEvent} disabled={updating || !newEvent.description}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              追加
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
