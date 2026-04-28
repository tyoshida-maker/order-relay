'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase, Company } from '@/lib/supabase'
import Papa from 'papaparse'

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', short_name: '', postal_code: '', address: '', phone: '', fax: '', email: '', contact_person: '', notes: '' })
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
    const { error } = await supabase.from('companies').insert(form)
    if (error) return setMsg('エラー: ' + error.message)
    setMsg('登録しました')
    setShowForm(false)
    setForm({ name: '', short_name: '', postal_code: '', address: '', phone: '', fax: '', email: '', contact_person: '', notes: '' })
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
          name: r.name || r['会社名'] || '',
          short_name: r.short_name || r['略称'] || null,
          postal_code: r.postal_code || r['郵便番号'] || null,
          address: r.address || r['住所'] || null,
          phone: r.phone || r['電話'] || null,
          fax: r.fax || r['FAX'] || null,
          email: r.email || r['メール'] || null,
          contact_person: r.contact_person || r['担当者'] || null,
          notes: r.notes || r['備考'] || null,
        })).filter(r => r.name)
        const { error } = await supabase.from('companies').upsert(rows, { onConflict: 'name' })
        setMsg(error ? 'エラー: ' + error.message : rows.length + '件インポートしました')
        load()
      }
    })
  }

  const del = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await supabase.from('companies').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">取引先管理</h1>
        <div className="flex gap-2">
          <label className="btn-secondary cursor-pointer">
            📤 CSV取込
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsv} />
          </label>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">＋ 新規登録</button>
        </div>
      </div>
      {msg && <div className="mb-3 p-2 bg-blue-50 text-blue-700 rounded text-sm">{msg}</div>}
      {showForm && (
        <div className="bg-gray-50 border rounded-lg p-4 mb-4">
          <h2 className="font-semibold mb-3">新規取引先</h2>
          <div className="grid grid-cols-2 gap-3">
            {[['name','会社名*'],['short_name','略称'],['postal_code','郵便番号'],['address','住所'],['phone','電話'],['fax','FAX'],['email','メール'],['contact_person','担当者'],['notes','備考']].map(([k,l]) => (
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
              <th className="p-2 text-left">会社名</th>
              <th className="p-2 text-left">略称</th>
              <th className="p-2 text-left">電話</th>
              <th className="p-2 text-left">メール</th>
              <th className="p-2 text-left">担当者</th>
              <th className="p-2"></th>
            </tr></thead>
            <tbody>
              {companies.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{c.name}</td>
                  <td className="p-2 text-gray-500">{c.short_name}</td>
                  <td className="p-2">{c.phone}</td>
                  <td className="p-2">{c.email}</td>
                  <td className="p-2">{c.contact_person}</td>
                  <td className="p-2"><button onClick={() => del(c.id)} className="text-red-500 hover:text-red-700 text-xs">削除</button></td>
                </tr>
              ))}
              {companies.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">取引先が登録されていません</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
