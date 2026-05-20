'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Company } from '@/lib/supabase'
import { generateOrderPdf } from '@/lib/pdf-generator'

type RouteStep = {
  id: string
  flow_route_id: string
  company_id: string
  role: string
  step_order: number
  company_slug: string | null
  approver_email: string | null
  companies: Company | null
}

type OrderWithItems = {
  id: string
  order_no: string
  order_date: string
  delivery_date: string | null
  flow_id: string | null
  flow_route_id: string | null
  from_company_id: string | null
  notes: string | null
  status: string
  current_step: number | null
  approved_steps: number[] | null
  order_items: Array<{
    id: string
    quantity: number
    unit_price: number | null
    amount: number | null
    notes: string | null
    products: {
      name: string
      jan_code: string
      category: string
    } | null
  }>
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [fromCompany, setFromCompany] = useState<Company | null>(null)
  const [flowRoute, setFlowRoute] = useState<{ id: string; name: string } | null>(null)
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([])
  const [allCompanies, setAllCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg] = useState('')
  const [approving, setApproving] = useState(false)
  const [approveMsg, setApproveMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            products(name, jan_code, category)
          )
        `)
        .eq('id', id)
        .single()

      if (orderError || !orderData) {
        console.error('orders fetch error:', orderError)
        setLoading(false)
        return
      }

      setOrder(orderData as OrderWithItems)

      if (orderData.from_company_id) {
        const { data: fcData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', orderData.from_company_id)
          .single()
        if (fcData) setFromCompany(fcData as Company)
      }

      const routeId = orderData.flow_route_id || orderData.flow_id
      if (routeId) {
        const { data: routeData } = await supabase
          .from('flow_routes')
          .select('id, name')
          .eq('id', routeId)
          .single()
        if (routeData) setFlowRoute(routeData)

        const { data: stepsData } = await supabase
          .from('flow_route_companies')
          .select('*, companies(*)')
          .eq('flow_route_id', routeId)
          .order('step_order')
        if (stepsData) setRouteSteps(stepsData as RouteStep[])
      }

      const { data: compData } = await supabase.from('companies').select('*')
      setAllCompanies((compData || []) as Company[])
      setLoading(false)
    }
    load()
  }, [id])

  const findCompany = (cid: string) => allCompanies.find(c => c.id === cid)

  const generateAllPdfs = async () => {
    if (!order) return
    setGenerating(true)
    setGenMsg('')
    try {
      const items = order.order_items.map(i => ({
        name: i.products?.name || '',
        code: i.products?.jan_code || '',
        category: i.products?.category || '',
        quantity: i.quantity,
        unit_price: i.unit_price || 0,
        amount: i.amount ?? ((i.unit_price || 0) * i.quantity)
      }))
      let count = 0
      const buyerStep = routeSteps.find(s => s.role === 'buyer')
      if (buyerStep && fromCompany) {
        const toComp = buyerStep.companies || findCompany(buyerStep.company_id)
        generateOrderPdf({
          type: 'order',
          orderNo: order.order_no,
          orderDate: order.order_date,
          deliveryDate: order.delivery_date || order.order_date,
          toCompany: {
            name: toComp?.name || '',
            address: toComp?.address || '',
            phone: toComp?.phone || ''
          },
          fromCompany: {
            name: fromCompany.name,
            address: fromCompany.address || '',
            phone: fromCompany.phone || ''
          },
          items
        })
        count++
      }
      const sellerStep = routeSteps.find(s => s.role === 'seller')
      if (sellerStep && fromCompany) {
        const buyerComp = buyerStep ? (buyerStep.companies || findCompany(buyerStep.company_id)) : null
        generateOrderPdf({
          type: 'provisional_delivery',
          orderNo: order.order_no,
          orderDate: order.order_date,
          deliveryDate: order.delivery_date || order.order_date,
          toCompany: {
            name: buyerComp?.name || fromCompany.name,
            address: buyerComp?.address || fromCompany.address || '',
            phone: buyerComp?.phone || fromCompany.phone || ''
          },
          fromCompany: {
            name: fromCompany.name,
            address: fromCompany.address || '',
            phone: fromCompany.phone || ''
          },
          items
        })
        count++
      }
      setGenMsg(count + '文書を開きました')
    } catch (e) {
      console.error(e)
      setGenMsg('エラーが発生しました')
    }
    setGenerating(false)
  }

  const approveStep = async () => {
    if (!order) return
    setApproving(true)
    setApproveMsg('')
    try {
      const res = await fetch('/api/approve-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id })
      })
      const data = await res.json()
      if (data.success) {
        setApproveMsg(data.is_completed ? '✅ 全ステップ承認完了！' : '✅ 承認しました。次のステップへ通知しました。')
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setApproveMsg('エラー: ' + (data.error || '不明なエラー'))
      }
    } catch (e) {
      setApproveMsg('通信エラーが発生しました')
    }
    setApproving(false)
  }

  if (loading) return <div className='p-8 text-center'>読み込み中...</div>
  if (!order) return <div className='p-8 text-center'>発注が見つかりません</div>

  const total = order.order_items.reduce((sum, item) => {
    const amt = item.amount ?? ((item.unit_price || 0) * item.quantity)
    return sum + amt
  }, 0)

  return (
    <div className='container mx-auto p-6'>
      <div className='flex items-center justify-between mb-4'>
        <div>
          <h1 className='text-2xl font-bold'>{order.order_no}</h1>
          <p className='text-gray-500 text-sm'>発注日: {order.order_date}</p>
        </div>
        <div className='flex gap-2'>
          <button onClick={generateAllPdfs} disabled={generating}
            className='bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50'>
            {generating ? '生成中...' : 'PDF一括生成'}
          </button>
          <button onClick={() => router.push('/orders/new')}
            className='border px-4 py-2 rounded hover:bg-gray-50'>
            +新規発注
          </button>
        </div>
      </div>
      {genMsg && <div className='mb-4 p-3 bg-green-50 text-green-800 rounded'>{genMsg}</div>}
      <div className='grid grid-cols-2 gap-6 mb-6'>
        <div className='bg-white border rounded-lg p-4'>
          <h2 className='font-semibold mb-3'>発注情報</h2>
          <dl className='space-y-2 text-sm'>
            <div className='flex gap-2'>
              <dt className='text-gray-500 w-24'>発注元</dt>
              <dd className='text-blue-700 font-medium'>{fromCompany?.name || '-'}</dd>
            </div>
            <div className='flex gap-2'>
              <dt className='text-gray-500 w-24'>発注日</dt>
              <dd>{order.order_date}</dd>
            </div>
            <div className='flex gap-2'>
              <dt className='text-gray-500 w-24'>納品希望日</dt>
              <dd>{order.delivery_date || '-'}</dd>
            </div>
            <div className='flex gap-2'>
              <dt className='text-gray-500 w-24'>ステータス</dt>
              <dd>
                {order.status === 'completed' ? '🎉 完了' :
                  order.status === 'in_progress' ? '⏳ 進行中' :
                    order.status === 'confirmed' ? '📋 確定' : order.status}
              </dd>
            </div>
          </dl>
        </div>
        {flowRoute && routeSteps.length > 0 && (
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
            <h2 className='font-semibold mb-3'>商流: {flowRoute.name}</h2>
            <div className='flex items-center gap-2 flex-wrap mb-3'>
              {routeSteps.map((step, i) => {
                const comp = step.companies || findCompany(step.company_id)
                const isApproved = (order.approved_steps || []).includes(i)
                const isCurrent = (order.current_step ?? 0) === i && order.status !== 'completed'
                return (
                  <span key={step.id} className='flex items-center gap-1'>
                    <span className={`text-xs px-2 py-1 rounded border ${isApproved ? 'bg-green-100 border-green-400 text-green-800' :
                      isCurrent ? 'bg-yellow-100 border-yellow-400 text-yellow-800 font-bold' :
                        'bg-white border-blue-300 text-blue-800'
                      }`}>
                      {isApproved ? '✅ ' : isCurrent ? '⏳ ' : ''}{comp?.short_name || comp?.name || '会社未設定'}
                    </span>
                    {i < routeSteps.length - 1 && <span className='text-gray-400'>→</span>}
                  </span>
                )
              })}
            </div>
            {order.status === 'completed' ? (
              <p className='text-green-700 font-bold text-sm'>🎉 全ステップ承認完了</p>
            ) : (
              <div className='mt-2'>
                <p className='text-sm text-gray-600 mb-2'>
                  現在のステップ: <span className='font-bold text-yellow-700'>
                    {(() => {
                      const s = routeSteps[order.current_step ?? 0]
                      const c = s ? (s.companies || findCompany(s.company_id)) : null
                      return c?.name || '不明'
                    })()}
                  </span> が承認待ち
                </p>
                {approveMsg && <p className='text-sm mb-2 font-semibold text-green-700'>{approveMsg}</p>}
                <button onClick={approveStep} disabled={approving}
                  className='bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50'>
                  {approving ? '処理中...' : '✅ このステップを承認して次へ進める'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className='bg-white border rounded-lg p-4'>
        <h2 className='font-semibold mb-3'>発注明細</h2>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b bg-gray-50'>
              <th className='text-left py-2 px-3'>商品</th>
              <th className='text-right py-2 px-3'>数量</th>
              <th className='text-left py-2 px-3'>単位</th>
              <th className='text-right py-2 px-3'>単価</th>
              <th className='text-right py-2 px-3'>金額</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map(item => {
              const amt = item.amount ?? ((item.unit_price || 0) * item.quantity)
              return (
                <tr key={item.id} className='border-b'>
                  <td className='py-2 px-3'>{item.products?.name}</td>
                  <td className='py-2 px-3 text-right'>{item.quantity}</td>
                  <td className='py-2 px-3'>{item.products?.category || 'ロット'}</td>
                  <td className='py-2 px-3 text-right'>￥{(item.unit_price || 0).toLocaleString()}</td>
                  <td className='py-2 px-3 text-right'>￥{amt.toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className='py-2 px-3 text-right font-semibold'>合計</td>
              <td className='py-2 px-3 text-right font-bold'>￥{total.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
