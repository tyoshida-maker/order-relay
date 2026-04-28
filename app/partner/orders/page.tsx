'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function PartnerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
      if (!profile?.company_id) { setLoading(false); return }
      setCompanyId(profile.company_id)
      const { data } = await supabase
        .from('orders')
        .select(`*, order_items(*, products(name, jan_code)), flows(name)`)
        .or(`from_company_id.eq.${profile.company_id}`)
        .order('order_date', { ascending: false })
      setOrders(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-center py-8 text-gray-500">読み込み中...</div>
  if (!companyId) return <div className="text-center py-8 text-gray-500">担当会社が設定されていません。管理者にご連絡ください。</div>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">📋 発注内容</h1>
      {orders.length === 0 ? (
        <div className="text-center py-8 text-gray-400">発注がありません</div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="border rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-lg">{o.order_no}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    発注日: {o.order_date}
                    {o.delivery_date && <span className="ml-3">納品予定: {o.delivery_date}</span>}
                  </div>
                  {o.flows?.name && <div className="text-sm text-blue-600 mt-1">商流: {o.flows.name}</div>}
                </div>
                <span className={`px-2 py-1 rounded text-xs ${o.status === 'completed' ? 'bg-green-100 text-green-700' : o.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  {o.status === 'completed' ? '完了' : o.status === 'processing' ? '処理中' : '準備中'}
                </span>
              </div>
              {o.order_items?.length > 0 && (
                <table className="w-full text-sm mt-3 border-t pt-3">
                  <thead><tr className="text-gray-500 text-xs">
                    <th className="text-left py-1">商品</th>
                    <th className="text-right py-1">数量</th>
                  </tr></thead>
                  <tbody>
                    {o.order_items.map((item: any) => (
                      <tr key={item.id}>
                        <td className="py-1">{item.products?.name || '-'}</td>
                        <td className="text-right py-1">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
