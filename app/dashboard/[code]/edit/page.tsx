'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase, Event } from '@/lib/supabase'

export default function EditEventPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [participantCount, setParticipantCount] = useState(0)

  const [totalCost, setTotalCost] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [enablePayID, setEnablePayID] = useState(true)
  const [enableBankTransfer, setEnableBankTransfer] = useState(false)
  const [enableStripe, setEnableStripe] = useState(false)

  const costPerPerson =
    totalCost && maxParticipants && Number(maxParticipants) > 0
      ? (Number(totalCost) / Number(maxParticipants)).toFixed(2)
      : null

  const fetchEvent = useCallback(async () => {
    const { data, error } = await supabase
      .from('events').select('*').eq('code', code).single()

    if (error || !data) {
      setNotFound(true)
      setLoading(false)
      return
    }

    const { count } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', data.id)

    setEvent(data)
    setTotalCost(String(data.total_cost))
    setMaxParticipants(String(data.max_participants))
    setEnablePayID(!!data.payid)
    setEnableBankTransfer(!!data.bsb)
    setEnableStripe(!!data.stripe_link)
    setParticipantCount(count ?? 0)
    setLoading(false)
  }, [code])

  useEffect(() => {
    if (!authLoading) fetchEvent()
  }, [fetchEvent, authLoading])

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!event || authLoading) return
    if (event.organiser_user_id && user?.id !== event.organiser_user_id) {
      router.push(`/dashboard/${code}`)
    }
  }, [event, user, authLoading, code, router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!event) return
    setError('')

    if (!enablePayID && !enableBankTransfer && !enableStripe) {
      setError('Please enable at least one payment method.')
      return
    }

    setSaving(true)
    const form = e.currentTarget
    const data = new FormData(form)

    const name = data.get('name') as string
    const description = data.get('description') as string
    const event_date = data.get('event_date') as string
    const total_cost = Number(data.get('total_cost'))
    const max_participants = Number(data.get('max_participants'))
    const organiser_name = data.get('organiser_name') as string
    const leave_restriction = data.get('leave_restriction') as string

    const payid = enablePayID ? (data.get('payid') as string) || null : null
    const bsb = enableBankTransfer ? (data.get('bsb') as string) || null : null
    const account_number = enableBankTransfer ? (data.get('account_number') as string) || null : null
    const account_name = enableBankTransfer ? (data.get('account_name') as string) || null : null
    const stripe_link = enableStripe ? (data.get('stripe_link') as string) || null : null

    if (max_participants < participantCount) {
      setError(`Can't set max below current participant count (${participantCount}).`)
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('events')
      .update({
        name,
        description: description || null,
        event_date: event_date || null,
        total_cost,
        max_participants,
        organiser_name,
        payid,
        bsb,
        account_number,
        account_name,
        stripe_link,
        leave_restriction,
      })
      .eq('id', event.id)

    if (updateError) {
      setError('Something went wrong. Please try again.')
      setSaving(false)
      return
    }

    router.push(`/dashboard/${code}`)
  }

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400 text-sm">Loading…</div></div>
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-4xl mb-4">🤔</p>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Event not found</h2>
        <Link href="/" className="text-indigo-600 text-sm font-medium hover:underline">Go home</Link>
      </div>
    )
  }

  if (event.status === 'closed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-4xl mb-4">🔒</p>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Event is closed</h2>
        <p className="text-sm text-gray-500 mb-6">Closed events can&apos;t be edited.</p>
        <Link href={`/dashboard/${code}`} className="text-indigo-600 text-sm font-medium hover:underline">Back to dashboard</Link>
      </div>
    )
  }

  const inputClass = 'w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href={`/dashboard/${code}`} className="text-gray-400 hover:text-gray-600 text-lg leading-none">←</Link>
          <h1 className="text-lg font-semibold text-gray-900">Edit event</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="name">
                  Event name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name" name="name" type="text" required
                  defaultValue={event.name}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description" name="description" rows={3}
                  defaultValue={event.description ?? ''}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="event_date">
                  Event date
                </label>
                <input
                  id="event_date" name="event_date" type="date"
                  defaultValue={event.event_date ?? ''}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="total_cost">
                    Total cost ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="total_cost" name="total_cost" type="number" required
                    min="0.01" step="0.01"
                    value={totalCost} onChange={e => setTotalCost(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="max_participants">
                    No. of people <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="max_participants" name="max_participants" type="number" required
                    min={participantCount || 1} step="1"
                    value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)}
                    className={inputClass}
                  />
                  {participantCount > 0 && (
                    <p className="text-xs text-gray-400 mt-1">{participantCount} already joined</p>
                  )}
                </div>
              </div>

              {costPerPerson && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-indigo-700 font-medium">New cost per person</span>
                  <span className="text-lg font-bold text-indigo-700">${costPerPerson}</span>
                </div>
              )}

              <div className="border-t border-gray-100 pt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Payment methods</p>
                  <p className="text-xs text-gray-500 mt-1">Choose which payment options to offer participants.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="organiser_name">
                    Your display name
                  </label>
                  <input
                    id="organiser_name" name="organiser_name" type="text"
                    defaultValue={event.organiser_name}
                    className={inputClass}
                  />
                </div>

                {/* PayID */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <label className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
                    <input
                      type="checkbox" checked={enablePayID}
                      onChange={e => setEnablePayID(e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">PayID</p>
                      <p className="text-xs text-gray-500">Instant bank transfer — no fees</p>
                    </div>
                  </label>
                  {enablePayID && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                      <input
                        name="payid" type="text"
                        placeholder="e.g. you@email.com or 0412 345 678"
                        defaultValue={event.payid ?? ''}
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>

                {/* Bank Transfer */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <label className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
                    <input
                      type="checkbox" checked={enableBankTransfer}
                      onChange={e => setEnableBankTransfer(e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Bank transfer</p>
                      <p className="text-xs text-gray-500">BSB + account number — no fees</p>
                    </div>
                  </label>
                  {enableBankTransfer && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                      <input
                        name="account_name" type="text" placeholder="Account name"
                        defaultValue={event.account_name ?? ''}
                        className={inputClass}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          name="bsb" type="text" placeholder="BSB (e.g. 062-000)"
                          defaultValue={event.bsb ?? ''}
                          className={inputClass}
                        />
                        <input
                          name="account_number" type="text" placeholder="Account number"
                          defaultValue={event.account_number ?? ''}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Stripe */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <label className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
                    <input
                      type="checkbox" checked={enableStripe}
                      onChange={e => setEnableStripe(e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Card payment (Stripe)</p>
                      <p className="text-xs text-gray-500">Pay by card — Stripe fees apply</p>
                    </div>
                  </label>
                  {enableStripe && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                      <input
                        name="stripe_link" type="url"
                        placeholder="https://buy.stripe.com/..."
                        defaultValue={event.stripe_link ?? ''}
                        className={inputClass}
                      />
                      <p className="text-xs text-gray-400 mt-1.5">Create a payment link in your Stripe dashboard and paste it here.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="leave_restriction">
                  Allow participants to leave
                </label>
                <select
                  id="leave_restriction" name="leave_restriction"
                  defaultValue={event.leave_restriction}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="none">Anytime (no restriction)</option>
                  <option value="1_day">Up to 1 day before the event</option>
                  <option value="3_days">Up to 3 days before the event</option>
                  <option value="7_days">Up to 7 days before the event</option>
                  <option value="never">Never — once joined they can&apos;t leave</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <Link
                  href={`/dashboard/${code}`}
                  className="flex-1 text-center border border-gray-300 text-gray-600 text-sm font-semibold rounded-xl py-3 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
