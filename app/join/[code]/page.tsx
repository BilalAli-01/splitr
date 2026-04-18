'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase, Event, Participant } from '@/lib/supabase'
import { formatCurrency, formatDate, canLeave, LEAVE_RESTRICTION_LABELS } from '@/lib/utils'

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [event, setEvent] = useState<Event | null>(null)
  const [myParticipants, setMyParticipants] = useState<Participant[]>([])
  const [allParticipants, setAllParticipants] = useState<Pick<Participant, 'id' | 'name'>[]>([])
  const [participantCount, setParticipantCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)

  // Join form state
  const [names, setNames] = useState<string[]>([''])
  const [nameError, setNameError] = useState('')
  const [joining, setJoining] = useState(false)
  const [justJoined, setJustJoined] = useState(false)

  // Leave state
  const [confirmLeave, setConfirmLeave] = useState<string | null>(null)
  const [leaving, setLeaving] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const { data: eventData, error } = await supabase
      .from('events').select('*').eq('code', code).single()

    if (error || !eventData) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setEvent(eventData)

    const [{ data: allData }, { data: myData }] = await Promise.all([
      supabase.from('participants').select('id, name').eq('event_id', eventData.id).order('created_at', { ascending: true }),
      user
        ? supabase.from('participants').select('*').eq('event_id', eventData.id).eq('user_id', user.id)
        : Promise.resolve({ data: [] }),
    ])

    setAllParticipants(allData ?? [])
    setParticipantCount(allData?.length ?? 0)
    setMyParticipants(myData ?? [])
    setLoading(false)
  }, [code, user])

  useEffect(() => {
    if (!authLoading) fetchData()
  }, [fetchData, authLoading])

  useEffect(() => {
    if (!authLoading && !user) router.push(`/auth/login?next=/join/${code}`)
  }, [user, authLoading, router, code])

  async function handleJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!event || !user) return
    setNameError('')

    const trimmed = names.map(n => n.trim()).filter(Boolean)
    if (trimmed.length === 0) {
      setNameError('Please enter at least one name.')
      return
    }

    const spotsLeft = event.max_participants - participantCount
    if (trimmed.length > spotsLeft) {
      setNameError(`Only ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} remaining.`)
      return
    }

    setJoining(true)

    const rows = trimmed.map(name => ({ event_id: event.id, name, paid: false, user_id: user.id }))
    const { data, error } = await supabase.from('participants').insert(rows).select()

    if (error || !data) {
      setNameError('Something went wrong. Try again.')
      setJoining(false)
      return
    }

    setMyParticipants(prev => [...prev, ...data])
    setAllParticipants(prev => [...prev, ...data.map(p => ({ id: p.id, name: p.name }))])
    setParticipantCount(prev => prev + data.length)
    setJustJoined(true)
    setJoining(false)
  }

  async function leaveEvent(participant: Participant) {
    setLeaving(participant.id)
    await supabase.from('participants').delete().eq('id', participant.id)
    setMyParticipants(prev => prev.filter(p => p.id !== participant.id))
    setAllParticipants(prev => prev.filter(p => p.id !== participant.id))
    setParticipantCount(prev => prev - 1)
    setConfirmLeave(null)
    setLeaving(null)
  }

  function copyPayID() {
    if (!event?.payid) return
    navigator.clipboard.writeText(event.payid)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400 text-sm">Loading…</div></div>
  }

  if (!user) return null

  const isAdmin = user.user_metadata?.is_admin === true

  if (notFound || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-4xl mb-4">🤔</p>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Event not found</h2>
        <p className="text-gray-500 text-sm mb-6">Check the link and try again.</p>
        <Link href="/" className="text-indigo-600 text-sm font-medium hover:underline">Go home</Link>
      </div>
    )
  }

  const isClosed = event.status === 'closed'
  const isFull = participantCount >= event.max_participants && myParticipants.length === 0
  const alreadyJoined = myParticipants.length > 0
  const leaveCheck = canLeave(event.leave_restriction, event.event_date)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-indigo-600 tracking-tight">Splitr</Link>
          <span className="text-xs text-gray-400">{user.user_metadata?.name}</span>
        </div>
        {isAdmin && (
          <div className="max-w-lg mx-auto mt-2 flex items-center gap-1 text-xs">
            <span className="text-gray-400 mr-1">View as:</span>
            <Link href="/admin" className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">Admin</Link>
            <Link href={`/dashboard/${code}`} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">Organiser</Link>
            <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white font-semibold">Participant</span>
          </div>
        )}
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto space-y-5">

          {/* Event info */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xl font-bold text-gray-900">{event.name}</h2>
              {isClosed && <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2.5 py-1 rounded-full shrink-0">Closed</span>}
            </div>
            {event.description && <p className="text-sm text-gray-500 mt-1.5">{event.description}</p>}
            {event.event_date && <p className="text-sm text-gray-500 mt-1">{formatDate(event.event_date)}</p>}

            <div className="mt-4 bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-500 font-medium">Your share</p>
                <p className="text-3xl font-bold text-indigo-700 mt-0.5">{formatCurrency(event.cost_per_person)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-indigo-400">Organised by</p>
                <p className="text-sm font-semibold text-indigo-700">{event.organiser_name}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
              <span>{participantCount} of {event.max_participants} joined</span>
              {event.leave_restriction !== 'none' && (
                <span>Leave policy: {LEAVE_RESTRICTION_LABELS[event.leave_restriction]}</span>
              )}
            </div>
          </div>

          {/* Who's joined */}
          {allParticipants.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Who&apos;s joined</h3>
              </div>
              <ul className="divide-y divide-gray-100">
                {allParticipants.map(p => (
                  <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm text-gray-800">{p.name}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Already joined — show their spots + payment info */}
          {alreadyJoined && (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Your spot{myParticipants.length > 1 ? 's' : ''}</h3>
                  {!isClosed && leaveCheck.allowed && (
                    <span className="text-xs text-gray-400">Tap to leave</span>
                  )}
                </div>
                <ul className="divide-y divide-gray-100">
                  {myParticipants.map(p => (
                    <li key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${p.paid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.name}</p>
                          <p className={`text-xs ${p.paid ? 'text-green-600' : 'text-amber-600'}`}>
                            {p.paid ? 'Paid ✓' : 'Payment pending'}
                          </p>
                        </div>
                      </div>

                      {!isClosed && (
                        <>
                          {!leaveCheck.allowed ? (
                            <span className="text-xs text-gray-400">Can&apos;t leave</span>
                          ) : confirmLeave !== p.id ? (
                            <button
                              onClick={() => setConfirmLeave(p.id)}
                              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            >
                              Leave
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => leaveEvent(p)}
                                disabled={leaving === p.id}
                                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                              >
                                {leaving === p.id ? '…' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => setConfirmLeave(null)}
                                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                {!leaveCheck.allowed && leaveCheck.reason && (
                  <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-100">{leaveCheck.reason}</p>
                )}
              </div>

              {/* Payment details */}
              {!isClosed && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-green-50 border-b border-green-100 px-5 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-green-900">
                        {justJoined ? "You're in!" : "You've joined"}
                      </p>
                      <p className="text-xs text-green-700">Send your payment using one of the options below</p>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                      <p className="text-xs text-gray-500">Amount{myParticipants.length > 1 ? ` (×${myParticipants.length})` : ''}</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(event.cost_per_person * myParticipants.length)}
                      </p>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                      <p className="text-xs text-amber-800 font-medium">
                        💡 Use &quot;{myParticipants.map(p => p.name).join(' & ')}&quot; as your payment reference.
                      </p>
                    </div>

                    {/* PayID */}
                    {event.payid && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">PayID — no fees</p>
                        <div className="flex items-center justify-between px-4 pb-3 gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 break-all">{event.payid}</p>
                            <p className="text-xs text-gray-400">Pay to {event.organiser_name}</p>
                          </div>
                          <button
                            onClick={copyPayID}
                            className="shrink-0 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bank Transfer */}
                    {event.bsb && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank transfer — no fees</p>
                        <div className="px-4 pb-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">Account name</p>
                            <p className="text-sm font-semibold text-gray-900">{event.account_name}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">BSB</p>
                            <p className="text-sm font-semibold text-gray-900">{event.bsb}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">Account number</p>
                            <p className="text-sm font-semibold text-gray-900">{event.account_number}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stripe */}
                    {event.stripe_link && (
                      <a
                        href={event.stripe_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white text-sm font-semibold rounded-xl py-3.5 hover:bg-indigo-700 transition-colors"
                      >
                        Pay by card
                      </a>
                    )}
                    {event.stripe_link && (
                      <p className="text-xs text-gray-400 text-center -mt-1">Card payments processed by Stripe — fees may apply</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Join form — only if not yet joined and not closed */}
          {!alreadyJoined && !isClosed && (
            <>
              {isFull ? (
                <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 text-center">
                  <p className="text-3xl mb-3">😔</p>
                  <p className="font-semibold text-gray-900">This event is full</p>
                  <p className="text-sm text-gray-500 mt-1">All {event.max_participants} spots are taken.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Join this event</h3>
                  <p className="text-sm text-gray-500 mb-5">
                    Add your name — or add extra names for friends you&apos;re bringing.
                  </p>

                  <form onSubmit={handleJoin} className="space-y-4">
                    <div className="space-y-2">
                      {names.map((name, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={name}
                            onChange={e => {
                              const updated = [...names]
                              updated[i] = e.target.value
                              setNames(updated)
                            }}
                            placeholder={i === 0 ? `Your name (e.g. ${user.user_metadata?.name ?? 'Bilal'})` : `Person ${i + 1}'s name`}
                            autoFocus={i === 0}
                            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                          {names.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setNames(names.filter((_, idx) => idx !== i))}
                              className="text-gray-400 hover:text-red-500 transition-colors px-1"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {participantCount + names.length < event.max_participants && (
                      <button
                        type="button"
                        onClick={() => setNames([...names, ''])}
                        className="text-sm text-indigo-600 font-medium hover:underline"
                      >
                        + Add another person
                      </button>
                    )}

                    {nameError && <p className="text-xs text-red-500">{nameError}</p>}

                    <button
                      type="submit" disabled={joining}
                      className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:opacity-50"
                    >
                      {joining ? 'Joining…' : names.filter(Boolean).length > 1 ? `Join for ${names.filter(Boolean).length} people` : 'Join event'}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {isClosed && !alreadyJoined && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
              <p className="text-sm text-gray-500">This event is closed and no longer accepting new participants.</p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
