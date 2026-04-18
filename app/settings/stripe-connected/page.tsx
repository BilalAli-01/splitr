'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

function StripeConnectedHandler() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const accountId = searchParams.get('account_id')

  useEffect(() => {
    if (loading) return
    if (!user || !accountId) { router.push('/settings'); return }

    supabase.from('profiles').upsert({
      id: user.id,
      stripe_account_id: accountId,
      stripe_connected_at: new Date().toISOString(),
    }).then(() => router.push('/settings?stripe_connected=1'))
  }, [user, loading, accountId, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400 text-sm">Connecting Stripe…</div>
    </div>
  )
}

export default function StripeConnectedPage() {
  return <Suspense><StripeConnectedHandler /></Suspense>
}
