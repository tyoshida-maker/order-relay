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
    sort_order: number
    products: { name: string; code: string; unit: string } | null
  }>
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [flow, setFlow] = useState<Flow | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [pdfMsg, setPdfMsg] = useState('')

  useEffect(() => {
    const id = params.id as string
    Promise.all([
      supabase.from('orders').select('*, order_items(*, products(*))').eq('id', id).single(),
      supabase.from('companies').select('*')
    ]).then(([od, cd]) => {
      setOrder(od.data as OrderWithItems)
      setCompanies(cd.data || [])
      if (od.data?.from_company_id) {
        setCompany((cd.data || []).find((c: Company) => c.id === od.data.from_company_id) || null)
      }
      if (od.data?.flow_id) {
        supabase.from('flows').select('*').eq('id', od.data.flow_id).single().then(fd => setFlow(fd.data))
      }
      setLoading(false)
    })
  }, [params.id])

  const getCompanyName = (id: string | null) => companies.find(c => c.id === id)?.name || '-'

  const generateAllPdfs = async () => {
    if (!order) return
    setGenerating(true)
    setPdfMsg('Generating PDFs...')
    try {
      const { buildOrderHtml, openPrintWindow } = await import('@/lib/pdf-generator')
      type DocJobType = 'order' | 'delivery' | 'provisional_delivery'
      const jobs: Array<{ type: DocJobType; from: Company | null; to: Company | null; label: string }> = []
      if (flow) {
        const steps = flow.steps as Array<{ company_id: string; role: string }>
        for (let i = 0; i < steps.length - 1; i++) {
          const fromComp = companies.find(c => c.id === steps[i].company_id) || null
          const toComp = companies.find(c => c.id === steps[i + 1].company_id) || null
          jobs.push({ type: 'order', from: fromComp, to: toComp, label: 'Order' })
          jobs.push({ type: 'delivery', from: toComp, to: fromComp, label: 'Delivery' })
        }
      } else {
        jobs.push({ type: 'order', from: company, to: null, label: 'Order' })
        jobs.push({ type: 'delivery', from: null, to: company, label: 'Delivery' })
        jobs.push({ type: 'provisional_delivery', from: null, to: company, label: 'Provisional' })
      }
      for (const job of jobs) {
        const html = buildOrderHtml(order as Parameters<typeof buildOrderHtml>[0], job.from, job.to, job.type)
        openPrintWindow(html)
        await new Promise(r => setTimeout(r, 800))
      }
      setPdfMsg(jobs.length + ' documents opened for printing')
    } catch (e: unknown) {
      setPdfMsg('Error: ' + (e instanceof Error ? e.message : String(e)))
    }
    setGenerating(false)
  }

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>
  if (!order) return <div className="text-center py-8 text-gray-400">Order not found</div>

  const total = order.order_items.reduce((sum, i) => sum + (i.amount || 0), 0)
  const flowSteps = flow ? (flow.steps as Array<{ company_id: string; role: string }>) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{order.order_no}</h1>
          <p className="text-gray-500 text-sm">Order Date: {order.order_date}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={generateAllPdfs} disabled={generating}
            className="bg-green-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 text-lg">
            {generating ? 'Generating...' : 'PDF Generate All'}
          </button>
          <button onClick={() => router.push('/orders/new')} className="btn-secondary">+ New Order</button>
        </div>
      </div>
      {pdfMsg && <div className="mb-3 p-3 bg-green-50 text-green-700 rounded font-medium">{pdfMsg}</div>}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h2 className="font-semibold text-gray-700 mb-2">Order Info</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex gap-2"><dt className="text-gray-500 w-24">From</dt><dd className="font-medium">{getCompanyName(order.from_company_id)}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-24">Order Date</dt><dd>{order.order_date}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-24">Delivery</dt><dd>{order.delivery_date || '-'}</dd></div>
            {order.notes && <div className="flex gap-2"><dt className="text-gray-500 w-24">Notes</dt><dd>{order.notes}</dd></div>}
          </dl>
        </div>
        {flow && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h2 className="font-semibold text-gray-700 mb-2">Flow: {flow.name}</h2>
            <div className="text-sm">
              {flowSteps.map((s, i) => (
                <span key={i}>{i > 0 ? ' -> ' : ''}<span className="bg-blue-200 px-1 rounded">{getCompanyName(s.company_id)}</span></span>
              ))}
            </div>
          </div>
        )}
      </div>
      <h2 className="font-semibold mb-2">Order Items</h2>
      <table className="w-full text-sm mb-4">
        <thead><tr className="bg-gray-100">
          <th className="p-2 text-left">Item</th>
          <th className="p-2 text-right">Qty</th>
          <th className="p-2 text-left">Unit</th>
          <th className="p-2 text-right">Price</th>
          <th className="p-2 text-right">Amount</th>
        </tr></thead>
        <tbody>
          {order.order_items.sort((a,b) => a.sort_order - b.sort_order).map(item => (
            <tr key={item.id} className="border-b">
              <td className="p-2 font-medium">{item.products?.name || '-'}</td>
              <td className="p-2 text-right">{item.quantity}</td>
              <td className="p-2">{item.products?.unit || ''}</td>
              <td className="p-2 text-right">{item.unit_price ? item.unit_price.toLocaleString() : '-'}</td>
              <td className="p-2 text-right font-medium">{item.amount ? item.amount.toLocaleString() : '-'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-bold">
            <td colSpan={4} className="p-2 text-right">Total</td>
            <td className="p-2 text-right text-lg">{total.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
