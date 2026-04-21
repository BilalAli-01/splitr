'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-indigo-600 tracking-tight">Splitr</Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Forgot your password?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Email us at{' '}
                  <a href="mailto:app.splitr@gmail.com" className="text-indigo-600 font-medium hover:underline">
                    app.splitr@gmail.com
                  </a>{' '}
                  and we&apos;ll reset it for you within 24 hours.
                </p>
                <Link href="/auth/login" className="text-indigo-600 font-medium hover:underline text-sm">Back to login</Link>
              </>
          </div>
        </div>
      </main>
    </div>
  )
}
