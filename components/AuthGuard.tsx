'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// 認証不要のパブリックパス
const PUBLIC_PATHS = ['/login']
const isPublicPath = (path: string) =>
  PUBLIC_PATHS.includes(path) ||
  /^/(buyer|middle|seller)\//.test(path)

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const check = async () => {
      if (isPublicPath(pathname)) { setChecked(true); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/login'
        return
      }
      setChecked(true)
    }
    check()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && !isPublicPath(pathname)) {
        window.location.href = '/login'
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [pathname])

  if (!checked) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
      <div style={{ textAlign: 'center', color: '#6b7280' }}>読み込み中...</div>
    </div>
  )

  return <>{children}</>
}
