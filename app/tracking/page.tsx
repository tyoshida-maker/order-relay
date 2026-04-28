'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, Shipment, Order } from '@/lib/supabase'

type ShipmentWithOrder = Shipment & {
  orders: Pick<Order, 'id' | 'order_no' | 'delivery_date' | 'from_company_id'> & {
    companies: { name: string } | null
  }
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
  cancelled: 'bg-gray-100 text-gray-400',
}

export default function TrackingPage() {
  const [shipments, setShipments] = useState<ShipmentWithOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          orders(id, order_no, delivery_date, from_company_id, companies(name))
        `)
        .order('created_at', { ascending: false })
      if (error) console.error(error)
      setShipments((data || []) as ShipmentWithOrder[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filter === 'all' ? shipments : shipments.filter(s => s.status === filter)

  const counts = {
    all: shipments.length,
    in_transit: shipments.filter(s => ['shipped','in_transit'].includes(s.status)).length,
    delayed: shipments.filter(s => s.status === 'delayed').length,
    delivered: shipments.filter(s => s.status === 'delivered').length,
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">配送追跡ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">全発注の配送状況をリアルタイムで確認</p>
        </div>
        <Link href="/tracking/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          ＋ 出荷登録
        </Link>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: '全件', key: 'all', count: counts.all, color: 'bg-white border-gray-200', icon: '📦' },
          { label: '配送中', key: 'in_transit', count: counts.in_transit, color: 'bg-cyan-50 border-cyan-200', icon: '🚚' },
          { label: '遅延', key: 'delayed', count: counts.delayed, color: 'bg-red-50 border-red-200', icon: '⚠️' },
          { label: '納品完了', key: 'delivered', count: counts.delivered, color: 'bg-green-50 border-green-200', icon: '✅' },
        ].map(card => (
          <button
            key={card.key}
            onClick={() => setFilter(card.key)}
            className={`border rounded-xl p-4 text-left transition hover:shadow-md ${card.color} ${filter === card.key ? 'ring-2 ring-blue-400' : ''}`}
          >
            <div className="text-2xl mb-1">{card.icon}</div>
            <div className="text-2xl font-bold">{card.count}</div>
            <div className="text-xs text-gray-500">{card.label}</div>
          </button>
        ))}
      </div>

      {/* 一覧テーブル */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-12 bg-white rounded-xl border">
          <div className="text-4xl mb-2">📭</div>
          <div>配送データがありません</div>
          <Link href="/tracking/new" className="text-blue-600 text-sm mt-2 inline-block hover:underline">出荷登録する →</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">発注番号</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">発注元</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">配送業者</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">追跡番号</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">納品希望日</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ステータス</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{s.orders?.order_no || '-'}</td>
                  <td className="px-4 py-3">{s.orders?.companies?.name || '-'}</td>
                  <td className="px-4 py-3">{s.carrier}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.tracking_number || '-'}</td>
                  <td className="px-4 py-3">{s.orders?.delivery_date || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[s.status] || 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABEL[s.status] || s.status}
                    </span>
                    {s.delayed && s.status !== 'delayed' && (
                      <span className="ml-1 text-xs text-red-500">⚠️遅延</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/tracking/${s.id}`} className="text-blue-600 hover:underline text-xs">詳細</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
