'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

function VerifyContent() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'

  return (
    <div className="w-full max-w-sm text-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8">
        <div className="text-4xl mb-4">📧</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Check your email</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          We sent a verification link to your inbox. Click it to activate your account, then come back and log in.
        </p>
        <Link
          href={`/auth/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="block w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-indigo-700 transition-colors text-center"
        >
          Go to login
        </Link>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-indigo-600 tracking-tight">Splitr</Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Suspense>
          <VerifyContent />
        </Suspense>
      </main>
    </div>
  )
}
