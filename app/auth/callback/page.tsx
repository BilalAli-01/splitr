'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        subscription.unsubscribe()
        router.push('/auth/update-password')
      } else if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        router.push('/')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Verifying your email…</p>
    </div>
  )
}
