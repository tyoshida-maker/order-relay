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
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">\u2705 \u5168\u627f\u8a8d\u5b8c\u4e86</span>
    }
    const steps: any[] = order.flows?.steps || []
    const totalSteps = steps.length
    const currentStep: number = order.current_step ?? 0
    if (totalSteps === 0) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">\u78ba\u5b9a\u6e08</span>
    }
    const approvedCount = (order.approved_steps || []).length
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        \u23f3 {approvedCount}/{totalSteps} \u627f\u8a8d\u4e2d
      </span>
    )
  }

  const getCurrentStepName = (order: any) => {
    if (order.status === 'completed') return '-'
    const steps: any[] = order.flows?.steps || []
    const currentStep: number = order.current_step ?? 0
    if (steps.length === 0 || currentStep >= steps.length) return '-'
    return steps[currentStep]?.company_name || '\u627f\u8a8d\u5f85\u3061'
  }

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">\u767a\u6ce8\u4e00\u89a7</h1>
        <Link href="/orders/new" className="btn-primary">+ \u65b0\u898f\u767a\u6ce8</Link>
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">\ud83d\udce6</p>
          <p>\u767a\u6ce8\u304c\u307e\u3060\u3042\u308a\u307e\u305b\u3093</p>
          <Link href="/orders/new" className="mt-4 inline-block text-blue-600 hover:underline">\u6700\u521d\u306e\u767a\u6ce8\u3092\u4f5c\u6210\u3059\u308b</Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">\u767a\u6ce8\u756a\u53f7</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">\u767a\u6ce8\u5143</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">\u5546\u6d41</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">\u767a\u6ce8\u65e5</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">\u7d0d\u54c1\u5e0c\u671b\u65e5</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">\u30b9\u30c6\u30fc\u30bf\u30b9</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">\u73fe\u5728\u306e\u30b9\u30c6\u30c3\u30d7</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">\u64cd\u4f5c</th>
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
                  <td className="px-4 py-3 text-sm text-gray-500">{getCurrentStepName(order)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/orders/${order.id}`} className="text-blue-600 hover:underline text-sm">\u8a73\u7d30</Link>
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