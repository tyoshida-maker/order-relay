'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

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

  const getStatus = (order: any): string => {
    if (order.status === 'completed') return 'completed'
    const steps: any[] = order.flows?.steps || []
    if (steps.length === 0) return 'confirmed'
    const approvedCount = (order.approved_steps || []).length
    return approvedCount + '/' + steps.length
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link href="/orders/new" className="btn-primary">+ New Order</Link>
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>No orders yet.</p>
          <Link href="/orders/new" className="mt-4 inline-block text-blue-600 hover:underline">Create first order</Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Order No.</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Company</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Flow</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm text-blue-700">{order.order_no}</td>
                  <td className="px-4 py-3 text-sm">{order.companies?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.flows?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.order_date}</td>
                  <td className="px-4 py-3 text-sm">{getStatus(order)}</td>
                  <td className="px-4 py-3">
                    <Link href={'/orders/' + order.id} className="text-blue-600 hover:underline text-sm">View</Link>
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
