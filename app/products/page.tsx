'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase, Product } from '@/lib/supabase'
import Papa from 'papaparse'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', unit: '個', description: '', notes: '' })
  const [msg, setMsg] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('code')
    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.code || !form.name) return setMsg('コードと商品名は必須です')
    const { error } = await supabase.from('products').insert(form)
    if (error) return setMsg('エラー: ' + error.message)
    setMsg('登録しました')
    setShowForm(false)
    setForm({ code: '', name: '', unit: '個', description: '', notes: '' })
    load()
  }

  const handleCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = (results.data as Record<string, string>[]).map(r => ({
          code: r.code || r['コード'] || '',
          name: r.name || r['商品名'] || '',
          unit: r.unit || r['単位'] || '個',
          description: r.description || r['説明'] || null,
          notes: r.notes || r['備考'] || null,
        })).filter(r => r.code && r.name)
        const { error } = await supabase.from('products').upsert(rows, { onConflict: 'code' })
        setMsg(error ? 'エラー: ' + error.message : rows.length + '件インポートしました')
        load()
      }
    })
  }

  const del = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await supabase.from('products').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">商品管理</h1>
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
          <h2 className="font-semibold mb-3">新規商品</h2>
          <div className="grid grid-cols-2 gap-3">
            {[['code','コード*'],['name','商品名*'],['unit','単位'],['description','説明'],['notes','備考']].map(([k,l]) => (
              <div key={k}>
                <label className="text-sm text-gray-600">{l}</label>
                <input className="input-field mt-1" value={(form as Record<string,string>)[k] || ''} onChange={e => setForm({...form, [k]: e.target.value})} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={save} className="btn-primary">保存</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">キャンセル</button>
          </div>
        </div>
      )}
      {loading ? <div className="text-center py-8 text-gray-500">読み込み中...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-100">
              <th className="p-2 text-left">コード</th>
              <th className="p-2 text-left">商品名</th>
              <th className="p-2 text-left">単位</th>
              <th className="p-2 text-left">説明</th>
              <th className="p-2"></th>
            </tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-mono text-sm">{p.code}</td>
                  <td className="p-2 font-medium">{p.name}</td>
                  <td className="p-2">{p.unit}</td>
                  <td className="p-2 text-gray-500">{p.description}</td>
                  <td className="p-2"><button onClick={() => del(p.id)} className="text-red-500 hover:text-red-700 text-xs">削除</button></td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">商品が登録されていません</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
