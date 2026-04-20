'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase, Event } from '@/lib/supabase'
import { ThemeToggle } from '@/components/ThemeToggle'

type PricingMode = 'split' | 'fixed' | 'flexible'

const PRICING_MODES: { value: PricingMode; label: string }[] = [
  { value: 'split', label: 'Split' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'flexible', label: 'Flexible' },
]

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

  const [pricingMode, setPricingMode] = useState<PricingMode>('split')
  const [totalCost, setTotalCost] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [costPerPerson, setCostPerPerson] = useState('')
  const [enablePayID, setEnablePayID] = useState(true)
  const [enableBankTransfer, setEnableBankTransfer] = useState(false)
  const [enableWhatsApp, setEnableWhatsApp] = useState(false)
  const [enableEmail, setEnableEmail] = useState(false)

  const calculatedCostPerPerson =
    pricingMode === 'split' && totalCost && maxParticipants && Number(maxParticipants) > 0
      ? (Number(totalCost) / Number(maxParticipants)).toFixed(2)
      : null

  const calculatedTotal =
    pricingMode === 'fixed' && costPerPerson && maxParticipants && Number(maxParticipants) > 0
      ? (Number(costPerPerson) * Number(maxParticipants)).toFixed(2)
      : null

  const fetchEvent = useCallback(async () => {
    const { data, error } = await supabase.from('events').select('*').eq('code', code).single()
    if (error || !data) { setNotFound(true); setLoading(false); return }

    const { count } = await supabase.from('participants')
      .select('*', { count: 'exact', head: true }).eq('event_id', data.id)

    setEvent(data)
    setPricingMode((data.pricing_mode as PricingMode) ?? 'split')
    setTotalCost(String(data.total_cost))
    setMaxParticipants(String(data.max_participants))
    setCostPerPerson(String(data.cost_per_person))
    setEnablePayID(!!data.payid)
    setEnableBankTransfer(!!data.bsb)
    setEnableWhatsApp(!!data.notify_whatsapp)
    setEnableEmail(!!data.notify_email)
    setParticipantCount(count ?? 0)
    setLoading(false)
  }, [code])

  useEffect(() => { if (!authLoading) fetchEvent() }, [fetchEvent, authLoading])
  useEffect(() => { if (!authLoading && !user) router.push('/auth/login') }, [user, authLoading, router])
  useEffect(() => {
    if (!event || authLoading) return
    if (event.organiser_user_id && user?.id !== event.organiser_user_id) router.push(`/dashboard/${code}`)
  }, [event, user, authLoading, code, router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!event) return
    setError('')

    if (!enablePayID && !enableBankTransfer) {
      setError('Please enable at least one payment method.')
      return
    }

    setSaving(true)
    const form = e.currentTarget
    const data = new FormData(form)

    const name = data.get('name') as string
    const description = data.get('description') as string
    const event_date = data.get('event_date') as string
    const location = (data.get('location') as string) || null
    const start_time = (data.get('start_time') as string) || null
    const duration_minutes = data.get('duration_minutes') ? Number(data.get('duration_minutes')) : null
    const max_participants = Number(data.get('max_participants'))
    const organiser_name = data.get('organiser_name') as string
    const leave_restriction = data.get('leave_restriction') as string
    const payid = enablePayID ? (data.get('payid') as string) || null : null
    const bsb = enableBankTransfer ? (data.get('bsb') as string) || null : null
    const account_number = enableBankTransfer ? (data.get('account_number') as string) || null : null
    const account_name = enableBankTransfer ? (data.get('account_name') as string) || null : null
    const notify_whatsapp_number = enableWhatsApp ? (data.get('notify_whatsapp_number') as string) || null : null
    const notify_email_address = enableEmail ? (data.get('notify_email_address') as string) || null : null

    let total_cost = 0
    let cost_per_person = 0

    if (pricingMode === 'split') {
      total_cost = Number(data.get('total_cost'))
      cost_per_person = max_participants > 0 ? total_cost / max_participants : 0
    } else if (pricingMode === 'fixed') {
      cost_per_person = Number(data.get('cost_per_person'))
      total_cost = cost_per_person * max_participants
    }
    // flexible: keep existing cost_per_person if already confirmed, else 0

    if (max_participants < participantCount) {
      setError(`Can't set max below current participant count (${participantCount}).`)
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase.from('events').update({
      name, description: description || null, event_date: event_date || null,
      location, start_time, duration_minutes,
      total_cost, max_participants, organiser_name, cost_per_person, payid, bsb,
      account_number, account_name, leave_restriction, pricing_mode: pricingMode,
      notify_whatsapp: enableWhatsApp, notify_whatsapp_number,
      notify_email: enableEmail, notify_email_address,
    }).eq('id', event.id)

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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Event not found</h2>
        <Link href="/" className="text-indigo-600 text-sm font-medium hover:underline">Go home</Link>
      </div>
    )
  }

  if (event.status === 'closed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-4xl mb-4">🔒</p>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Event is closed</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Closed events can&apos;t be edited.</p>
        <Link href={`/dashboard/${code}`} className="text-indigo-600 text-sm font-medium hover:underline">Back to dashboard</Link>
      </div>
    )
  }

  const inputClass = 'w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white'

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/${code}`} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">←</Link>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Edit event</h1>
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
                <input id="name" name="name" type="text" required defaultValue={event.name} className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="description">Description</label>
                <textarea id="description" name="description" rows={3} defaultValue={event.description ?? ''} placeholder="Optional"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 dark:text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="event_date">Event date</label>
                <input id="event_date" name="event_date" type="date" defaultValue={event.event_date ?? ''} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="start_time">Start time</label>
                  <input id="start_time" name="start_time" type="time" defaultValue={event.start_time?.slice(0, 5) ?? ''} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="duration_minutes">Duration (mins)</label>
                  <input id="duration_minutes" name="duration_minutes" type="number" min="1" step="1" placeholder="e.g. 90" defaultValue={event.duration_minutes ?? ''} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="location">Location</label>
                <input id="location" name="location" type="text" placeholder="e.g. Leichhardt Oval, Sydney" defaultValue={event.location ?? ''} className={inputClass} />
              </div>

              {/* Pricing mode selector */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pricing mode</p>
                <div className="grid grid-cols-3 gap-2">
                  {PRICING_MODES.map(mode => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setPricingMode(mode.value)}
                      className={`rounded-xl px-3 py-2.5 text-sm font-semibold border transition-colors ${
                        pricingMode === mode.value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Split mode */}
              {pricingMode === 'split' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="total_cost">
                      Total cost ($) <span className="text-red-500">*</span>
                    </label>
                    <input id="total_cost" name="total_cost" type="number" required min="0.01" step="0.01"
                      value={totalCost} onChange={e => setTotalCost(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="max_participants">
                      No. of people <span className="text-red-500">*</span>
                    </label>
                    <input id="max_participants" name="max_participants" type="number" required
                      min={participantCount || 1} step="1"
                      value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} className={inputClass} />
                    {participantCount > 0 && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{participantCount} already joined</p>}
                  </div>
                  {calculatedCostPerPerson && (
                    <div className="col-span-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">New cost per person</span>
                      <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">${calculatedCostPerPerson}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Fixed mode */}
              {pricingMode === 'fixed' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="cost_per_person">
                      Cost per person ($) <span className="text-red-500">*</span>
                    </label>
                    <input id="cost_per_person" name="cost_per_person" type="number" required min="0.01" step="0.01"
                      value={costPerPerson} onChange={e => setCostPerPerson(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="max_participants">
                      Max people <span className="text-red-500">*</span>
                    </label>
                    <input id="max_participants" name="max_participants" type="number" required
                      min={participantCount || 1} step="1"
                      value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} className={inputClass} />
                    {participantCount > 0 && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{participantCount} already joined</p>}
                  </div>
                  {calculatedTotal && (
                    <div className="col-span-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Max total if full</span>
                      <span className="text-lg font-bold text-gray-700 dark:text-gray-200">${calculatedTotal}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Flexible mode */}
              {pricingMode === 'flexible' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="max_participants">
                    Max people <span className="text-red-500">*</span>
                  </label>
                  <input id="max_participants" name="max_participants" type="number" required
                    min={participantCount || 1} step="1"
                    value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} className={inputClass} />
                  {participantCount > 0 && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{participantCount} already joined</p>}
                  {event.cost_per_person > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1.5">Cost confirmed at {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(event.cost_per_person)}/person — update from the dashboard to change it.</p>
                  )}
                </div>
              )}

              <div className="border-t border-gray-100 dark:border-gray-700 pt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Payment methods</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Choose which payment options to offer participants.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="organiser_name">Your display name</label>
                  <input id="organiser_name" name="organiser_name" type="text" defaultValue={event.organiser_name} className={inputClass} />
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
                      <input name="payid" type="text" placeholder="e.g. you@email.com or 0412 345 678"
                        defaultValue={event.payid ?? ''} className={inputClass} />
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
                      <input name="account_name" type="text" placeholder="Account name" defaultValue={event.account_name ?? ''} className={inputClass} />
                      <div className="grid grid-cols-2 gap-3">
                        <input name="bsb" type="text" placeholder="BSB (e.g. 062-000)" defaultValue={event.bsb ?? ''} className={inputClass} />
                        <input name="account_number" type="text" placeholder="Account number" defaultValue={event.account_number ?? ''} className={inputClass} />
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
                        defaultValue={event.notify_whatsapp_number ?? ''}
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
                        defaultValue={event.notify_email_address ?? ''}
                        className={inputClass} />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="leave_restriction">Allow participants to leave</label>
                <select id="leave_restriction" name="leave_restriction" defaultValue={event.leave_restriction}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white">
                  <option value="none">Anytime (no restriction)</option>
                  <option value="1_day">Up to 1 day before the event</option>
                  <option value="3_days">Up to 3 days before the event</option>
                  <option value="7_days">Up to 7 days before the event</option>
                  <option value="never">Never — once joined they can&apos;t leave</option>
                </select>
              </div>

              {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

              <div className="flex gap-3 pt-2">
                <Link href={`/dashboard/${code}`}
                  className="flex-1 text-center border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-semibold rounded-xl py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancel
                </Link>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
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
