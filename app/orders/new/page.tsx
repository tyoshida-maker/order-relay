'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

  const getAutoPrice = (product_id: string) => {
    if (!product_id) return ''
    const match = prices.find(p => p.product_id === product_id)
    return match ? String(match.unit_price ?? match.price ?? '') : ''
  }

  const updateItem = (i: number, field: string, value: string) => {
    const updated = items.map((item, idx) => idx === i ? { ...item, [field]: value } : item)
    if (field === 'product_id' && value) {
      updated[i] = { ...updated[i], unit_price: getAutoPrice(value) }
    }
    setItems(updated)
  }

  const genOrderNo = () => {
    const d = new Date()
    return 'ORD-' + d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0') + '-' + String(Math.floor(Math.random()*9000)+1000)
  }

  const save = async () => {
    if (!form.from_company_id) return setMsg('発注元を選択してください')
    if (items.every(i => !i.product_id)) return setMsg('商品を1つ以上選択してください')
    setSaving(true)
    const order_no = genOrderNo()
    const { data: orderData, error: orderError } = await supabase.from('orders').insert({
      order_no, order_date: form.order_date, delivery_date: form.delivery_date || null,
      flow_id: form.flow_id || null, from_company_id: form.from_company_id,
      notes: form.notes, status: 'confirmed'
    }).select().single()
    if (orderError) { setMsg('エラー: ' + orderError.message); setSaving(false); return }
    const validItems = items.filter(i => i.product_id).map((i, idx) => ({
      order_id: orderData.id, product_id: i.product_id,
      quantity: Number(i.quantity),
      unit_price: i.unit_price ? Number(i.unit_price) : null,
      notes: i.notes, sort_order: idx
    }))
    const { error: itemError } = await supabase.from('order_items').insert(validItems)
    if (itemError) { setMsg('エラー: ' + itemError.message); setSaving(false); return }
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
      <h1 className="text-2xl font-bold mb-4">新規発注</h1>
      {msg && <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm">{msg}</div>}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label">発注日</label>
          <input type="date" className="input-field" value={form.order_date} onChange={e => setForm({...form,order_date:e.target.value})} />
        </div>
        <div>
          <label className="label">納品希望日</label>
          <input type="date" className="input-field" value={form.delivery_date} onChange={e => setForm({...form,delivery_date:e.target.value})} />
        </div>
        <div>
          <label className="label">発注元*</label>
          <select className="input-field" value={form.from_company_id} onChange={e => setForm({...form,from_company_id:e.target.value})}>
            <option value="">選択してください</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">商流</label>
          <select className="input-field" value={form.flow_id} onChange={e => setForm({...form,flow_id:e.target.value})}>
            <option value="">選択してください</option>
            {flows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">備考</label>
          <input className="input-field" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} />
        </div>
      </div>
      <h2 className="font-semibold mb-2">発注明細</h2>
      <div className="space-y-2 mb-3">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500">商品</label>
              <select className="input-field" value={item.product_id} onChange={e => updateItem(i,'product_id',e.target.value)}>
                <option value="">選択</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="w-24">
              <label className="text-xs text-gray-500">数量</label>
              <input type="number" className="input-field" value={item.quantity} onChange={e => updateItem(i,'quantity',e.target.value)} min="0" step="0.001" />
            </div>
            <div className="w-28">
              <label className="text-xs text-gray-500">単価（自動取得）</label>
              <input type="number" className="input-field" value={item.unit_price} onChange={e => updateItem(i,'unit_price',e.target.value)} placeholder="自動" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">備考</label>
              <input className="input-field" value={item.notes} onChange={e => updateItem(i,'notes',e.target.value)} />
            </div>
            {i > 0 && <button onClick={() => setItems(items.filter((_,j) => j !== i))} className="text-red-500 text-sm mb-1">削除</button>}
          </div>
        ))}
      </div>
      <button onClick={() => setItems([...items,{product_id:'',quantity:'1',unit_price:'',notes:''}])} className="text-sm text-blue-600 hover:underline mb-4">+ 明細追加</button>
      <div className="flex gap-3 mt-4">
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? '保存中...' : '💾 発注を確定'}
        </button>
        <button onClick={() => router.back()} className="btn-secondary">キャンセル</button>
      </div>
    </div>
  )
}