'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const check = async () => {
      if (pathname === '/login') { setChecked(true); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/login'
        return
      }
      setChecked(true)
    }
    check()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && pathname !== '/login') {
        window.location.href = '/login'
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [pathname])

  if (!checked && pathname !== '/login') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
          <div>認証中...</div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
