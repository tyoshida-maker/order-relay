'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, Order } from '@/lib/supabase'

const CARRIERS = ['佐川急便', 'ヤマト運輸', '西濃運輸', '日本郵便', 'その他']

const TRACKING_URLS: Record<string, string> = {
  '佐川急便': 'https://k2k.sagawa-exp.co.jp/p/sagawa/web/okurijoinput.jsp',
  'ヤマト運輸': 'https://toi.kuronekoyamato.co.jp/cgi-bin/tneko',
  '西濃運輸': 'https://track.seino.co.jp/cgi-bin/gnpquery.pgm',
  '日本郵便': 'https://trackings.post.japanpost.jp/services/srv/search/',
}

export default function TrackingNewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preOrderId = searchParams.get('order_id') || ''

  const [orders, setOrders] = useState<Order[]>([])
  const [form, setForm] = useState({
    order_id: preOrderId,
    carrier: CARRIERS[0],
    tracking_number: '',
    estimated_from: '',
    estimated_to: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('orders')
      .select('id, order_no, delivery_date, status')
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders((data || []) as Order[]))
  }, [])

  const handleSubmit = async () => {
    if (!form.order_id) { setError('発注を選択してください'); return }
    if (!form.tracking_number) { setError('追跡番号を入力してください'); return }
    setSaving(true)
    setError('')

    const trackingUrl = TRACKING_URLS[form.carrier] || null
    const { data, error: err } = await supabase.from('shipments').insert({
      order_id: form.order_id,
      carrier: form.carrier,
      tracking_number: form.tracking_number,
      tracking_url: trackingUrl,
      status: 'in_transit',
      shipped_at: new Date().toISOString(),
      estimated_from: form.estimated_from || null,
      estimated_to: form.estimated_to || null,
      delayed: false,
      notes: form.notes || null,
    }).select().single()

    if (err) { setError(err.message); setSaving(false); return }

    // 初回イベントを追加
    await supabase.from('shipment_events').insert({
      shipment_id: data.id,
      event_time: new Date().toISOString(),
      description: '出荷登録・追跡番号登録',
      location: null,
    })

    // 発注ステータスも更新
    await supabase.from('orders').update({ status: 'in_transit' }).eq('id', form.order_id)

    router.push('/tracking/' + data.id)
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/tracking')} className="text-sm text-gray-500 hover:text-gray-700">← 戻る</button>
        <h1 className="text-xl font-bold text-gray-800">出荷登録</h1>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">発注 <span className="text-red-500">*</span></label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.order_id}
            onChange={e => setForm(p => ({ ...p, order_id: e.target.value }))}
          >
            <option value="">選択してください</option>
            {orders.map(o => (
              <option key={o.id} value={o.id}>{o.order_no} {o.delivery_date ? '(納品:' + o.delivery_date + ')' : ''}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">配送業者</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.carrier}
            onChange={e => setForm(p => ({ ...p, carrier: e.target.value }))}
          >
            {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">追跡番号 <span className="text-red-500">*</span></label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="例: 5678-1234-5678"
            value={form.tracking_number}
            onChange={e => setForm(p => ({ ...p, tracking_number: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">配達予定（開始）</label>
            <input type="datetime-local" className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.estimated_from}
              onChange={e => setForm(p => ({ ...p, estimated_from: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">配達予定（終了）</label>
            <input type="datetime-local" className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.estimated_to}
              onChange={e => setForm(p => ({ ...p, estimated_to: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm"
            rows={2}
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          />
        </div>

        {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? '登録中...' : '🚚 出荷登録する'}
          </button>
          <button onClick={() => router.push('/tracking')}
            className="px-4 py-2.5 border rounded-lg text-gray-600 hover:bg-gray-50">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
