'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('or_user_profiles').select('role')
        .eq('id', user.id).single()
      if (profile?.role !== 'admin') { router.push('/login'); return }
      setUserEmail(user.email || '')
      setLoading(false)
    }
    checkAdmin()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">Order Relay</span>
          <span className="text-sm bg-blue-500 px-2 py-1 rounded">管理者</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="text-sm bg-blue-600 hover:bg-blue-800 px-3 py-1 rounded"
          >
            ログアウト
          </button>
        </div>
      </header>
      <div className="flex">
        <aside className="w-56 bg-white shadow-sm min-h-screen p-4">
          <nav className="space-y-1">
            <div className="px-3 py-2 rounded bg-blue-50 text-blue-700 font-medium text-sm">
              ダッシュボード
            </div>
            <div className="px-3 py-2 rounded hover:bg-gray-100 text-gray-700 text-sm cursor-pointer">
              商流ルート管理
            </div>
            <div className="px-3 py-2 rounded hover:bg-gray-100 text-gray-700 text-sm cursor-pointer">
              会社管理
            </div>
            <div className="px-3 py-2 rounded hover:bg-gray-100 text-gray-700 text-sm cursor-pointer">
              ユーザー管理
            </div>
            <div className="px-3 py-2 rounded hover:bg-gray-100 text-gray-700 text-sm cursor-pointer">
              商品マスタ
            </div>
            <div className="px-3 py-2 rounded hover:bg-gray-100 text-gray-700 text-sm cursor-pointer">
              発注管理
            </div>
            <div className="px-3 py-2 rounded hover:bg-gray-100 text-gray-700 text-sm cursor-pointer">
              納品管理
            </div>
            <div className="px-3 py-2 rounded hover:bg-gray-100 text-gray-700 text-sm cursor-pointer">
              設定
            </div>
          </nav>
        </aside>
        <main className="flex-1 p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">管理者ダッシュボード</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">商流ルート数</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">-</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">登録会社数</p>
              <p className="text-3xl font-bold text-green-600 mt-1">-</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">ユーザー数</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">-</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">今月の発注数</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">-</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">システム概要</h2>
            <p className="text-gray-500 text-sm">
              SYC管理者画面へようこそ。左メニューから各管理機能にアクセスできます。
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
