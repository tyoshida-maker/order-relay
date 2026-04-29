'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
        const router = useRouter()

  useEffect(() => {
            const redirect = async () => {
                        const { data: { user } } = await supabase.auth.getUser()
                        if (!user) {
                                      router.push('/login')
                                      return
                        }
                        const { data: profile } = await supabase
                          .from('or_user_profiles')
                          .select('role')
                          .eq('user_id', user.id)
                          .single()

                        const role = profile?.role || 'orderer'

                        if (role === 'admin') {
                                      router.push('/admin')
                        } else if (role === 'intermediary') {
                                      router.push('/dashboard/intermediary')
                        } else if (role === 'shipper') {
                                      router.push('/dashboard/shipper')
                        } else {
                                      router.push('/dashboard/orderer')
                        }
            }
            redirect()
  }, [router])

  return (
            <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>div>
                          <p className="text-gray-500">読み込み中…</p>p>
                  </div>div>
            </div>div>
          )
}</div>
