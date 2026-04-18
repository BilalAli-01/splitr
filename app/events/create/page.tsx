'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { generateCode } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function CreateEventPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [totalCost, setTotalCost] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [enablePayID, setEnablePayID] = useState(true)
  const [enableBankTransfer, setEnableBankTransfer] = useState(false)
  const [enableWhatsApp, setEnableWhatsApp] = useState(false)
  const [enableEmail, setEnableEmail] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [user, authLoading, router])

  const costPerPerson =
    totalCost && maxParticipants && Number(maxParticipants) > 0
      ? (Number(totalCost) / Number(maxParticipants)).toFixed(2)
      : null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    setError('')

    if (!enablePayID && !enableBankTransfer) {
      setError('Please enable at least one payment method.')
      return
    }

    setLoading(true)
    const form = e.currentTarget
    const data = new FormData(form)

    const name = data.get('name') as string
    const description = data.get('description') as string
    const event_date = data.get('event_date') as string
    const total_cost = Number(data.get('total_cost'))
    const max_participants = Number(data.get('max_participants'))
    const organiser_name = (data.get('organiser_name') as string).trim() || (user.user_metadata?.name ?? '')
    const leave_restriction = data.get('leave_restriction') as string
    const payid = enablePayID ? (data.get('payid') as string) || null : null
    const bsb = enableBankTransfer ? (data.get('bsb') as string) || null : null
    const account_number = enableBankTransfer ? (data.get('account_number') as string) || null : null
    const account_name = enableBankTransfer ? (data.get('account_name') as string) || null : null
    const notify_whatsapp_number = enableWhatsApp ? (data.get('notify_whatsapp_number') as string) || null : null
    const notify_email_address = enableEmail ? (data.get('notify_email_address') as string) || null : null

    if (max_participants < 1) {
      setError('Max participants must be at least 1.')
      setLoading(false)
      return
    }

    const code = generateCode()

    const { error: insertError } = await supabase.from('events').insert({
      name, description: description || null, event_date: event_date || null,
      total_cost, max_participants, organiser_name, payid, bsb,
      account_number, account_name, code, status: 'active',
      organiser_user_id: user.id, leave_restriction,
      notify_whatsapp: enableWhatsApp, notify_whatsapp_number,
      notify_email: enableEmail, notify_email_address,
    })

    if (insertError) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    router.push(`/dashboard/${code}`)
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400 text-sm">Loading…</div></div>
  }
  if (!user) return null

  const inputClass = 'w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white'

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">←</Link>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Create event</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="name">
                  Event name <span className="text-red-500">*</span>
                </label>
                <input id="name" name="name" type="text" required
                  placeholder="e.g. Wednesday Night Futsal" className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="description">Description</label>
                <textarea id="description" name="description" rows={3}
                  placeholder="Optional — any extra details for your group"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 dark:text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="event_date">Event date</label>
                <input id="event_date" name="event_date" type="date" className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="total_cost">
                    Total cost ($) <span className="text-red-500">*</span>
                  </label>
                  <input id="total_cost" name="total_cost" type="number" required
                    min="0.01" step="0.01" placeholder="0.00"
                    value={totalCost} onChange={e => setTotalCost(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="max_participants">
                    No. of people <span className="text-red-500">*</span>
                  </label>
                  <input id="max_participants" name="max_participants" type="number" required
                    min="1" step="1" placeholder="e.g. 10"
                    value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} className={inputClass} />
                </div>
              </div>

              {costPerPerson && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">Cost per person</span>
                  <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">${costPerPerson}</span>
                </div>
              )}

              <div className="border-t border-gray-100 dark:border-gray-700 pt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Payment methods</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Choose which payment options to offer participants.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="organiser_name">Your display name</label>
                  <input id="organiser_name" name="organiser_name" type="text"
                    placeholder={user.user_metadata?.name ?? 'Your name'}
                    defaultValue={user.user_metadata?.name ?? ''} className={inputClass} />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">Shown to participants so they know who to pay.</p>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <label className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
                    <input type="checkbox" checked={enablePayID} onChange={e => setEnablePayID(e.target.checked)} className="w-4 h-4 rounded accent-indigo-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">PayID</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Instant bank transfer — no fees</p>
                    </div>
                  </label>
                  {enablePayID && (
                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                      <input name="payid" type="text" placeholder="e.g. you@email.com or 0412 345 678" className={inputClass} />
                    </div>
                  )}
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <label className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
                    <input type="checkbox" checked={enableBankTransfer} onChange={e => setEnableBankTransfer(e.target.checked)} className="w-4 h-4 rounded accent-indigo-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Bank transfer</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">BSB + account number — no fees</p>
                    </div>
                  </label>
                  {enableBankTransfer && (
                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-3">
                      <input name="account_name" type="text" placeholder="Account name" className={inputClass} />
                      <div className="grid grid-cols-2 gap-3">
                        <input name="bsb" type="text" placeholder="BSB (e.g. 062-000)" className={inputClass} />
                        <input name="account_number" type="text" placeholder="Account number" className={inputClass} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Payment notifications</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Let participants notify you when they&apos;ve paid.</p>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <label className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
                    <input type="checkbox" checked={enableWhatsApp} onChange={e => setEnableWhatsApp(e.target.checked)} className="w-4 h-4 rounded accent-indigo-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">WhatsApp</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Participants tap to open WhatsApp with a pre-filled message</p>
                    </div>
                  </label>
                  {enableWhatsApp && (
                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                      <input name="notify_whatsapp_number" type="text"
                        placeholder="e.g. 61412345678 (international format, no +)"
                        className={inputClass} />
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">Use country code without + — e.g. 61 for Australia</p>
                    </div>
                  )}
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <label className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
                    <input type="checkbox" checked={enableEmail} onChange={e => setEnableEmail(e.target.checked)} className="w-4 h-4 rounded accent-indigo-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Email</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Participants tap to open their email app with a pre-filled message</p>
                    </div>
                  </label>
                  {enableEmail && (
                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                      <input name="notify_email_address" type="email"
                        placeholder="your@email.com"
                        className={inputClass} />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="leave_restriction">
                  Allow participants to leave
                </label>
                <select id="leave_restriction" name="leave_restriction" defaultValue="none"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white">
                  <option value="none">Anytime (no restriction)</option>
                  <option value="1_day">Up to 1 day before the event</option>
                  <option value="3_days">Up to 3 days before the event</option>
                  <option value="7_days">Up to 7 days before the event</option>
                  <option value="never">Never — once joined they can&apos;t leave</option>
                </select>
              </div>

              {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

              <button type="submit" disabled={loading}
                className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Creating event…' : 'Create event'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
