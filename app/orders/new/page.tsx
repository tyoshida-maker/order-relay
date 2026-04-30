'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Company = { id: string; name: string }
type FlowRoute = { id: string; name: string }
type FlowRouteProduct = {
  id: string
  product_id: string
  lot_price: number
  bags_per_lot: number
  kg_per_bag: number
  min_lot_qty: number
  product_name: string
}
type Item = {
  flow_route_product_id: string
  product_id: string
  product_name: string
  lot_qty: number
  lot_price: number
  bags_per_lot: number
  kg_per_bag: number
  notes: string
}

const emptyItem = (): Item => ({
  flow_route_product_id: '',
  product_id: '',
  product_name: '',
  lot_qty: 1,
  lot_price: 0,
  bags_per_lot: 0,
  kg_per_bag: 0,
  notes: '',
})

export default function NewOrderPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [flowRoutes, setFlowRoutes] = useState<FlowRoute[]>([])
  const [routeProducts, setRouteProducts] = useState<FlowRouteProduct[]>([])
  const [form, setForm] = useState({
    order_date: new Date().toISOString().slice(0, 10),
    delivery_date: '',
    from_company_id: '',
    flow_route_id: '',
    notes: '',
  })
  const [items, setItems] = useState<Item[]>([emptyItem()])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.from('companies').select('id, name').then(({ data }) => setCompanies(data || []))
    supabase.from('flow_routes').select('id, name').eq('status', 'active').then(({ data }) => setFlowRoutes(data || []))
  }, [])

  useEffect(() => {
    if (!form.flow_route_id) {
      setRouteProducts([])
      setItems([emptyItem()])
      return
    }
    const loadProducts = async () => {
      const { data } = await supabase
        .from('flow_route_products')
        .select('id, product_id, lot_price, bags_per_lot, kg_per_bag, min_lot_qty, products(name)')
        .eq('flow_route_id', form.flow_route_id)
        .eq('is_active', true)
      const enriched: FlowRouteProduct[] = (data || []).map((r: any) => ({
        id: r.id,
        product_id: r.product_id,
        lot_price: Number(r.lot_price) || 0,
        bags_per_lot: r.bags_per_lot || 0,
        kg_per_bag: Number(r.kg_per_bag) || 0,
        min_lot_qty: r.min_lot_qty || 1,
        product_name: r.products?.name || '-',
      }))
      setRouteProducts(enriched)
      setItems([emptyItem()])
    }
    loadProducts()
  }, [form.flow_route_id])

  const updateItem = (i: number, field: keyof Item, value: any) => {
    const updated = [...items]
    if (field === 'flow_route_product_id') {
      const rp = routeProducts.find(p => p.id === value)
      if (rp) {
        updated[i] = {
          ...updated[i],
          flow_route_product_id: rp.id,
          product_id: rp.product_id,
          product_name: rp.product_name,
          lot_price: rp.lot_price,
          bags_per_lot: rp.bags_per_lot,
          kg_per_bag: rp.kg_per_bag,
          lot_qty: Math.max(updated[i].lot_qty || 1, rp.min_lot_qty),
        }
      } else {
        updated[i] = { ...emptyItem() }
      }
    } else if (field === 'lot_qty') {
      const n = Math.max(1, Math.floor(Number(value) || 1))
      updated[i] = { ...updated[i], lot_qty: n }
    } else {
      updated[i] = { ...updated[i], [field]: value }
    }
    setItems(updated)
  }

  const addItem = () => setItems([...items, emptyItem()])
  const removeItem = (i: number) => {
    if (items.length === 1) return
    setItems(items.filter((_, idx) => idx !== i))
  }

  const subTotal = (it: Item) => it.lot_qty * it.lot_price
  const totalAmount = items.reduce((sum, it) => sum + subTotal(it), 0)

  const genOrderNo = () => {
    const d = new Date()
    return 'ORD-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(Math.floor(Math.random() * 9000) + 1000)
  }

  const save = async () => {
    setMsg('')
    if (!form.from_company_id) return setMsg('発注元を選択してください')
    if (!form.flow_route_id) return setMsg('商流を選択してください')
    const validItems = items.filter(i => i.flow_route_product_id)
    if (validItems.length === 0) return setMsg('商品を1つ以上選択してください')
    setSaving(true)
    try {
      const order_no = genOrderNo()
      const { data: orderData, error: orderError } = await supabase.from('orders').insert({
        order_no,
        order_date: form.order_date,
        delivery_date: form.delivery_date || null,
        flow_route_id: form.flow_route_id,
        flow_id: form.flow_route_id,
        from_company_id: form.from_company_id,
        notes: form.notes,
        status: 'confirmed',
        current_step: 0,
        approved_steps: [],
      }).select().single()
      if (orderError) {
        setMsg('注文作成エラー: ' + orderError.message)
        setSaving(false)
        return
      }
      const orderItemRows = validItems.map((i, idx) => ({
        order_id: orderData.id,
        product_id: i.product_id,
        quantity: i.lot_qty,
        unit_price: i.lot_price,
        notes: i.notes,
        sort_order: idx,
      }))
      const { error: itemError } = await supabase.from('order_items').insert(orderItemRows)
      if (itemError) {
        setMsg('明細作成エラー: ' + itemError.message)
        setSaving(false)
        return
      }
      router.push('/orders/' + orderData.id)
    } catch (e: any) {
      setMsg('予期せぬエラー: ' + (e.message || 'unknown'))
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">新規発注</h1>
          <Link href="/orders" className="bg-white/20 px-4 py-2 rounded-lg text-sm hover:bg-white/30">← 発注一覧</Link>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {msg && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4">
            {msg}
          </div>
        )}
        <div className="bg-white rounded-xl shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">発注日 *</label>
              <input
                type="date"
                value={form.order_date}
                onChange={e => setForm({ ...form, order_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">納品希望日</label>
              <input
                type="date"
                value={form.delivery_date}
                onChange={e => setForm({ ...form, delivery_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">発注元 *</label>
              <select
                value={form.from_company_id}
                onChange={e => setForm({ ...form, from_company_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">選択してください</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">商流 *</label>
              <select
                value={form.flow_route_id}
                onChange={e => setForm({ ...form, flow_route_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">選択してください</option>
                {flowRoutes.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-3">発注明細</h2>
            {!form.flow_route_id ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
                ⚠️ 先に商流を選択してください。
              </div>
            ) : routeProducts.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-lg text-sm">
                この商流には商品が登録されていません。
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((it, i) => {
                  const totalKg = it.lot_qty * it.bags_per_lot * it.kg_per_bag
                  const sub = subTotal(it)
                  return (
                    <div key={i} className="border rounded-xl p-4 bg-gray-50">
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-12 md:col-span-5">
                          <label className="block text-xs font-medium text-gray-600 mb-1">商品</label>
                          <select
                            value={it.flow_route_product_id}
                            onChange={e => updateItem(i, 'flow_route_product_id', e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 bg-white"
                          >
                            <option value="">選択してください</option>
                            {routeProducts.map(rp => (
                              <option key={rp.id} value={rp.id}>{rp.product_name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">数量</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={it.lot_qty}
                              onChange={e => updateItem(i, 'lot_qty', e.target.value)}
                              disabled={!it.flow_route_product_id}
                              className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-gray-100"
                            />
                            <span className="text-sm text-gray-600">ロット</span>
                          </div>
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">単価/ロット</label>
                          <div className="bg-white border rounded-lg px-3 py-2 text-right">
                            ¥{it.lot_price.toLocaleString()}
                          </div>
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">小計</label>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-right font-bold text-blue-700">
                            ¥{sub.toLocaleString()}
                          </div>
                        </div>
                        <div className="col-span-12 md:col-span-1 flex md:justify-center">
                          <button
                            type="button"
                            onClick={() => removeItem(i)}
                            disabled={items.length === 1}
                            className="text-red-600 hover:text-red-800 text-sm disabled:opacity-30"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                      {it.flow_route_product_id && (
                        <div className="mt-2 text-xs text-gray-600 flex flex-wrap gap-x-4">
                          <span>📦 1ロット = {it.kg_per_bag}kg × {it.bags_per_lot}袋 = {it.bags_per_lot * it.kg_per_bag}kg</span>
                          <span>合計: <strong>{totalKg}kg</strong></span>
                        </div>
                      )}
                      <div className="mt-2">
                        <input
                          type="text"
                          value={it.notes}
                          onChange={e => updateItem(i, 'notes', e.target.value)}
                          placeholder="明細備考(任意)"
                          className="w-full border rounded-lg px-3 py-2 bg-white text-sm"
                        />
                      </div>
                    </div>
                  )
                })}
                <button
                  type="button"
                  onClick={addItem}
                  className="text-blue-600 hover:underline text-sm"
                >
                  + 明細を追加
                </button>
              </div>
            )}
          </div>
          {items.some(i => i.flow_route_product_id) && (
            <div className="border-t pt-4 flex justify-end">
              <div className="text-right">
                <div className="text-sm text-gray-600">合計金額</div>
                <div className="text-3xl font-bold text-blue-700">
                  ¥{totalAmount.toLocaleString()}
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={save}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? '保存中...' : '💾 発注を確定'}
            </button>
            <Link
              href="/orders"
              className="border px-6 py-3 rounded-lg hover:bg-gray-100"
            >
              キャンセル
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
