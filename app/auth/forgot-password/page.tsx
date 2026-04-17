'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const email = (new FormData(e.currentTarget)).get('email') as string

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <Link href="/" className="text-2xl font-bold text-indigo-600 tracking-tight">Splitr</Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            {sent ? (
              <div className="text-center">
                <div className="text-4xl mb-4">📧</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h2>
                <p className="text-sm text-gray-500 mb-6">
                  We sent a password reset link to your inbox. Click it to set a new password.
                </p>
                <Link
                  href="/auth/login"
                  className="block w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-indigo-700 transition-colors text-center"
                >
                  Back to login
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Reset password</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Enter your email and we&apos;ll send you a reset link.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">Email</label>
                    <input
                      id="email" name="email" type="email" required
                      placeholder="you@example.com"
                      autoFocus
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
                  )}

                  <button
                    type="submit" disabled={loading}
                    className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-5">
                  <Link href="/auth/login" className="text-indigo-600 font-medium hover:underline">Back to login</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
