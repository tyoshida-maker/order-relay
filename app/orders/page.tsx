'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()

const LABELS = {
  title: '発注一覧',
  newOrder: '新規発注',
  noOrders: '発注がまだありません',
  createFirst: '最初の発注を作成する',
  orderNo: '発注番号',
  fromCompany: '発注元',
  flow: '商流',
  orderDate: '発注日',
  deliveryDate: '納品希望日',
  status: 'ステータス',
  detail: '詳細',
  completed: '全承認完了',
  confirmed: '確定済',
  approving: '承認中',
  waitApproval: '承認待ち',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('orders')
      .select('*, companies(name), flows(name, steps)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders(data || [])
        setLoading(false)
      })
  }, [])

  const getStatusBadge = (order: any) => {
    if (order.status === 'completed') {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{'✅ ' + LABELS.completed}</span>
    }
    const steps: any[] = order.flows?.steps || []
    const totalSteps = steps.length
    if (totalSteps === 0) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{LABELS.confirmed}</span>
    }
    const approvedCount = (order.approved_steps || []).length
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">{'⏳ ' + approvedCount + '/' + totalSteps + ' ' + LABELS.approving}</span>
  }

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{LABELS.title}</h1>
        <Link href="/orders/new" className="btn-primary">{'+ ' + LABELS.newOrder}</Link>
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">{'📦'}</p>
          <p>{LABELS.noOrders}</p>
          <Link href="/orders/new" className="mt-4 inline-block text-blue-600 hover:underline">{LABELS.createFirst}</Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{LABELS.orderNo}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{LABELS.fromCompany}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{LABELS.flow}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{LABELS.orderDate}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{LABELS.deliveryDate}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{LABELS.status}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{LABELS.detail}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm font-medium text-blue-700">{order.order_no}</td>
                  <td className="px-4 py-3 text-sm">{order.companies?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.flows?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.order_date}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.delivery_date || '-'}</td>
                  <td className="px-4 py-3">{getStatusBadge(order)}</td>
                  <td className="px-4 py-3">
                    <Link href={'/orders/' + order.id} className="text-blue-600 hover:underline text-sm">{LABELS.detail}</Link>
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
