'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

function SettingsContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const justConnected = searchParams.get('stripe_connected') === '1'
  const stripeError = searchParams.get('stripe_error') === '1'

  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setStripeAccountId(data?.stripe_account_id ?? null)
        setProfileLoading(false)
      })
  }, [user])

  async function disconnect() {
    if (!user) return
    setDisconnecting(true)
    await supabase.from('profiles').upsert({ id: user.id, stripe_account_id: null, stripe_connected_at: null })
    setStripeAccountId(null)
    setDisconnecting(false)
  }

  if (authLoading || profileLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400 text-sm">Loading…</div></div>
  }

  if (!user) return null

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-lg leading-none">←</Link>
          <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-lg mx-auto space-y-4">

          {justConnected && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm text-green-700 font-medium">
              Stripe connected successfully. You can now enable card payments on any event.
            </div>
          )}

          {stripeError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600">
              Stripe connection failed. Please try again.
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Card payments (Stripe)</p>

            {stripeAccountId ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                  <p className="text-sm font-semibold text-gray-900">Stripe connected</p>
                </div>
                <p className="text-xs text-gray-400 font-mono">{stripeAccountId}</p>
                <p className="text-xs text-gray-500">Card payments are available on your events. A Stripe payment link is auto-created when you enable it on an event.</p>
                <button
                  onClick={disconnect}
                  disabled={disconnecting}
                  className="text-xs text-red-500 hover:underline disabled:opacity-50"
                >
                  {disconnecting ? 'Disconnecting…' : 'Disconnect Stripe'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Connect your Stripe account to offer card payments on your events. Participants pay by card and money goes directly to you — no manual payment links needed.
                </p>
                <p className="text-xs text-gray-400">Stripe processing fees apply to card payments. PayID and bank transfer remain fee-free.</p>
                <a
                  href={`/api/stripe/connect?user_id=${user.id}`}
                  className="inline-block bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Connect Stripe account
                </a>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}

export default function SettingsPage() {
  return <Suspense><SettingsContent /></Suspense>
}
