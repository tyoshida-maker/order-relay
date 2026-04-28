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
    if (!form.name) return setMsg('\u4f1a\u793e\u540d\u306f\u5fc5\u9808\u3067\u3059')
    let error
    if (editId) {
      const res = await supabase.from('companies').update(form).eq('id', editId)
      error = res.error
    } else {
      const res = await supabase.from('companies').insert(form)
      error = res.error
    }
    if (error) return setMsg('\u30a8\u30e9\u30fc: ' + error.message)
    setMsg(editId ? '\u66f4\u65b0\u3057\u307e\u3057\u305f' : '\u767b\u9332\u3057\u307e\u3057\u305f')
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
    if (!confirm('\u524a\u9664\u3057\u307e\u3059\u304b\uff1f')) return
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
            name: row['\u4f1a\u793e\u540d'] || row.name || '',
            short_name: row['\u7565\u79f0'] || row.short_name || '',
            phone: row['\u96fb\u8a71'] || row.phone || '',
            email: row['\u30e1\u30fc\u30eb'] || row.email || '',
            contact_person: row['\u62c5\u5f53\u8005'] || row.contact_person || ''
          })
        }
        load()
      }
    })
  }

  const f = (k: keyof typeof form, label: string, required = false) => (
    <div key={k}>
      <label className='block text-sm font-medium mb-1'>{label}{required && <span className='text-red-500'>*</span>}</label>
      <input className='w-full border rounded px-3 py-2' value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} />
    </div>
  )

  return (
    <div className='container mx-auto p-6'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-bold'>\u53d6\u5f15\u5148\u7ba1\u7406</h1>
        <div className='flex gap-2'>
          <label className='btn-secondary cursor-pointer flex items-center gap-1 px-4 py-2 border rounded hover:bg-gray-50'>
            \ud83d\udcc4 CSV\u53d6\u8fbc
            <input type='file' accept='.csv' ref={fileRef} onChange={handleCsv} className='hidden' />
          </label>
          <button onClick={() => { setEditId(null); setForm(emptyForm); setMsg(''); setShowForm(true) }} className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'>+ \u65b0\u898f\u767b\u9332</button>
        </div>
      </div>

      {showForm && (
        <div className='border rounded p-6 mb-6 bg-white shadow-sm'>
          <h2 className='text-lg font-semibold mb-4'>{editId ? '\u53d6\u5f15\u5148\u7de8\u96c6' : '\u53d6\u5f15\u5148\u767b\u9332'}</h2>
          {msg && <p className='text-red-500 mb-3'>{msg}</p>}
          <div className='grid grid-cols-2 gap-4'>
            {f('name', '\u4f1a\u793e\u540d', true)}
            {f('short_name', '\u7565\u79f0')}
            {f('postal_code', '\u90f5\u4fbf\u756a\u53f7')}
            {f('address', '\u4f4f\u6240')}
            {f('phone', '\u96fb\u8a71')}
            {f('fax', 'FAX')}
            {f('email', '\u30e1\u30fc\u30eb')}
            {f('contact_person', '\u62c5\u5f53\u8005')}
          </div>
          <div className='mt-4'>
            <label className='block text-sm font-medium mb-1'>\u5099\u8003</label>
            <textarea className='w-full border rounded px-3 py-2' rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
          <div className='flex gap-2 mt-4'>
            <button onClick={save} className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'>\u4fdd\u5b58</button>
            <button onClick={cancelForm} className='border px-4 py-2 rounded hover:bg-gray-50'>\u30ad\u30e3\u30f3\u30bb\u30eb</button>
          </div>
        </div>
      )}

      {loading ? <p className='text-center text-gray-500'>\u8aad\u307f\u8fbc\u307f\u4e2d...</p> : (
        <table className='w-full border-collapse'>
          <thead>
            <tr className='border-b bg-gray-50'>
              <th className='text-left p-3'>\u4f1a\u793e\u540d</th>
              <th className='text-left p-3'>\u7565\u79f0</th>
              <th className='text-left p-3'>\u96fb\u8a71</th>
              <th className='text-left p-3'>\u30e1\u30fc\u30eb</th>
              <th className='text-left p-3'>\u62c5\u5f53\u8005</th>
              <th className='text-left p-3'>\u64cd\u4f5c</th>
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
                  <button onClick={() => startEdit(c)} className='text-blue-600 hover:underline mr-3'>\u7de8\u96c6</button>
                  <button onClick={() => del(c.id)} className='text-red-500 hover:underline'>\u524a\u9664</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}