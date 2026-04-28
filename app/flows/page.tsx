'use client'
import { useEffect, useState } from 'react'
import { supabase, Company, Flow } from '@/lib/supabase'

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [steps, setSteps] = useState<Array<{company_id: string; role: string}>>([{company_id:'',role:'buyer'},{company_id:'',role:'middle'},{company_id:'',role:'seller'}])
  const [msg, setMsg] = useState('')

  const load = async () => {
    setLoading(true)
    const [fd, cd] = await Promise.all([
      supabase.from('flows').select('*').order('name'),
      supabase.from('companies').select('*').order('name')
    ])
    setFlows(fd.data || [])
    setCompanies(cd.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const getCompanyName = (id: string) => companies.find(c => c.id === id)?.name || id

  function startEdit(f: Flow) {
    setName(f.name || '')
    const fSteps = (f.steps as Array<{company_id: string; role: string}>) || []
    setSteps(fSteps.length > 0 ? fSteps : [{company_id:'',role:'buyer'},{company_id:'',role:'middle'},{company_id:'',role:'seller'}])
    setEditId(f.id)
    setShowForm(true)
    setMsg('')
  }

  function cancelForm() {
    setName('')
    setSteps([{company_id:'',role:'buyer'},{company_id:'',role:'middle'},{company_id:'',role:'seller'}])
    setEditId(null)
    setShowForm(false)
    setMsg('')
  }

  const save = async () => {
    if (!name) return setMsg('商流名は必須です')
    const validSteps = steps.filter(s => s.company_id)
    if (validSteps.length < 2) return setMsg('最低2社を選択してください')
    const docSets: Flow['doc_sets'] = []
    for (let i = 0; i < validSteps.length - 1; i++) {
      docSets.push({ doc_type: 'order', from_company_id: validSteps[i].company_id, to_company_id: validSteps[i+1].company_id, template_id: '' })
      docSets.push({ doc_type: 'delivery', from_company_id: validSteps[i+1].company_id, to_company_id: validSteps[i].company_id, template_id: '' })
    }
    let error
    if (editId) {
      const res = await supabase.from('flows').update({ name, steps: validSteps, doc_sets: docSets, notes: '' }).eq('id', editId)
      error = res.error
    } else {
      const res = await supabase.from('flows').insert({ name, steps: validSteps, doc_sets: docSets, notes: '' })
      error = res.error
    }
    if (error) return setMsg('エラー: ' + error.message)
    setMsg(editId ? '更新しました' : '登録しました')
    cancelForm()
    load()
  }

  const del = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await supabase.from('flows').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">商流定義</h1>
        <button onClick={() => { cancelForm(); setShowForm(true) }} className="btn-primary">＋ 新規登録</button>
      </div>
      {msg && <div className="mb-3 p-2 bg-blue-50 text-blue-700 rounded text-sm">{msg}</div>}
      {showForm && (
        <div className="bg-gray-50 border rounded-lg p-4 mb-4">
          <h2 className="font-semibold mb-3">{editId ? '商流を編集' : '商流登録'}</h2>
          <div className="mb-3">
            <label className="text-sm text-gray-600">商流名*</label>
            <input className="input-field mt-1" value={name} onChange={e => setName(e.target.value)} placeholder="例: とりもつえん→創未家→ゼロテックファーム→九州食籲" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-600">取引先ステップ（上から順番）</label>
            {steps.map((s, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-sm text-gray-500 w-6">{i+1}.</span>
                <select className="input-field flex-1" value={s.company_id} onChange={e => { const ns=[...steps]; ns[i]={...ns[i],company_id:e.target.value}; setSteps(ns) }}>
                  <option value="">取引先を選択</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="input-field w-28" value={s.role} onChange={e => { const ns=[...steps]; ns[i]={...ns[i],role:e.target.value}; setSteps(ns) }}>
                  <option value="buyer">買い手側</option>
                  <option value="middle">中間</option>
                  <option value="seller">売り手側</option>
                </select>
                {steps.length > 2 && <button onClick={() => setSteps(steps.filter((_,j)=>j!==i))} className="text-red-500">✕</button>}
              </div>
            ))}
          </div>
          <button onClick={() => setSteps([...steps,{company_id:'',role:'middle'}])} className="text-sm text-blue-600 mt-2 hover:underline">＋ ステップ追加</button>
          <div className="mt-3 flex gap-2">
            <button onClick={save} className="btn-primary">保存</button>
            <button onClick={cancelForm} className="btn-secondary">キャンセル</button>
          </div>
        </div>
      )}
      {loading ? <div className="text-center py-8 text-gray-500">読み込み中...</div> : (
        <div className="space-y-3">
          {flows.map(f => (
            <div key={f.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-lg">{f.name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {(f.steps as Array<{company_id:string;role:string}>).map((s,i) => (
                      <span key={i}>{i>0?'→2':''}<span className="bg-blue-100 px-1 rounded">{getCompanyName(s.company_id)}</span></span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{(f.doc_sets as unknown[]).length}書類セット</div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => startEdit(f)} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>編集</button>
                  <button onClick={() => del(f.id)} className="text-red-500 hover:text-red-700 text-sm">削除</button>
                </div>
              </div>
            </div>
          ))}
          {flows.length === 0 && <div className="text-center py-8 text-gray-400">商流が登録されていません</div>}
        </div>
      )}
    </div>
  )
}