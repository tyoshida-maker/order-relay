'use client'
import { useEffect, useState } from 'react'
import { supabase, PdfTemplate } from '@/lib/supabase'

const DEFAULT_COORDS = {
  order_no: { x: 420, y: 100, fontSize: 11 },
  order_date: { x: 420, y: 115, fontSize: 10 },
  delivery_date: { x: 420, y: 130, fontSize: 10 },
  to_company: { x: 50, y: 100, fontSize: 12 },
  from_company: { x: 50, y: 200, fontSize: 11 },
  items_start_y: { x: 50, y: 280, fontSize: 10 },
  total_amount: { x: 420, y: 700, fontSize: 12 },
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<PdfTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', doc_type: 'order', notes: '' })
  const [coords, setCoords] = useState(JSON.stringify(DEFAULT_COORDS, null, 2))
  const [msg, setMsg] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('pdf_templates').select('*').order('name')
    setTemplates(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.name) return setMsg('テンプレ名は必須です')
    let parsedCoords
    try { parsedCoords = JSON.parse(coords) } catch { return setMsg('座標JSONが不正です') }
    const { error } = await supabase.from('pdf_templates').insert({ ...form, field_coords: parsedCoords })
    if (error) return setMsg('エラー: ' + error.message)
    setMsg('登録しました')
    setShowForm(false)
    load()
  }

  const del = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await supabase.from('pdf_templates').delete().eq('id', id)
    load()
  }

  const docTypeLabel = (t: string) => ({ order:'発注書', delivery:'納品書', provisional_delivery:'仮納品書' }[t] || t)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">PDFテンプレート</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">＋ 新規登録</button>
      </div>
      {msg && <div className="mb-3 p-2 bg-blue-50 text-blue-700 rounded text-sm">{msg}</div>}
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
        💡 現在はHTMLテンプレート方式（座標指定不要）で美しい発注書を自動生成します。テンプレートは書類の種類と名前の登録のみで動作します。
      </div>
      {showForm && (
        <div className="bg-gray-50 border rounded-lg p-4 mb-4">
          <h2 className="font-semibold mb-3">テンプレート登録</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">テンプレ名*</label>
              <input className="input-field mt-1" value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="例: 標準発注書" />
            </div>
            <div>
              <label className="text-sm text-gray-600">書類種別*</label>
              <select className="input-field mt-1" value={form.doc_type} onChange={e => setForm({...form,doc_type:e.target.value})}>
                <option value="order">発注書</option>
                <option value="delivery">納品書</option>
                <option value="provisional_delivery">仮納品書</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-sm text-gray-600">備考</label>
              <input className="input-field mt-1" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-gray-600">フィールド座標 (JSON) - カスタムPDFテンプレ使用時</label>
              <textarea className="input-field mt-1 h-48 font-mono text-xs" value={coords} onChange={e => setCoords(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={save} className="btn-primary">保存</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">キャンセル</button>
          </div>
        </div>
      )}
      {loading ? <div className="text-center py-8 text-gray-500">読み込み中...</div> : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold">{t.name}</span>
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">{docTypeLabel(t.doc_type)}</span>
                  {t.notes && <p className="text-sm text-gray-500 mt-1">{t.notes}</p>}
                </div>
                <button onClick={() => del(t.id)} className="text-red-500 hover:text-red-700 text-sm">削除</button>
              </div>
            </div>
          ))}
          {templates.length === 0 && <div className="text-center py-8 text-gray-400">テンプレートが登録されていません</div>}
        </div>
      )}
    </div>
  )
}
