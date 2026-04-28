'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()

type Item = { product_id: string; quantity: string; unit_price: string; notes: string }

export default function NewOrderPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [flows, setFlows] = useState<any[]>([])
  const [prices, setPrices] = useState<any[]>([])
  const [form, setForm] = useState({ order_date: new Date().toISOString().slice(0,10), delivery_date: '', from_company_id: '', flow_id: '', notes: '' })
  const [items, setItems] = useState<Item[]>([{ product_id: '', quantity: '1', unit_price: '', notes: '' }])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.from('companies').select('*').then(({ data }) => setCompanies(data || []))
    supabase.from('products').select('*').then(({ data }) => setProducts(data || []))
    supabase.from('flows').select('*').then(({ data }) => setFlows(data || []))
    supabase.from('prices').select('*').then(({ data }) => setPrices(data || []))
  }, [])

  const getAutoPrice = (product_id: string, from_company_id: string, flow_id: string) => {
    if (!product_id) return ''
    const flowObj = flows.find(f => f.id === flow_id)
    const steps: any[] = flowObj?.steps || []
    // Try to find price for this product + buyer combination
    const match = prices.find(p =>
      p.product_id === product_id &&
      (p.buyer_company_id === from_company_id || p.buyer_company_id === null || p.buyer_company_id === undefined)
    ) || prices.find(p => p.product_id === product_id)
    return match ? String(match.unit_price ?? match.price ?? '') : ''
  }

  const updateItem = (i: number, field: string, value: string) => {
    const updated = items.map((item, idx) => idx === i ? { ...item, [field]: value } : item)
    if (field === 'product_id' && value) {
      const autoPrice = getAutoPrice(value, form.from_company_id, form.flow_id)
      updated[i] = { ...updated[i], unit_price: autoPrice }
    }
    setItems(updated)
  }

  const genOrderNo = () => {
    const d = new Date()
    return 'ORD-' + d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0') + '-' + String(Math.floor(Math.random()*9000)+1000)
  }

  const save = async () => {
    if (!form.from_company_id) return setMsg('\u767a\u6ce8\u5143\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044')
    if (items.every(i => !i.product_id)) return setMsg('\u5546\u54c1\u3092\uff11\u3064\u4ee5\u4e0a\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044')
    setSaving(true)
    const order_no = genOrderNo()
    const { data: orderData, error: orderError } = await supabase.from('orders').insert({
      order_no, order_date: form.order_date, delivery_date: form.delivery_date || null,
      flow_id: form.flow_id || null, from_company_id: form.from_company_id,
      notes: form.notes, status: 'confirmed'
    }).select().single()
    if (orderError) { setMsg('\u30a8\u30e9\u30fc: ' + orderError.message); setSaving(false); return }
    const validItems = items.filter(i => i.product_id).map((i, idx) => ({
      order_id: orderData.id, product_id: i.product_id,
      quantity: Number(i.quantity),
      unit_price: i.unit_price ? Number(i.unit_price) : null,
      notes: i.notes, sort_order: idx
    }))
    const { error: itemError } = await supabase.from('order_items').insert(validItems)
    if (itemError) { setMsg('\u30a8\u30e9\u30fc: ' + itemError.message); setSaving(false); return }
    try {
      const selectedFlow = flows.find(f => f.id === form.flow_id)
      const fromCompany = companies.find(c => c.id === form.from_company_id)
      const firstStepCompanyId = selectedFlow?.steps?.[0]?.company_id
      const firstStepCompany = firstStepCompanyId ? companies.find(c => c.id === firstStepCompanyId) : null
      const emailItems = validItems.map(vi => {
        const prod = products.find(p => p.id === vi.product_id)
        return { product_name: prod?.name || '', quantity: vi.quantity, unit: prod?.unit || '', unit_price: vi.unit_price }
      })
      await fetch('/api/send-order-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderData.id,
          order_no, order_date: form.order_date, delivery_date: form.delivery_date,
          from_company: fromCompany?.name || '',
          flow_name: selectedFlow?.name || '',
          flow_companies: firstStepCompany ? [{ name: firstStepCompany.name, email: firstStepCompany.email }] : [],
          items: emailItems, notes: form.notes
        })
      })
    } catch (e) { console.error('Email send error:', e) }
    router.push('/orders/' + orderData.id)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">\u65b0\u898f\u767a\u6ce8</h1>
      {msg && <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm">{msg}</div>}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label">\u767a\u6ce8\u65e5</label>
          <input type="date" className="input-field" value={form.order_date} onChange={e => setForm({...form,order_date:e.target.value})} />
        </div>
        <div>
          <label className="label">\u7d0d\u54c1\u5e0c\u671b\u65e5</label>
          <input type="date" className="input-field" value={form.delivery_date} onChange={e => setForm({...form,delivery_date:e.target.value})} />
        </div>
        <div>
          <label className="label">\u767a\u6ce8\u5143*</label>
          <select className="input-field" value={form.from_company_id} onChange={e => setForm({...form,from_company_id:e.target.value})}>
            <option value="">\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">\u5546\u6d41</label>
          <select className="input-field" value={form.flow_id} onChange={e => setForm({...form,flow_id:e.target.value})}>
            <option value="">\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044</option>
            {flows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">\u5099\u8003</label>
          <input className="input-field" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} />
        </div>
      </div>
      <h2 className="font-semibold mb-2">\u767a\u6ce8\u660e\u7d30</h2>
      <div className="space-y-2 mb-3">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500">\u5546\u54c1</label>
              <select className="input-field" value={item.product_id} onChange={e => updateItem(i,'product_id',e.target.value)}>
                <option value="">\u9078\u629e</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="w-24">
              <label className="text-xs text-gray-500">\u6570\u91cf</label>
              <input type="number" className="input-field" value={item.quantity} onChange={e => updateItem(i,'quantity',e.target.value)} min="0" step="0.001" />
            </div>
            <div className="w-28">
              <label className="text-xs text-gray-500">\u5358\u4fa1 (\u81ea\u52d5\u53d6\u5f97)</label>
              <input type="number" className="input-field" value={item.unit_price} onChange={e => updateItem(i,'unit_price',e.target.value)} placeholder="\u81ea\u52d5" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">\u5099\u8003</label>
              <input className="input-field" value={item.notes} onChange={e => updateItem(i,'notes',e.target.value)} />
            </div>
            {i > 0 && <button onClick={() => setItems(items.filter((_,j) => j !== i))} className="text-red-500 text-sm mb-1">\u524a\u9664</button>}
          </div>
        ))}
      </div>
      <button onClick={() => setItems([...items,{product_id:'',quantity:'1',unit_price:'',notes:''}])} className="text-sm text-blue-600 hover:underline mb-4">+ \u660e\u7d30\u8ffd\u52a0</button>
      <div className="flex gap-3 mt-4">
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? '\u4fdd\u5b58\u4e2d...' : '\ud83d\udcbe \u767a\u6ce8\u3092\u78ba\u5b9a'}
        </button>
        <button onClick={() => router.back()} className="btn-secondary">\u30ad\u30e3\u30f3\u30bb\u30eb</button>
      </div>
    </div>
  )
}