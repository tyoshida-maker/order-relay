'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Context = {
  flow_route_id: string
  flow_route_name: string
  company_id: string
  company_name: string
  role: string
  step_order: number
}

export default function CompanyPortalPage() {
  const router = useRouter()
  const params = useParams()
  const role = params.role as string
  const slug = params.slug as string

  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState<Context | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validRoles = ['buyer', 'middle', 'seller']

  useEffect(() => {
    const init = async () => {
      // role の妥当性チェック
      if (!validRoles.includes(role)) {
        setError('無効なURLです')
        setLoading(false)
        return
      }

      // flow_route_companies から該当レコードを取得
      const { data: rc, error: rcError } = await supabase
        .from('flow_route_companies')
        .select(`
          flow_route_id,
          company_id,
          role,
          step_order,
          flow_routes ( name ),
          companies ( name )
        `)
        .eq('role', role)
        .eq('company_slug', slug)
        .maybeSingle()

      if (rcError || !rc) {
        setError('このURLは登録されていません')
        setLoading(false)
        return
      }

      const ctx: Context = {
        flow_route_id: rc.flow_route_id,
        flow_route_name: (rc.flow_routes as any)?.name || '-',
        company_id: rc.company_id,
        company_name: (rc.companies as any)?.name || '-',
        role: rc.role,
        step_order: rc.step_order,
      }

      setContext(ctx)

      // 認証済みなら適切なダッシュボードへ自動遷移
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const dashPath = role === 'buyer' ? '/dashboard/orderer'
          : role === 'middle' ? '/dashboard/intermediary'
          : '/dashboard/shipper'
        router.push(dashPath)
        return
      }

      setLoading(false)
    }

    init()
  }, [role, slug, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (error || !context) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {error || 'URLが無効です'}
          </h1>
          <p className="text-gray-600 mb-6">
            このURL（/{role}/{slug}）は登録されていないか、削除されています。
          </p>
          <p className="text-sm text-gray-500">
            管理者から正しいURLを受け取ってください。
          </p>
        </div>
      </div>
    )
  }

  const roleColor = role === 'buyer' ? 'from-blue-600 to-cyan-600'
    : role === 'middle' ? 'from-emerald-600 to-teal-600'
    : 'from-orange-600 to-red-600'

  const roleLabel = role === 'buyer' ? '発注者'
    : role === 'middle' ? '中間者'
    : '発送者'

  const roleIcon = role === 'buyer' ? '📦'
    : role === 'middle' ? '🔄'
    : '🚚'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`bg-gradient-to-r ${roleColor} text-white px-8 py-16`}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-5xl mb-4">{roleIcon}</div>
          <h1 className="text-3xl font-bold">{context.company_name}</h1>
          <p className="mt-2 opacity-90 text-lg">専用ポータル</p>
          <p className="mt-1 opacity-75 text-sm">
            {context.flow_route_name}（{roleLabel}）
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto -mt-8 px-6 pb-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-2">ログイン</h2>
          <p className="text-sm text-gray-600 mb-6">
            この画面は <strong>{context.company_name}</strong>（{roleLabel}）専用です。<br />
            ログイン情報は管理者からメールで受け取った内容を入力してください。
          </p>

          <button
            onClick={() => router.push('/login?redirect=' + encodeURIComponent(`/${role}/${slug}`))}
            className={`w-full bg-gradient-to-r ${roleColor} text-white py-3 rounded-lg font-medium hover:opacity-90 transition`}
          >
            ログイン画面へ
          </button>

          <div className="mt-6 pt-6 border-t text-xs text-gray-500 space-y-1">
            <p><strong>商流ルート:</strong> {context.flow_route_name}</p>
            <p><strong>あなたの役割:</strong> {roleLabel}（ステップ {context.step_order + 1}）</p>
            <p className="font-mono mt-2 break-all">URL: /{role}/{slug}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
