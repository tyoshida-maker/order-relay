'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  preparing: { label: '出荷準備中', color: '#6b7280' },
  shipped: { label: '配送中', color: '#3b82f6' },
  in_transit: { label: '輸送中', color: '#8b5cf6' },
  out_for_delivery: { label: '配送中', color: '#f59e0b' },
  delivered: { label: '配送完了', color: '#22c55e' },
  delayed: { label: '遅延', color: '#ef4444' },
}

export default function PartnerTrackingPage() {
  const [shipments, setShipments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: profile } = await supabase.from('or_user_profiles').select('*').eq('id', session.user.id).single()
      if (!profile?.company_id) { setLoading(false); return }
      const { data: orders } = await supabase.from('orders').select('id').eq('from_company_id', profile.company_id)
      const orderIds = (orders || []).map((o: any) => o.id)
      if (orderIds.length === 0) { setLoading(false); return }
      const { data } = await supabase
        .from('shipments')
        .select('*, orders(order_no, delivery_date, order_items(quantity, products(name)))')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false })
      setShipments(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-center py-8 text-gray-500">読み込み中...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">🚚 配送状況</h1>
      {shipments.length === 0 ? (
        <div className="text-center py-8 text-gray-400">配送情報がありません</div>
      ) : (
        <div className="space-y-3">
          {shipments.map((s: any) => {
            const st = STATUS_LABEL[s.status] || { label: s.status, color: '#6b7280' }
            const items = s.orders?.order_items || []
            return (
              <div key={s.id} className="border rounded-lg p-4 bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">発注番号: {s.orders?.order_no}</div>
                    <div className="text-sm text-gray-500 mt-1">{s.carrier} / 追跡番号: {s.tracking_number || '-'}</div>
                    {s.estimated_from && (
                      <div className="text-sm text-blue-600 mt-1">
                        配送予定: {new Date(s.estimated_from).toLocaleDateString('ja-JP')}
                        {s.estimated_to && <span> 〜 {new Date(s.estimated_to).toLocaleDateString('ja-JP')}</span>}
                      </div>
                    )}
                    {items.length > 0 && (
                      <div className="text-sm text-gray-600 mt-1">
                        商品: {items.map((i: any) => i.products?.name + ' ×' + i.quantity).join(', ')}
                      </div>
                    )}
                    {s.tracking_url && <a href={s.tracking_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline mt-1 block">配送会社で追跡 ↗</a>}
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{ background: st.color }}>{st.label}</span>
                </div>
                {s.delayed && <div className="mt-2 p-2 bg-red-50 text-red-600 text-sm rounded">⚠️ 遅延が発生しています</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
