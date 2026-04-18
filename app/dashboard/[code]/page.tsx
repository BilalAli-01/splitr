'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase, Event, Participant } from '@/lib/supabase'
import { formatCurrency, formatDate, LEAVE_RESTRICTION_LABELS } from '@/lib/utils'

export default function DashboardPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [closing, setClosing] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addName, setAddName] = useState('')
  const [addingParticipant, setAddingParticipant] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [joinAsName, setJoinAsName] = useState('')
  const [joiningAs, setJoiningAs] = useState(false)

  // Legacy PIN gate
  const [authed, setAuthed] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinLoading, setPinLoading] = useState(false)

  const joinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join/${code}`
      : `/join/${code}`

  const fetchData = useCallback(async () => {
    const { data: eventData, error } = await supabase
      .from('events').select('*').eq('code', code).single()

    if (error || !eventData) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setEvent(eventData)

    const { data: participantData } = await supabase
      .from('participants').select('*').eq('event_id', eventData.id)
      .order('paid', { ascending: true })

    setParticipants(participantData ?? [])
    setLoading(false)
  }, [code])

  useEffect(() => {
    if (authLoading) return
    fetchData()
  }, [fetchData, authLoading])

  // Determine access after event and auth are loaded
  useEffect(() => {
    if (!event || authLoading) return

    if (event.organiser_user_id) {
      // Account-gated event
      if (!user) {
        router.push(`/auth/login`)
        return
      }
      if (user.id === event.organiser_user_id || user.user_metadata?.is_admin === true) {
        setAuthed(true)
      }
    } else {
      // Legacy event — use PIN gate
      const saved = localStorage.getItem(`splitr_auth_${code}`) === 'true'
      if (saved) setAuthed(true)
    }
  }, [event, user, authLoading, code, router])

  async function submitPin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!event) return
    setPinError('')
    setPinLoading(true)
    if (pinInput === event.organiser_pin) {
      localStorage.setItem(`splitr_auth_${code}`, 'true')
      setAuthed(true)
    } else {
      setPinError('Incorrect PIN. Try again.')
    }
    setPinLoading(false)
  }

  async function markPaid(participant: Participant) {
    setMarkingPaid(participant.id)
    const now = new Date().toISOString()
    await supabase.from('participants').update({ paid: true, paid_at: now }).eq('id', participant.id)
    setParticipants(prev => prev.map(p => p.id === participant.id ? { ...p, paid: true, paid_at: now } : p))
    setMarkingPaid(null)
  }

  async function markUnpaid(participant: Participant) {
    setMarkingPaid(participant.id)
    await supabase.from('participants').update({ paid: false, paid_at: null }).eq('id', participant.id)
    setParticipants(prev => prev.map(p => p.id === participant.id ? { ...p, paid: false, paid_at: null } : p))
    setMarkingPaid(null)
  }

  async function removeParticipant(participant: Participant) {
    setRemoving(participant.id)
    await supabase.from('participants').delete().eq('id', participant.id)
    setParticipants(prev => prev.filter(p => p.id !== participant.id))
    setConfirmRemove(null)
    setRemoving(null)
  }

  async function addParticipant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!event || !addName.trim()) return
    setAddingParticipant(true)
    const { data } = await supabase.from('participants').insert({
      event_id: event.id,
      name: addName.trim(),
      paid: false,
      user_id: null,
      added_by_name: user?.user_metadata?.name ?? null,
    }).select().single()
    if (data) {
      setParticipants(prev => [...prev, data])
      setAddName('')
      setShowAddForm(false)
    }
    setAddingParticipant(false)
  }

  async function joinAsParticipant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!event || !user || !joinAsName.trim()) return
    setJoiningAs(true)
    const { data } = await supabase.from('participants').insert({
      event_id: event.id,
      name: joinAsName.trim(),
      paid: false,
      user_id: user.id,
      added_by_name: user.user_metadata?.name ?? null,
    }).select().single()
    if (data) {
      setParticipants(prev => [...prev, data])
      setShowJoinForm(false)
      setJoinAsName('')
    }
    setJoiningAs(false)
  }

  async function closeEvent() {
    if (!event) return
    setClosing(true)
    await supabase.from('events').update({ status: 'closed' }).eq('id', event.id)
    setEvent(prev => prev ? { ...prev, status: 'closed' } : prev)
    setConfirmClose(false)
    setClosing(false)
  }

  async function deleteEvent() {
    if (!event) return
    setDeleting(true)
    await supabase.from('events').delete().eq('id', event.id)
    router.push('/')
  }

  function copyLink() {
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400 text-sm">Loading…</div></div>
  }

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

  const isAdmin = user?.user_metadata?.is_admin === true

  // Account-gated: logged in but wrong user (admins bypass this)
  if (event.organiser_user_id && user && user.id !== event.organiser_user_id && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-4xl mb-4">🔒</p>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access denied</h2>
        <p className="text-gray-500 text-sm mb-6">You&apos;re not the organiser of this event.</p>
        <Link href={`/join/${code}`} className="text-indigo-600 text-sm font-medium hover:underline">
          Join this event instead
        </Link>
      </div>
    )
  }

  // Legacy PIN gate
  if (!authed) {
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
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Organiser access</h2>
                <p className="text-sm text-gray-500 mt-1">Enter your PIN to view <span className="font-medium text-gray-700">{event.name}</span></p>
              </div>
              <form onSubmit={submitPin} className="space-y-4">
                <input
                  type="password" inputMode="numeric"
                  value={pinInput} onChange={e => setPinInput(e.target.value)}
                  placeholder="Enter your PIN" autoFocus
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {pinError && <p className="text-xs text-red-500 text-center">{pinError}</p>}
                <button
                  type="submit" disabled={pinLoading || !pinInput}
                  className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {pinLoading ? 'Checking…' : 'Unlock dashboard'}
                </button>
              </form>
              <p className="text-xs text-gray-400 text-center mt-4">
                Not the organiser?{' '}
                <Link href={`/join/${code}`} className="text-indigo-500 hover:underline">Join instead</Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const hasJoinedAsParticipant = participants.some(p => p.user_id === user?.id)
  const paidCount = participants.filter(p => p.paid).length
  const unpaidCount = participants.filter(p => !p.paid).length
  const paidTotal = paidCount * event.cost_per_person
  const spotsLeft = event.max_participants - participants.length
  const isClosed = event.status === 'closed'

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-2xl font-bold text-indigo-600 tracking-tight">Splitr</Link>
            {isAdmin && <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">Admin</span>}
          </div>
          <div className="flex items-center gap-2">
            {isClosed
              ? <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2.5 py-1 rounded-full">Closed</span>
              : <>
                  <Link
                    href={`/dashboard/${code}/edit`}
                    className="text-xs bg-white border border-gray-300 text-gray-600 font-semibold px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </Link>
                  <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2.5 py-1 rounded-full">Organiser view</span>
                </>
            }
          </div>
        </div>
        {isAdmin && (
          <div className="max-w-lg mx-auto mt-2 flex items-center gap-1 text-xs">
            <span className="text-gray-400 mr-1">View as:</span>
            <Link href="/admin" className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">Admin</Link>
            <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white font-semibold">Organiser</span>
            <Link href={`/join/${code}`} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">Participant</Link>
          </div>
        )}
      </header>

      <main className="flex-1 px-4 py-6 space-y-5">
        <div className="max-w-lg mx-auto space-y-5">

          {isClosed && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-lg">✅</span>
              <p className="text-sm text-gray-600">This event is closed. All data is read-only.</p>
            </div>
          )}

          {/* Event card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-xl font-bold text-gray-900">{event.name}</h2>
            {event.description && <p className="text-sm text-gray-500 mt-1">{event.description}</p>}
            {event.event_date && <p className="text-sm text-gray-500 mt-1">{formatDate(event.event_date)}</p>}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-indigo-50 rounded-xl p-3">
                <p className="text-xs text-indigo-500 font-medium">Cost per person</p>
                <p className="text-xl font-bold text-indigo-700 mt-0.5">{formatCurrency(event.cost_per_person)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 font-medium">Total cost</p>
                <p className="text-xl font-bold text-gray-700 mt-0.5">{formatCurrency(event.total_cost)}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-50 rounded-xl p-2.5">
                <p className="text-lg font-bold text-green-700">{paidCount}</p>
                <p className="text-xs text-green-600">Paid</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-2.5">
                <p className="text-lg font-bold text-amber-700">{unpaidCount}</p>
                <p className="text-xs text-amber-600">Unpaid</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5">
                <p className="text-lg font-bold text-gray-700">{spotsLeft}</p>
                <p className="text-xs text-gray-500">Spots left</p>
              </div>
            </div>

            {paidCount > 0 && (
              <div className="mt-3 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-green-700">Collected so far</span>
                <span className="font-bold text-green-700">{formatCurrency(paidTotal)}</span>
              </div>
            )}
          </div>

          {/* Payment methods */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Payment methods</p>
            {event.payid && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-0.5">PayID</p>
                <p className="text-sm font-semibold text-gray-900">{event.payid}</p>
              </div>
            )}
            {event.bsb && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-0.5">Bank transfer</p>
                <p className="text-sm font-semibold text-gray-900">{event.account_name}</p>
                <p className="text-sm text-gray-700">BSB {event.bsb} · Acct {event.account_number}</p>
              </div>
            )}
          </div>

          {/* Leave restriction */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Participants can leave</p>
            <p className="text-sm font-semibold text-gray-900">{LEAVE_RESTRICTION_LABELS[event.leave_restriction] ?? 'Anytime'}</p>
          </div>

          {/* Share link */}
          {!isClosed && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Join link</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600 flex-1 truncate font-mono bg-gray-50 rounded-lg px-3 py-2">{joinUrl}</p>
                <button
                  onClick={copyLink}
                  className="shrink-0 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Join as participant */}
          {!isClosed && !hasJoinedAsParticipant && spotsLeft > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Join as participant</p>
              {!showJoinForm ? (
                <button
                  onClick={() => { setShowJoinForm(true); setJoinAsName(user?.user_metadata?.name ?? '') }}
                  className="w-full border border-indigo-200 text-indigo-600 text-sm font-semibold rounded-xl py-2.5 hover:bg-indigo-50 transition-colors"
                >
                  + Join this event yourself
                </button>
              ) : (
                <form onSubmit={joinAsParticipant} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={joinAsName}
                    onChange={e => setJoinAsName(e.target.value)}
                    placeholder="Your name"
                    autoFocus
                    required
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={joiningAs || !joinAsName.trim()}
                    className="shrink-0 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {joiningAs ? '…' : 'Join'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJoinForm(false)}
                    className="shrink-0 text-sm text-gray-400 hover:text-gray-600 px-2"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Participants */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-gray-900">
                Participants ({participants.length}/{event.max_participants})
              </h3>
              {!isClosed && spotsLeft > 0 && (
                <button
                  onClick={() => { setShowAddForm(v => !v); setAddName('') }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                  {showAddForm ? 'Cancel' : '+ Add'}
                </button>
              )}
            </div>

            {showAddForm && !isClosed && (
              <form onSubmit={addParticipant} className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <input
                  type="text"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="Participant name"
                  autoFocus
                  required
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={addingParticipant || !addName.trim()}
                  className="shrink-0 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {addingParticipant ? '…' : 'Add'}
                </button>
              </form>
            )}

            {participants.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-2xl mb-2">👥</p>
                <p className="text-sm text-gray-500">No one has joined yet.</p>
                <p className="text-xs text-gray-400 mt-1">Share the join link above to get started.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {participants.map(p => (
                  <li key={p.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${p.paid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                          {p.paid && p.paid_at
                            ? <p className="text-xs text-green-600">Paid {new Date(p.paid_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</p>
                            : <p className="text-xs text-amber-600">Awaiting payment</p>
                          }
                          {p.added_by_name && (
                            <p className="text-xs text-gray-400">Added by {p.added_by_name}</p>
                          )}
                        </div>
                      </div>

                      {!isClosed && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => p.paid ? markUnpaid(p) : markPaid(p)}
                            disabled={markingPaid === p.id || removing === p.id}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${p.paid ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                          >
                            {markingPaid === p.id ? '…' : p.paid ? 'Mark unpaid' : 'Mark paid'}
                          </button>

                          {confirmRemove !== p.id ? (
                            <button
                              onClick={() => setConfirmRemove(p.id)}
                              disabled={removing === p.id}
                              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            >
                              Remove
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => removeParticipant(p)}
                                disabled={removing === p.id}
                                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                              >
                                {removing === p.id ? '…' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => setConfirmRemove(null)}
                                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Close event */}
          {!isClosed && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Close event</p>
              <p className="text-sm text-gray-500 mb-4">
                Mark this event as complete. It becomes read-only and moves to your closed events.
              </p>
              {!confirmClose ? (
                <button
                  onClick={() => setConfirmClose(true)}
                  className="w-full border border-gray-300 text-gray-600 text-sm font-semibold rounded-xl py-3 hover:bg-gray-50 transition-colors"
                >
                  Close event
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 text-center">Are you sure? This can&apos;t be undone.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setConfirmClose(false)}
                      className="border border-gray-300 text-gray-600 text-sm font-semibold rounded-xl py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={closeEvent}
                      disabled={closing}
                      className="bg-gray-800 text-white text-sm font-semibold rounded-xl py-2.5 hover:bg-gray-900 transition-colors disabled:opacity-50"
                    >
                      {closing ? 'Closing…' : 'Yes, close it'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delete event */}
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">Danger zone</p>
            <p className="text-sm text-gray-500 mb-4">
              Permanently delete this event and all participant data. This cannot be undone.
            </p>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full border border-red-200 text-red-500 text-sm font-semibold rounded-xl py-3 hover:bg-red-50 transition-colors"
              >
                Delete event
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 text-center">This will delete everything. Are you sure?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="border border-gray-300 text-gray-600 text-sm font-semibold rounded-xl py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteEvent}
                    disabled={deleting}
                    className="bg-red-500 text-white text-sm font-semibold rounded-xl py-2.5 hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete it'}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
