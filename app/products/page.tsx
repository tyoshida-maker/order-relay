'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type Product = {
  id: string
  jan_code: string | null
  name: string
  weight_g: number | null
  category: string | null
  price_per_100g: number | null
  is_active: boolean
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ jan_code: '', name: '', weight_g: '', category: '', price_per_100g: '' })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase.from('products').select('id, jan_code, name, weight_g, category, price_per_100g, is_active').order('name')
    if (!error && data) setProducts(data)
    setLoading(false)
  }

  async function handleSave() {
    if (!form.name) { setError('商品名は必須です'); return }
    const payload = {
      jan_code: form.jan_code || null,
      name: form.name,
      weight_g: form.weight_g ? parseFloat(form.weight_g) : null,
      category: form.category || null,
      price_per_100g: form.price_per_100g ? parseFloat(form.price_per_100g) : null,
      is_active: true,
    }
    const { error } = await supabase.from('products').insert([payload])
    if (error) { setError(error.message); return }
    setSuccess('登録しました')
    setForm({ jan_code: '', name: '', weight_g: '', category: '', price_per_100g: '' })
    setShowForm(false)
    loadProducts()
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return
    await supabase.from('products').delete().eq('id', id)
    loadProducts()
  }

  const labelMap: {label: string, key: keyof typeof form, placeholder: string}[] = [
    { label: 'コード（JAN等）', key: 'jan_code', placeholder: 'RICE-5KG など' },
    { label: '商品名*', key: 'name', placeholder: '九州産ひのひかり無洗米５㎏' },
    { label: '単位・ロット', key: 'category', placeholder: '5㎏×6袋' },
    { label: '重量(g)', key: 'weight_g', placeholder: '5000' },
    { label: '単価', key: 'price_per_100g', placeholder: '0' },
  ]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>商品管理</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => fileRef.current?.click()} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}>📥 CSV取込</button>
          <input ref={fileRef} type='file' accept='.csv' style={{ display: 'none' }} />
          <button onClick={() => { setShowForm(true); setError(''); setSuccess('') }} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>＋ 新規登録</button>
        </div>
      </div>
      {success && <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: 6, marginBottom: '1rem', color: '#1d4ed8' }}>{success}</div>}
      {error && <div style={{ padding: '0.75rem', background: '#fef2f2', borderRadius: 6, marginBottom: '1rem', color: '#dc2626' }}>エラー：{error}</div>}
      {showForm && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.5rem', marginBottom: '1rem' }}>
          <h2 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>新規商品</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {labelMap.map(({ label, key, placeholder }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{label}</label>
                <input type='text' placeholder={placeholder} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 4, boxSizing: 'border-box' as const }} />
              </div>);)}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button onClick={handleSave} style={{ padding: '0.5rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>保存</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}>キャンセル</button>
          </div>
        </div>)}
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <thead><tr style={{ background: '#f9fafb' }}>
          {['コード', '商品名', '単位・ロット', '単価', ''].map(h => (
            <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>))}
        </tr></thead>
        <tbody>
          {loading ? (<tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>読み込み中...</td></tr>)
          : products.length === 0 ? (<tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>商品が登録されていません</td></tr>)
          : products.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>{p.jan_code || '-'}</td>
              <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{p.name}</td>
              <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>{p.category || '-'}</td>
              <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>{p.price_per_100g != null ? p.price_per_100g.toLocaleString() : '-'}</td>
              <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}><button onClick={() => handleDelete(p.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>削除</button></td>
            </tr>))}
        </tbody>
      </table>
    </div>)
}