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
      supabase.from('price_rules').select('*, companies(name), products(name,category)').order('created_at', { ascending: false }),
      supabase.from('companies').select('*').order('name'),
      supabase.from('products').select('*').eq('tenant_id','00000000-0000-0000-0000-000000000001').order('name')
    ])
    setPrices((pd.data || []) as PriceWithRelations[])
    setCompanies(cd.data || [])
    setProducts(prd.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.company_id || !form.product_id || !form.unit_price) return setMsg('å¿é é ç®ãå¥åãã¦ãã ãã')
    const { error } = await supabase.from('price_rules').insert({ ...form, unit_price: Number(form.unit_price) })
    if (error) return setMsg('ã¨ã©ã¼: ' + error.message)
    setMsg('ç»é²ãã¾ãã')
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
          const compName = r.company_name || r['åå¼åå'] || ''
          const prodCode = r.product_code || r['ååã³ã¼ã'] || ''
          const price = r.unit_price || r['åä¾¡'] || ''
          if (!compName || !prodCode || !price) continue
          const comp = companies.find(c => c.name === compName || c.short_name === compName)
          const prod = products.find(p => p.code === prodCode)
          if (!comp || !prod) continue
          await supabase.from('price_rules').upsert({
            company_id: comp.id, product_id: prod.id,
            unit_price: Number(price),
            valid_from: r.valid_from || r['æå¹éå§æ¥'] || new Date().toISOString().split('T')[0]
          }, { onConflict: 'company_id,product_id,valid_from' })
          ok++
        }
        setMsg(ok + 'ä»¶ã¤ã³ãã¼ããã¾ãã')
        load()
      }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">ä¾¡æ ¼ç®¡ç</h1>
        <div className="flex gap-2">
          <label className="btn-secondary cursor-pointer">
            ð¤ CSVåè¾¼
            <input type="file" accept=".csv" className="hidden" onChange={handleCsv} />
          </label>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">ï¼ æ°è¦ç»é²</button>
        </div>
      </div>
      {msg && <div className="mb-3 p-2 bg-blue-50 text-blue-700 rounded text-sm">{msg}</div>}
      {showForm && (
        <div className="bg-gray-50 border rounded-lg p-4 mb-4">
          <h2 className="font-semibold mb-3">ä¾¡æ ¼ã«ã¼ã«ç»é²</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">åå¼å*</label>
              <select className="input-field mt-1" value={form.company_id} onChange={e => setForm({...form, company_id: e.target.value})}>
                <option value="">é¸æ</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">åå*</label>
              <select className="input-field mt-1" value={form.product_id} onChange={e => setForm({...form, product_id: e.target.value})}>
                <option value="">é¸æ</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">åä¾¡*</label>
              <input type="number" className="input-field mt-1" value={form.unit_price} onChange={e => setForm({...form, unit_price: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-gray-600">æå¹éå§æ¥</label>
              <input type="date" className="input-field mt-1" value={form.valid_from} onChange={e => setForm({...form, valid_from: e.target.value})} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={save} className="btn-primary">ä¿å­</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">ã­ã£ã³ã»ã«</button>
          </div>
        </div>
      )}
      {loading ? <div className="text-center py-8 text-gray-500">èª­ã¿è¾¼ã¿ä¸­...</div> : (
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-100">
            <th className="p-2 text-left">åå¼å</th>
            <th className="p-2 text-left">åå</th>
            <th className="p-2 text-right">åä¾¡</th>
            <th className="p-2 text-left">æå¹éå§æ¥</th>
          </tr></thead>
          <tbody>
            {prices.map(p => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{p.companies?.name}</td>
                <td className="p-2">{p.products?.name}</td>
                <td className="p-2 text-right font-mono">Â¥{p.unit_price.toLocaleString()}</td>
                <td className="p-2 text-gray-500">{p.valid_from}</td>
              </tr>
            ))}
            {prices.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">ä¾¡æ ¼ãç»é²ããã¦ãã¾ãã</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  )
}
