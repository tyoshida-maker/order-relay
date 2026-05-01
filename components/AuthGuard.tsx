'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// 認証不要のパブリックパス
const PUBLIC_PATH_PREFIXES = ['/login', '/buyer/', '/middle/', '/seller/']

const isPublicPath = (path: string) =>
    PUBLIC_PATH_PREFIXES.some(prefix =>
          path === prefix.replace(/\/$/, '') || path.startsWith(prefix)
                                )

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

  useEffect(() => {
        const check = async () => {
                if (isPublicPath(pathname)) return

                const { data: { session } } = await supabase.auth.getSession()
                if (!session) {
                          window.location.href = '/login'
                }
        }

                check()

                const { data: listener } = supabase.auth.onAuthStateChange((event) => {
                        if (event === 'SIGNED_OUT' && !isPublicPath(pathname)) {
                                  window.location.href = '/login'
                        }
                })

                return () => listener.subscription.unsubscribe()
  }, [pathname])

  return <>{children}</>>
    }</>
