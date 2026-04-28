'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Company, Flow } from '@/lib/supabase'
import { generateOrderPdf } from '@/lib/pdf-generator'

type FlowStep = { role: string; company_id: string }

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
      jan_code: string
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
  const [allCompanies, setAllCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      const [{ data: orderData, error }, { data: compData }] = await Promise.all([
        supabase
          .from('orders')
          .select(`
            *,
            companies(*),
            flows(*),
            order_items(
              *,
              products(name, jan_code, category)
            )
          `)
          .eq('id', id)
          .single(),
        supabase.from('companies').select('*')
      ])
      if (error) console.error(error)
      setOrder(orderData as OrderWithItems)
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
      const steps: FlowStep[] = order.flows ? (order.flows.steps as FlowStep[]) : []
      const fromCompany = order.companies
      const items = order.order_items.map(i => ({
        name: i.products?.name || '',
        code: i.products?.jan_code || '',
        category: i.products?.category || '',
        quantity: i.quantity,
        unit_price: i.unit_price || 0,
        amount: i.amount ?? ((i.unit_price || 0) * i.quantity)
      }))
      let count = 0
      // Generate order PDF: from_company -> first step buyer
      const buyerStep = steps.find(s => s.role === 'buyer')
      if (buyerStep && fromCompany) {
        const toComp = findCompany(buyerStep.company_id)
        generateOrderPdf({
          type: 'order',
          orderNo: order.order_no,
          orderDate: order.order_date,
          deliveryDate: order.delivery_date || order.order_date,
          toCompany: { name: toComp?.name || '', address: toComp?.address || '', phone: toComp?.phone || '' },
          fromCompany: { name: fromCompany.name, address: fromCompany.address || '', phone: fromCompany.phone || '' },
          items
        })
        count++
      }
      // Generate provisional delivery: seller -> buyer
      const sellerStep = steps.find(s => s.role === 'seller')
      if (sellerStep && fromCompany) {
        const sellerComp = findCompany(sellerStep.company_id)
        const buyerComp = buyerStep ? findCompany(buyerStep.company_id) : null
        generateOrderPdf({
          type: 'provisional_delivery',
          orderNo: order.order_no,
          orderDate: order.order_date,
          deliveryDate: order.delivery_date || order.order_date,
          toCompany: { name: buyerComp?.name || fromCompany.name, address: buyerComp?.address || fromCompany.address || '', phone: buyerComp?.phone || fromCompany.phone || '' },
          fromCompany: { name: fromCompany.name, address: fromCompany.address || '', phone: fromCompany.phone || '' },
          items
        })
        count++
      }
      setGenMsg(count + '文書を開きました')
    } catch(e) {
      console.error(e)
      setGenMsg('エラーが発生しました')
    }
    setGenerating(false)
  }

  if (loading) return <div className='p-8 text-center'>読み込み中...</div>
  if (!order) return <div className='p-8 text-center'>発注が見つかりません</div>

  const total = order.order_items.reduce((sum, item) => {
    const amt = item.amount ?? ((item.unit_price || 0) * item.quantity)
    return sum + amt
  }, 0)

  const steps: FlowStep[] = order.flows ? (order.flows.steps as FlowStep[]) : []

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
              <dd className='text-blue-700 font-medium'>{order.companies?.name}</dd>
            </div>
            <div className='flex gap-2'>
              <dt className='text-gray-500 w-24'>発注日</dt>
              <dd>{order.order_date}</dd>
            </div>
            <div className='flex gap-2'>
              <dt className='text-gray-500 w-24'>納品希望日</dt>
              <dd>{order.delivery_date}</dd>
            </div>
          </dl>
        </div>
        {order.flows && (
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
            <h2 className='font-semibold mb-3'>商流: {order.flows.name}</h2>
            <div className='flex items-center gap-2 flex-wrap'>
              {steps.map((step, i) => {
                const comp = findCompany(step.company_id)
                return (
                  <span key={i} className='flex items-center gap-1'>
                    <span className='bg-white border border-blue-300 text-blue-800 text-xs px-2 py-1 rounded'>
                      {comp?.short_name || comp?.name || step.company_id}
                    </span>
                    {i < steps.length - 1 && <span className='text-gray-400'>→</span>}
                  </span>
                )
              })}
            </div>
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
                  <td className='py-2 px-3'>{item.products?.category}</td>
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