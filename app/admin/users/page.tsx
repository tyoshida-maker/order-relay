'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserProfile, Company } from '@/lib/supabase'

const TBL = 'or_user_profiles'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ email: '', password: '', display_name: '', role: 'partner', company_id: '', is_active: true })
  const [msg, setMsg] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => { checkAdminAndLoad() }, [])

  async function checkAdminAndLoad() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: profile } = await supabase.from(TBL).select('*').eq('id', session.user.id).single()
    if (profile?.role !== 'admin') { setLoading(false); return }
    setIsAdmin(true)
    await loadData()
  }

  async function loadData() {
    setLoading(true)
    const [ud, cd] = await Promise.all([
      supabase.from(TBL).select('*').order('created_at'),
      supabase.from('companies').select('*').order('name')
    ])
    setUsers(ud.data || [])
    setCompanies(cd.data || [])
    setLoading(false)
  }

  function startEdit(u: UserProfile) {
    setForm({ email: u.email, password: '', display_name: u.display_name || '', role: u.role, company_id: u.company_id || '', is_active: u.is_active })
    setEditId(u.id)
    setShowForm(true)
    setMsg('')
  }

  function cancelForm() {
    setForm({ email: '', password: '', display_name: '', role: 'partner', company_id: '', is_active: true })
    setEditId(null)
    setShowForm(false)
    setMsg('')
  }

  async function handleSave() {
    setMsg('')
    if (!form.email) return setMsg('メールアドレスは必須です')
    if (editId) {
      const { error } = await supabase.from(TBL).update({
        display_name: form.display_name || null,
        role: form.role,
        company_id: form.company_id || null,
        is_active: form.is_active
      }).eq('id', editId)
      if (error) return setMsg('エラー: ' + error.message)
      setMsg('更新しました')
    } else {
      if (!form.password) return setMsg('新規登録時はパスワードが必須です')
      const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password })
      if (error) return setMsg('エラー: ' + error.message)
      if (data.user) {
        const { error: pe } = await supabase.from(TBL).insert({
          id: data.user.id, email: form.email,
          display_name: form.display_name || null, role: form.role,
          company_id: form.company_id || null, is_active: form.is_active
        })
        if (pe) return setMsg('登録エラー: ' + pe.message)
      }
      setMsg('登録しました。')
    }
    cancelForm()
    loadData()
  }

  async function toggleActive(u: UserProfile) {
    await supabase.from(TBL).update({ is_active: !u.is_active }).eq('id', u.id)
    loadData()
  }

  if (!isAdmin && !loading) return <div className="text-center py-16 text-gray-500">管理者のみアクセスできます</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">⚙️ ユーザー管理</h1>
        <button onClick={() => { cancelForm(); setShowForm(true) }} className="btn-primary">＋ ユーザー追加</button>
      </div>
      <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
        🔑 管理者は全機能利用可。取引先は「発注内容」「配送状況」のみ表示。
      </div>
      {msg && <div className="mb-3 p-2 bg-blue-50 text-blue-700 rounded text-sm">{msg}</div>}
      {showForm && (
        <div className="bg-gray-50 border rounded-lg p-4 mb-4">
          <h2 className="font-semibold mb-3">{editId ? 'ユーザーを編集' : '新規ユーザー登録'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">メールアドレス*</label>
              <input type="email" className="input-field mt-1" value={form.email} onChange={e => setForm({...form, email: e.target.value})} disabled={!!editId} />
            </div>
            {!editId && (
              <div>
                <label className="text-sm text-gray-600">パスワード*</label>
                <input type="password" className="input-field mt-1" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
            )}
            <div>
              <label className="text-sm text-gray-600">表示名</label>
              <input type="text" className="input-field mt-1" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} placeholder="株式会社山田商店 担当者" />
            </div>
            <div>
              <label className="text-sm text-gray-600">権限</label>
              <select className="input-field mt-1" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="admin">管理者 (admin)</option>
                <option value="partner">取引先 (partner)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">担当会社</label>
              <select className="input-field mt-1" value={form.company_id} onChange={e => setForm({...form, company_id: e.target.value})}>
                <option value="">未設定</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
              <label htmlFor="is_active" className="text-sm">アクティブ</label>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleSave} className="btn-primary">保存</button>
            <button onClick={cancelForm} className="btn-secondary">キャンセル</button>
          </div>
        </div>
      )}
      {loading ? <div className="text-center py-8 text-gray-500">読み込み中...</div> : (
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-100">
            <th className="p-2 text-left">メール</th>
            <th className="p-2 text-left">表示名</th>
            <th className="p-2 text-left">権限</th>
            <th className="p-2 text-left">担当会社</th>
            <th className="p-2 text-left">ステータス</th>
            <th className="p-2"></th>
          </tr></thead>
          <tbody>
            {users.map(u => {
              const company = companies.find(c => c.id === u.company_id)
              return (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.display_name || '-'}</td>
                  <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${u.role==='admin'?'bg-purple-100 text-purple-700':'bg-cyan-100 text-cyan-700'}`}>{u.role==='admin'?'管理者':'取引先'}</span></td>
                  <td className="p-2 text-gray-600">{company?.name || '-'}</td>
                  <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${u.is_active?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{u.is_active?'有効':'無効'}</span></td>
                  <td className="p-2 text-right">
                    <button onClick={()=>startEdit(u)} style={{color:'#3b82f6',background:'none',border:'none',cursor:'pointer',marginRight:'0.75rem'}}>編集</button>
                    <button onClick={()=>toggleActive(u)} style={{color:u.is_active?'#ef4444':'#22c55e',background:'none',border:'none',cursor:'pointer'}}>{u.is_active?'無効化':'有効化'}</button>
                  </td>
                </tr>
              )
            })}
            {users.length===0&&<tr><td colSpan={6} className="p-4 text-center text-gray-400">ユーザーが登録されていません</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  )
}