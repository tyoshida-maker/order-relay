'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/lib/supabase'

export default function NavBar() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  if (pathname === '/login') return null

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const { data } = await supabase
        .from('or_user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      setProfile(data)
      setLoading(false)
    }
    loadProfile()
    const { data: listener } = supabase.auth.onAuthStateChange(() => { loadProfile() })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <nav className="bg-blue-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-14 gap-1 flex-wrap">
          <Link href="/" className="font-bold text-lg mr-6 hover:text-blue-200">📦 Order Relay</Link>

          {isAdmin && (
            <>
              <Link href="/companies" className="px-3 py-1 rounded hover:bg-blue-600 text-sm">取引先</Link>
              <Link href="/products" className="px-3 py-1 rounded hover:bg-blue-600 text-sm">商品</Link>
              <Link href="/prices" className="px-3 py-1 rounded hover:bg-blue-600 text-sm">価格</Link>
              <Link href="/flows" className="px-3 py-1 rounded hover:bg-blue-600 text-sm">商流</Link>
              <Link href="/templates" className="px-3 py-1 rounded hover:bg-blue-600 text-sm">テンプレ</Link>
              <Link href="/tracking" className="px-3 py-1 rounded hover:bg-blue-600 text-sm bg-blue-500">🚚 配送追跡</Link>
              <Link href="/admin/users" className="px-3 py-1 rounded hover:bg-blue-600 text-sm bg-purple-600">⚙️ ユーザー管理</Link>
              <Link href="/orders" className="px-3 py-1 rounded hover:bg-blue-600 text-sm bg-blue-600 border border-blue-400">📋 発注一覧</Link>
              <Link href="/orders/new" className="ml-2 bg-orange-500 hover:bg-orange-400 px-4 py-1.5 rounded-lg font-medium text-sm">+発注</Link>
            </>
          )}

          {!isAdmin && !loading && profile && (
            <>
              <Link href="/partner/orders" className="px-3 py-1 rounded hover:bg-blue-600 text-sm">発注内容</Link>
              <Link href="/partner/tracking" className="px-3 py-1 rounded hover:bg-blue-600 text-sm bg-blue-500">🚚 配送状況</Link>
            </>
          )}

          <div className="ml-auto flex items-center gap-3">
            {!loading && profile && (
              <span className="text-sm text-blue-200">
                {profile.display_name || profile.email}
                <span className="ml-1 px-1.5 py-0.5 rounded text-xs" style={{ background: isAdmin ? '#7c3aed' : '#0891b2' }}>
                  {isAdmin ? '管理者' : '取引先'}
                </span>
              </span>
            )}
            {!loading && profile && (
              <button onClick={handleLogout} className="px-3 py-1 rounded text-sm hover:bg-blue-600 text-blue-200">
                ログアウト
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
