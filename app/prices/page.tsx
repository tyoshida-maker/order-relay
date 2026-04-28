'use client'
import { useEffect, useState } from 'react'
import { supabase, Company, Product, PriceRule } from '@/lib/supabase'
import Papa from 'papaparse'

type PriceWithRelations = PriceRule & { companies?: { name: string } | null; products?: { name: string; code: string } | null }

export default function PricesPage() {
  const [prices, setPrices] = useState<PriceWithRelations[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ company_id: '', product_id: '', unit_price: '', valid_from: new Date().toISOString().split('T')[0] })
  const [msg, setMsg] = useState('')

  const load = async () => {
    setLoading(true)
    const [pd, cd, prd] = await Promise.all([
      supabase.from('price_rules').select('*, companies(name), products(name,code)').order('created_at', { ascending: false }),
      supabase.from('companies').select('*').order('name'),
      supabase.from('products').select('*').order('name')
    ])
    setPrices((pd.data || []) as PriceWithRelations[])
    setCompanies(cd.data || [])
    setProducts(prd.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.company_id || !form.product_id || !form.unit_price) return setMsg('必須項目を入力してください')
    const { error } = await supabase.from('price_rules').insert({ ...form, unit_price: Number(form.unit_price) })
    if (error) return setMsg('エラー: ' + error.message)
    setMsg('登録しました')
    setShowForm(false)
    load()
  }

  const handleCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[]
        let ok = 0
        for (const r of rows) {
          const compName = r.company_name || r['取引先名'] || ''
          const prodCode = r.product_code || r['商品コード'] || ''
          const price = r.unit_price || r['単価'] || ''
          if (!compName || !prodCode || !price) continue
          const comp = companies.find(c => c.name === compName || c.short_name === compName)
          const prod = products.find(p => p.code === prodCode)
          if (!comp || !prod) continue
          await supabase.from('price_rules').upsert({
            company_id: comp.id, product_id: prod.id,
            unit_price: Number(price),
            valid_from: r.valid_from || r['有効開始日'] || new Date().toISOString().split('T')[0]
          }, { onConflict: 'company_id,product_id,valid_from' })
          ok++
        }
        setMsg(ok + '件インポートしました')
        load()
      }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">価格管理</h1>
        <div className="flex gap-2">
          <label className="btn-secondary cursor-pointer">
            📤 CSV取込
            <input type="file" accept=".csv" className="hidden" onChange={handleCsv} />
          </label>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">＋ 新規登録</button>
        </div>
      </div>
      {msg && <div className="mb-3 p-2 bg-blue-50 text-blue-700 rounded text-sm">{msg}</div>}
      {showForm && (
        <div className="bg-gray-50 border rounded-lg p-4 mb-4">
          <h2 className="font-semibold mb-3">価格ルール登録</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">取引先*</label>
              <select className="input-field mt-1" value={form.company_id} onChange={e => setForm({...form, company_id: e.target.value})}>
                <option value="">選択</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">商品*</label>
              <select className="input-field mt-1" value={form.product_id} onChange={e => setForm({...form, product_id: e.target.value})}>
                <option value="">選択</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">単価*</label>
              <input type="number" className="input-field mt-1" value={form.unit_price} onChange={e => setForm({...form, unit_price: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-gray-600">有効開始日</label>
              <input type="date" className="input-field mt-1" value={form.valid_from} onChange={e => setForm({...form, valid_from: e.target.value})} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={save} className="btn-primary">保存</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">キャンセル</button>
          </div>
        </div>
      )}
      {loading ? <div className="text-center py-8 text-gray-500">読み込み中...</div> : (
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-100">
            <th className="p-2 text-left">取引先</th>
            <th className="p-2 text-left">商品</th>
            <th className="p-2 text-right">単価</th>
            <th className="p-2 text-left">有効開始日</th>
          </tr></thead>
          <tbody>
            {prices.map(p => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{p.companies?.name}</td>
                <td className="p-2">{p.products?.name}</td>
                <td className="p-2 text-right font-mono">¥{p.unit_price.toLocaleString()}</td>
                <td className="p-2 text-gray-500">{p.valid_from}</td>
              </tr>
            ))}
            {prices.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">価格が登録されていません</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  )
}
