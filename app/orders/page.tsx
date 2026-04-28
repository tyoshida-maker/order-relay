'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()

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
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">✅ 全承認完了</span>
    }
    const steps: any[] = order.flows?.steps || []
    const totalSteps = steps.length
    if (totalSteps === 0) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">確定済</span>
    }
    const approvedCount = (order.approved_steps || []).length
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        ⏳ {approvedCount}/{totalSteps} 承認中
      </span>
    )
  }

  const getCurrentStepName = (order: any) => {
    if (order.status === 'completed') return '-'
    const steps: any[] = order.flows?.steps || []
    const currentStep: number = order.current_step ?? 0
    if (steps.length === 0 || currentStep >= steps.length) return '-'
    return steps[currentStep]?.company_name || '承認待ち'
  }

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">発注一覧</h1>
        <Link href="/orders/new" className="btn-primary">+ 新規発注</Link>
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p>発注がまだありません</p>
          <Link href="/orders/new" className="mt-4 inline-block text-blue-600 hover:underline">最初の発注を作成する</Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">発注番号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">発注元</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">商流</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">発注日</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">納品希望日</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ステータス</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
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
                    <Link href={`/orders/${order.id}`} className="text-blue-600 hover:underline text-sm">詳細</Link>
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
