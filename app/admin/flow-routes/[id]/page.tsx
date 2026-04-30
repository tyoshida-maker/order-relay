'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Company = { id: string; name: string }

type RouteCompany = {
  id: string
  company_id: string
  role: string
  step_order: number
  company_slug: string
  approver_email: string | null
  company_name?: string
}

export default function FlowRouteEditPage() {
  const router = useRouter()
  const params = useParams()
  const routeId = params.id as string

  const [loading, setLoading] = useState(true)
  const [routeName, setRouteName] = useState('')
  const [routeSlug, setRouteSlug] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [routeCompanies, setRouteCompanies] = useState<RouteCompany[]>([])
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('or_user_profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') { router.push('/login'); return }
      await fetchAll()
      setLoading(false)
    }
    init()
  }, [router, routeId])

  const fetchAll = async () => {
    const { data: route } = await supabase
      .from('flow_routes').select('name, slug').eq('id', routeId).single()
    if (route) {
      setRouteName(route.name)
      setRouteSlug(route.slug)
    }

    const { data: allCompanies } = await supabase
      .from('companies').select('id, name').order('name')
    setCompanies(allCompanies || [])

    const { data: rcs } = await supabase
      .from('flow_route_companies')
      .select('id, company_id, role, step_order, company_slug, approver_email, companies(name)')
      .eq('flow_route_id', routeId)
      .order('step_order')

    const enriched: RouteCompany[] = (rcs || []).map((r: any) => ({
      id: r.id,
      company_id: r.company_id,
      role: r.role,
      step_order: r.step_order,
      company_slug: r.company_slug,
      approver_email: r.approver_email,
      company_name: r.companies?.name || '',
    }))
    setRouteCompanies(enriched)
  }

  const handleRemove = async (id: string) => {
    if (!confirm('このステップを削除しますか？')) return
    await supabase.from('flow_route_companies').delete().eq('id', id)
    await fetchAll()
  }

  const handleUpdateEmail = async (id: string, email: string) => {
    await supabase.from('flow_route_companies').update({ approver_email: email }).eq('id', id)
    await fetchAll()
  }

  if (loading) return <div className="p-8">読み込み中...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{routeName}</h1>
            <p className="text-indigo-100 text-sm mt-1 font-mono">slug: {routeSlug}</p>
          </div>
          <Link href="/admin/flow-routes" className="bg-white/20 px-4 py-2 rounded-lg text-sm hover:bg-white/30">← 一覧へ</Link>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-800">商流ステップ ({routeCompanies.length}社)</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + ステップ追加
          </button>
        </div>
        <div className="space-y-3">
          {routeCompanies.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
              ステップが未登録です。「ステップ追加」から会社を追加してください。
            </div>
          ) : routeCompanies.map(rc => (
            <div key={rc.id} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
              <div className="bg-indigo-100 text-indigo-700 font-bold rounded-full w-10 h-10 flex items-center justify-center">
                {rc.step_order + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{rc.company_name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    rc.role === 'buyer' ? 'bg-blue-100 text-blue-700' :
                    rc.role === 'middle' ? 'bg-amber-100 text-amber-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {rc.role === 'buyer' ? '発注者' : rc.role === 'middle' ? '中間者' : '発送者'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1 font-mono">slug: {rc.company_slug}</div>
                <div className="mt-2 flex gap-2 items-center">
                  <label className="text-xs text-gray-600">承認者メール:</label>
                  <input
                    type="email"
                    defaultValue={rc.approver_email || ''}
                    onBlur={e => handleUpdateEmail(rc.id, e.target.value)}
                    placeholder="email@example.com"
                    className="text-xs border rounded px-2 py-1 w-64"
                  />
                </div>
              </div>
              <button onClick={() => handleRemove(rc.id)} className="text-red-600 hover:underline text-sm">削除</button>
            </div>
          ))}
        </div>
      </div>
      {showAddModal && (
        <AddStepModal
          routeId={routeId}
          companies={companies}
          existingStepOrders={routeCompanies.map(r => r.step_order)}
          onClose={() => setShowAddModal(false)}
          onAdded={fetchAll}
        />
      )}
    </div>
  )
}

function AddStepModal({ routeId, companies, existingStepOrders, onClose, onAdded }: {
  routeId: string; companies: Company[]; existingStepOrders: number[]
  onClose: () => void; onAdded: () => void
}) {
  const [companyId, setCompanyId] = useState('')
  const [role, setRole] = useState<'buyer' | 'middle' | 'seller'>('middle')
  const [stepOrder, setStepOrder] = useState(0)
  const [companySlug, setCompanySlug] = useState('')
  const [approverEmail, setApproverEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let next = 0
    while (existingStepOrders.includes(next)) next++
    setStepOrder(next)
  }, [existingStepOrders])

  useEffect(() => {
    if (companyId) {
      setCompanySlug(`${role}-${companyId.slice(0, 8)}`)
    }
  }, [companyId, role])

  const handleSubmit = async () => {
    if (!companyId || !companySlug) {
      alert('会社とslugは必須です')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('flow_route_companies').insert({
        flow_route_id: routeId,
        company_id: companyId,
        role,
        step_order: stepOrder,
        company_slug: companySlug,
        approver_email: approverEmail || null,
      })
      if (error) {
        alert('追加失敗: ' + error.message)
        setSubmitting(false)
        return
      }
      onAdded()
      onClose()
    } catch (e: any) {
      alert('エラー: ' + (e.message || 'unknown'))
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-bold mb-4">ステップ追加</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">会社 *</label>
            <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="">選択してください</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">役割 *</label>
            <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full border rounded-lg px-3 py-2">
              <option value="buyer">発注者 (buyer)</option>
              <option value="middle">中間者 (middle)</option>
              <option value="seller">発送者 (seller)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">ステップ順序</label>
            <input type="number" value={stepOrder} onChange={e => setStepOrder(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2" min="0" />
            <p className="text-xs text-gray-500 mt-1">0から開始</p>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">会社slug *</label>
            <input value={companySlug} onChange={e => setCompanySlug(e.target.value)} className="w-full border rounded-lg px-3 py-2 font-mono" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">承認者メール</label>
            <input type="email" value={approverEmail} onChange={e => setApproverEmail(e.target.value)} placeholder="approver@example.com" className="w-full border rounded-lg px-3 py-2" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">キャンセル</button>
          <button onClick={handleSubmit} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50">
            {submitting ? '追加中...' : '追加'}
          </button>
        </div>
      </div>
    </div>
  )
}
