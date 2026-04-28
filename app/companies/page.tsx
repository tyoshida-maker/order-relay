'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase, Company } from '@/lib/supabase'
import Papa from 'papaparse'

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const emptyForm = { name: '', short_name: '', postal_code: '', address: '', phone: '', fax: '', email: '', contact_person: '', notes: '' }
  const [form, setForm] = useState(emptyForm)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('companies').select('*').order('name')
    setCompanies(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.name) return setMsg('会社名は必須です')
    let error
    if (editId) {
      const res = await supabase.from('companies').update(form).eq('id', editId)
      error = res.error
    } else {
      const res = await supabase.from('companies').insert(form)
      error = res.error
    }
    if (error) return setMsg('エラー: ' + error.message)
    setMsg(editId ? '更新しました' : '登録しました')
    setForm(emptyForm)
    setShowForm(false)
    setEditId(null)
    load()
  }

  const startEdit = (c: Company) => {
    setForm({
      name: c.name || '',
      short_name: c.short_name || '',
      postal_code: c.postal_code || '',
      address: c.address || '',
      phone: c.phone || '',
      fax: c.fax || '',
      email: c.email || '',
      contact_person: c.contact_person || '',
      notes: c.notes || ''
    })
    setEditId(c.id)
    setShowForm(true)
    setMsg('')
  }

  const cancelForm = () => {
    setForm(emptyForm)
    setEditId(null)
    setShowForm(false)
    setMsg('')
  }

  const del = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await supabase.from('companies').delete().eq('id', id)
    load()
  }

  const handleCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[]
        for (const row of rows) {
          await supabase.from('companies').insert({
            name: row['会社名'] || row.name || '',
            short_name: row['略称'] || row.short_name || '',
            phone: row['電話'] || row.phone || '',
            email: row['メール'] || row.email || '',
            contact_person: row['担当者'] || row.contact_person || ''
          })
        }
        load()
      }
    })
  }

  const inp = (k: keyof typeof emptyForm, v: string) => (
    <input className='w-full border rounded px-3 py-2' value={v}
      onChange={e => setForm(prev => ({ ...prev, [k]: e.target.value }))} />
  )

  return (
    <div className='container mx-auto p-6'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-bold'>取引先管理</h1>
        <div className='flex gap-2'>
          <label className='cursor-pointer flex items-center gap-1 px-4 py-2 border rounded hover:bg-gray-50'>
            CSV取込
            <input type='file' accept='.csv' ref={fileRef} onChange={handleCsv} className='hidden' />
          </label>
          <button onClick={() => { setEditId(null); setForm(emptyForm); setMsg(''); setShowForm(true) }}
            className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'>
            + 新規登録
          </button>
        </div>
      </div>

      {showForm && (
        <div className='border rounded p-6 mb-6 bg-white shadow-sm'>
          <h2 className='text-lg font-semibold mb-4'>{editId ? '取引先編集' : '取引先登録'}</h2>
          {msg && <p className='text-red-500 mb-3'>{msg}</p>}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium mb-1'>会社名 <span className='text-red-500'>*</span></label>
              {inp('name', form.name)}
            </div>
            <div>
              <label className='block text-sm font-medium mb-1'>略称</label>
              {inp('short_name', form.short_name)}
            </div>
            <div>
              <label className='block text-sm font-medium mb-1'>郵便番号</label>
              {inp('postal_code', form.postal_code)}
            </div>
            <div>
              <label className='block text-sm font-medium mb-1'>住所</label>
              {inp('address', form.address)}
            </div>
            <div>
              <label className='block text-sm font-medium mb-1'>電話</label>
              {inp('phone', form.phone)}
            </div>
            <div>
              <label className='block text-sm font-medium mb-1'>FAX</label>
              {inp('fax', form.fax)}
            </div>
            <div>
              <label className='block text-sm font-medium mb-1'>メール</label>
              {inp('email', form.email)}
            </div>
            <div>
              <label className='block text-sm font-medium mb-1'>担当者</label>
              {inp('contact_person', form.contact_person)}
            </div>
          </div>
          <div className='mt-4'>
            <label className='block text-sm font-medium mb-1'>備考</label>
            <textarea className='w-full border rounded px-3 py-2' rows={2}
              value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} />
          </div>
          <div className='flex gap-2 mt-4'>
            <button onClick={save} className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'>保存</button>
            <button onClick={cancelForm} className='border px-4 py-2 rounded hover:bg-gray-50'>キャンセル</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className='text-center text-gray-500'>読み込み中...</p>
      ) : (
        <table className='w-full border-collapse'>
          <thead>
            <tr className='border-b bg-gray-50'>
              <th className='text-left p-3'>会社名</th>
              <th className='text-left p-3'>略称</th>
              <th className='text-left p-3'>電話</th>
              <th className='text-left p-3'>メール</th>
              <th className='text-left p-3'>担当者</th>
              <th className='text-left p-3'>操作</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(c => (
              <tr key={c.id} className='border-b hover:bg-gray-50'>
                <td className='p-3 font-medium'>{c.name}</td>
                <td className='p-3 text-blue-600'>{c.short_name}</td>
                <td className='p-3'>{c.phone}</td>
                <td className='p-3'>{c.email}</td>
                <td className='p-3'>{c.contact_person}</td>
                <td className='p-3'>
                  <button onClick={() => startEdit(c)} className='text-blue-600 hover:underline mr-3'>編集</button>
                  <button onClick={() => del(c.id)} className='text-red-500 hover:underline'>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}