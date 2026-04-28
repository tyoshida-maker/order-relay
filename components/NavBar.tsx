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
          <Link href="/" className="font-bold text-lg mr-6 hover:text-blue-200">\ud83d\udce6 Order Relay</Link>

          {isAdmin && (
            <>
              <Link href="/companies" className="px-3 py-1 rounded hover:bg-blue-600 text-sm">\u53d6\u5f15\u5148</Link>
              <Link href="/products" className="px-3 py-1 rounded hover:bg-blue-600 text-sm">\u5546\u54c1</Link>
              <Link href="/prices" className="px-3 py-1 rounded hover:bg-blue-600 text-sm">\u4fa1\u683c</Link>
              <Link href="/flows" className="px-3 py-1 rounded hover:bg-blue-600 text-sm">\u5546\u6d41</Link>
              <Link href="/templates" className="px-3 py-1 rounded hover:bg-blue-600 text-sm">\u30c6\u30f3\u30d7\u30ec</Link>
              <Link href="/tracking" className="px-3 py-1 rounded hover:bg-blue-600 text-sm bg-blue-500">\ud83d\ude9a \u914d\u9001\u8ffd\u8de1</Link>
              <Link href="/admin/users" className="px-3 py-1 rounded hover:bg-blue-600 text-sm bg-purple-600">\u2699\ufe0f \u30e6\u30fc\u30b6\u30fc\u7ba1\u7406</Link>
              <Link href="/orders" className="px-3 py-1 rounded hover:bg-blue-600 text-sm bg-blue-600 border border-blue-400">\ud83d\udccb \u767a\u6ce8\u4e00\u89a7</Link>
              <Link href="/orders/new" className="ml-2 bg-orange-500 hover:bg-orange-400 px-4 py-1.5 rounded-lg font-medium text-sm">+\u767a\u6ce8</Link>
            </>
          )}

          {!isAdmin && !loading && profile && (
            <>
              <Link href="/partner/orders" className="px-3 py-1 rounded hover:bg-blue-600 text-sm">\u767a\u6ce8\u5185\u5bb9</Link>
              <Link href="/partner/tracking" className="px-3 py-1 rounded hover:bg-blue-600 text-sm bg-blue-500">\ud83d\ude9a \u914d\u9001\u72b6\u6cc1</Link>
            </>
          )}

          <div className="ml-auto flex items-center gap-3">
            {!loading && profile && (
              <span className="text-sm text-blue-200">
                {profile.display_name || profile.email}
                <span className="ml-1 px-1.5 py-0.5 rounded text-xs" style={{ background: isAdmin ? '#7c3aed' : '#0891b2' }}>
                  {isAdmin ? '\u7ba1\u7406\u8005' : '\u53d6\u5f15\u5148'}
                </span>
              </span>
            )}
            {!loading && profile && (
              <button onClick={handleLogout} className="px-3 py-1 rounded text-sm hover:bg-blue-600 text-blue-200">
                \u30ed\u30b0\u30a2\u30a6\u30c8
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
