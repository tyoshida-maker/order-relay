'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type FlowRoute = {
  id: string
  name: string
  slug: string
  status: string
  notes: string | null
  created_at: string
  company_count?: number
}

export default function FlowRoutesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [routes, setRoutes] = useState<FlowRoute[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('or_user_profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') { router.push('/login'); return }
      await fetchRoutes()
      setLoading(false)
    }
    init()
  }, [router])

  const fetchRoutes = async () => {
    const { data: routesData } = await supabase
      .from('flow_routes')
      .select('id, name, slug, status, notes, created_at')
      .order('created_at', { ascending: false })

    const enriched: FlowRoute[] = []
    for (const r of routesData || []) {
      const { count } = await supabase
        .from('flow_route_companies')
        .select('*', { count: 'exact', head: true })
        .eq('flow_route_id', r.id)
      enriched.push({ ...r, company_count: count || 0 })
    }
    setRoutes(enriched)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`商流ルート「${name}」を削除しますか？\n紐付くflow_route_companies/usersも削除されます。`)) return
    const { error } = await supabase.from('flow_routes').delete().eq('id', id)
    if (error) {
      alert('削除に失敗: ' + error.message)
      return
    }
    await fetchRoutes()
  }

  if (loading) return <div className="p-8">読み込み中...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">商流ルート管理</h1>
            <p className="text-indigo-100 text-sm mt-1">登録済みの商流ルート一覧</p>
          </div>
          <Link href="/admin" className="bg-white/20 px-4 py-2 rounded-lg text-sm hover:bg-white/30">← 管理者TOPへ</Link>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-800">登録ルート ({routes.length}件)</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + 新規ルート作成
          </button>
        </div>
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-gray-600 text-left">
                <th className="py-3 px-4">ルート名</th>
                <th className="py-3 px-4">slug</th>
                <th className="py-3 px-4 text-center">参加会社</th>
                <th className="py-3 px-4">状態</th>
                <th className="py-3 px-4">作成日</th>
                <th className="py-3 px-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {routes.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">ルートが登録されていません</td></tr>
              ) : routes.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-700">{r.name}</td>
                  <td className="py-3 px-4 text-gray-500 font-mono text-xs">{r.slug}</td>
                  <td className="py-3 px-4 text-center">{r.company_count}社</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {r.status === 'active' ? '稼働中' : r.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString('ja-JP')}</td>
                  <td className="py-3 px-4 text-center">
                    <Link href={`/admin/flow-routes/${r.id}`} className="text-indigo-600 hover:underline mr-3">編集</Link>
                    <button onClick={() => handleDelete(r.id, r.name)} className="text-red-600 hover:underline">削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showCreateModal && <CreateRouteModal onClose={() => setShowCreateModal(false)} onCreated={fetchRoutes} />}
    </div>
  )
}

function CreateRouteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name || !slug) {
      alert('ルート名とslugは必須です')
      return
    }
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('flow_routes').insert({
        name, slug,
        notes: notes || null,
        status: 'active',
        created_by: user?.id,
      }).select().single()
      if (error) {
        alert('作成失敗: ' + error.message)
        setSubmitting(false)
        return
      }
      alert('ルートを作成しました。次の画面で参加会社を登録してください。')
      onCreated()
      onClose()
      window.location.href = `/admin/flow-routes/${data.id}`
    } catch (e: any) {
      alert('エラー: ' + (e.message || 'unknown'))
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-bold mb-4">新規ルート作成</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">ルート名 *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例: 創未家ルート"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">slug（URL用識別子） *</label>
            <input
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="例: soumiya"
              className="w-full border rounded-lg px-3 py-2 font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">英小文字・数字・ハイフンのみ</p>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">メモ</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">キャンセル</button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {submitting ? '作成中...' : '作成'}
          </button>
        </div>
      </div>
    </div>
  )
}
