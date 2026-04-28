'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Company, Flow } from '@/lib/supabase'

type OrderWithItems = {
  id: string
  order_no: string
  order_date: string
  delivery_date: string | null
  flow_id: string | null
  from_company_id: string | null
  notes: string | null
  status: string
  order_items: Array<{
    id: string
    quantity: number
    unit_price: number | null
    amount: number | null
    notes: string | null
    products: {
      name: string
      code: string
      category: string
    } | null
  }>
  companies: Company | null
  flows: Flow | null
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          companies(*),
          flows(*),
          order_items(
            *,
            products(name, code, category)
          )
        `)
        .eq('id', id)
        .single()
      setOrder(data as OrderWithItems)
      setLoading(false)
    }
    load()
  }, [id])

  const generateAllPdfs = async () => {
    if (!order) return
    setGenerating(true)
    setGenMsg('')
    try {
      const { generateOrderPdf } = await import('@/lib/pdf-generator')
      const flow = order.flows
      const steps = flow ? (flow.steps as string[]) : []
      let count = 0
      for (let i = 0; i < steps.length; i++) {
        const toId = steps[i]
        const fromId = i === 0 ? order.from_company_id : steps[i - 1]
        const { data: toCompany } = await supabase.from('companies').select('*').eq('id', toId).single()
        const { data: fromCompany } = await supabase.from('companies').select('*').eq('id', fromId || '').single()
        if (toCompany && fromCompany) {
          const items = order.order_items.map(item => ({
            name: item.products?.name || '',
            code: item.products?.code || '',
            category: item.products?.category || '',
            quantity: item.quantity,
            unit_price: item.unit_price || 0,
            amount: item.amount ?? ((item.unit_price || 0) * item.quantity)
          }))
          generateOrderPdf({
            type: 'order',
            orderNo: order.order_no,
            orderDate: order.order_date,
            deliveryDate: order.delivery_date || '',
            toCompany: { name: toCompany.name },
            fromCompany: { name: fromCompany.name },
            items
          })
          count++
        }
      }
      setGenMsg(count + ' 個のドキュメントを開きました')
    } catch (e) {
      setGenMsg('エラー: ' + String(e))
    }
    setGenerating(false)
  }

  if (loading) return <div className='p-8 text-center'>読み込み中...</div>
  if (!order) return <div className='p-8 text-center'>発注が見つかりません</div>

  const total = order.order_items.reduce((sum, item) => {
    const amt = item.amount ?? ((item.unit_price || 0) * item.quantity)
    return sum + amt
  }, 0)

  const flowSteps = order.flows ? (order.flows.steps as string[]) : []

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
            {generating ? '生成中...' : 'PDF 一括生成'}
          </button>
          <button onClick={() => router.push('/orders/new')}
            className='border px-4 py-2 rounded hover:bg-gray-50'>
            + 新規発注
          </button>
        </div>
      </div>

      {genMsg && <div className='bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded mb-4'>{genMsg}</div>}

      <div className='grid grid-cols-2 gap-4 mb-6'>
        <div className='border rounded p-4 bg-white'>
          <h2 className='font-semibold mb-3'>発注情報</h2>
          <table className='w-full text-sm'>
            <tbody>
              <tr>
                <td className='text-gray-500 py-1 w-1/3'>発注元</td>
                <td className='font-medium text-blue-700'>{order.companies?.name}</td>
              </tr>
              <tr>
                <td className='text-gray-500 py-1'>発注日</td>
                <td>{order.order_date}</td>
              </tr>
              <tr>
                <td className='text-gray-500 py-1'>納品希望日</td>
                <td>{order.delivery_date || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className='border rounded p-4 bg-blue-50'>
          <h2 className='font-semibold mb-3'>商流: {order.flows?.name}</h2>
          <div className='flex flex-wrap gap-2 items-center'>
            {flowSteps.map((stepId, idx) => (
              <FlowStepBadge key={stepId} companyId={stepId} isLast={idx === flowSteps.length - 1} />
            ))}
          </div>
        </div>
      </div>

      <div className='border rounded p-4 bg-white'>
        <h2 className='font-semibold mb-3'>発注明細</h2>
        <table className='w-full'>
          <thead>
            <tr className='border-b bg-gray-50'>
              <th className='text-left p-2'>商品</th>
              <th className='text-right p-2'>数量</th>
              <th className='text-left p-2'>単位</th>
              <th className='text-right p-2'>単価</th>
              <th className='text-right p-2'>金額</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map(item => {
              const amt = item.amount ?? ((item.unit_price || 0) * item.quantity)
              return (
                <tr key={item.id} className='border-b'>
                  <td className='p-2'>{item.products?.name}</td>
                  <td className='p-2 text-right'>{item.quantity}</td>
                  <td className='p-2'>{item.products?.category}</td>
                  <td className='p-2 text-right'>¥{(item.unit_price || 0).toLocaleString()}</td>
                  <td className='p-2 text-right'>¥{amt.toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className='p-2 text-right font-semibold'>合計</td>
              <td className='p-2 text-right font-bold text-lg'>¥{total.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function FlowStepBadge({ companyId, isLast }: { companyId: string; isLast: boolean }) {
  const [name, setName] = useState('')
  useEffect(() => {
    supabase.from('companies').select('name').eq('id', companyId).single().then(({ data }) => {
      if (data) setName(data.name)
    })
  }, [companyId])
  return (
    <>
      <span className='bg-white border px-2 py-1 rounded text-sm'>{name || companyId}</span>
      {!isLast && <span className='text-gray-400'>→</span>}
    </>
  )
}