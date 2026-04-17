'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, Event, Participant } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function DashboardPage() {
  const { code } = useParams<{ code: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
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
      .from('events')
      .select('*')
      .eq('code', code)
      .single()

    if (error || !eventData) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setEvent(eventData)

    const { data: participantData } = await supabase
      .from('participants')
      .select('*')
      .eq('event_id', eventData.id)
      .order('paid', { ascending: true })
      .order('paid_at', { ascending: false, nullsFirst: false })

    setParticipants(participantData ?? [])
    setLoading(false)
  }, [code])

  useEffect(() => {
    const alreadyAuthed = localStorage.getItem(`splitr_auth_${code}`) === 'true'
    if (alreadyAuthed) setAuthed(true)
    fetchData()
  }, [fetchData, code])

  async function markPaid(participant: Participant) {
    setMarkingPaid(participant.id)
    const now = new Date().toISOString()
    await supabase
      .from('participants')
      .update({ paid: true, paid_at: now })
      .eq('id', participant.id)

    setParticipants((prev) =>
      prev.map((p) =>
        p.id === participant.id ? { ...p, paid: true, paid_at: now } : p
      )
    )
    setMarkingPaid(null)
  }

  async function submitPin(e: React.FormEvent) {
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

  async function removeParticipant(participant: Participant) {
    setRemoving(participant.id)
    await supabase.from('participants').delete().eq('id', participant.id)
    setParticipants((prev) => prev.filter((p) => p.id !== participant.id))
    setConfirmRemove(null)
    setRemoving(null)
  }

  async function markUnpaid(participant: Participant) {
    setMarkingPaid(participant.id)
    await supabase
      .from('participants')
      .update({ paid: false, paid_at: null })
      .eq('id', participant.id)

    setParticipants((prev) =>
      prev.map((p) =>
        p.id === participant.id ? { ...p, paid: false, paid_at: null } : p
      )
    )
    setMarkingPaid(null)
  }

  function copyLink() {
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-4xl mb-4">🤔</p>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Event not found</h2>
        <p className="text-gray-500 text-sm mb-6">Check the link and try again.</p>
        <Link href="/" className="text-indigo-600 text-sm font-medium hover:underline">
          Create a new event
        </Link>
      </div>
    )
  }

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
                <p className="text-sm text-gray-500 mt-1">
                  Enter your PIN to view <span className="font-medium text-gray-700">{event.name}</span>
                </p>
              </div>

              <form onSubmit={submitPin} className="space-y-4">
                <div>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Enter your PIN"
                    autoFocus
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {pinError && (
                    <p className="text-xs text-red-500 text-center mt-2">{pinError}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={pinLoading || !pinInput}
                  className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {pinLoading ? 'Checking…' : 'Unlock dashboard'}
                </button>
              </form>

              <p className="text-xs text-gray-400 text-center mt-4">
                Not the organiser?{' '}
                <Link href={`/join/${code}`} className="text-indigo-500 hover:underline">
                  Join this event instead
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const paidCount = participants.filter((p) => p.paid).length
  const unpaidCount = participants.filter((p) => !p.paid).length
  const paidTotal = paidCount * event.cost_per_person
  const spotsLeft = event.max_participants - participants.length

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-indigo-600 tracking-tight">
            Splitr
          </Link>
          <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2.5 py-1 rounded-full">
            Organiser view
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 space-y-5">
        <div className="max-w-lg mx-auto space-y-5">
          {/* Event card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-xl font-bold text-gray-900">{event.name}</h2>
            {event.description && (
              <p className="text-sm text-gray-500 mt-1">{event.description}</p>
            )}
            {event.event_date && (
              <p className="text-sm text-gray-500 mt-1">{formatDate(event.event_date)}</p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-indigo-50 rounded-xl p-3">
                <p className="text-xs text-indigo-500 font-medium">Cost per person</p>
                <p className="text-xl font-bold text-indigo-700 mt-0.5">
                  {formatCurrency(event.cost_per_person)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 font-medium">Total cost</p>
                <p className="text-xl font-bold text-gray-700 mt-0.5">
                  {formatCurrency(event.total_cost)}
                </p>
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

          {/* PayID */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Your PayID</p>
            <p className="text-base font-semibold text-gray-900">{event.payid}</p>
            <p className="text-xs text-gray-400 mt-1">Participants will send {formatCurrency(event.cost_per_person)} to this PayID.</p>
          </div>

          {/* Share link */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Join link</p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600 flex-1 truncate font-mono bg-gray-50 rounded-lg px-3 py-2">
                {joinUrl}
              </p>
              <button
                onClick={copyLink}
                className="shrink-0 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Share this link with your group so they can join and see payment details.
            </p>
          </div>

          {/* Participants */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                Participants ({participants.length}/{event.max_participants})
              </h3>
            </div>

            {participants.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-2xl mb-2">👥</p>
                <p className="text-sm text-gray-500">No one has joined yet.</p>
                <p className="text-xs text-gray-400 mt-1">Share the join link above to get started.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {participants.map((p) => (
                  <li key={p.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                            p.paid
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                          {p.paid && p.paid_at && (
                            <p className="text-xs text-green-600">
                              Paid{' '}
                              {new Date(p.paid_at).toLocaleDateString('en-AU', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </p>
                          )}
                          {!p.paid && (
                            <p className="text-xs text-amber-600">Awaiting payment</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => p.paid ? markUnpaid(p) : markPaid(p)}
                          disabled={markingPaid === p.id || removing === p.id}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                            p.paid
                              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {markingPaid === p.id ? '…' : p.paid ? 'Mark unpaid' : 'Mark paid'}
                        </button>

                        {confirmRemove !== p.id ? (
                          <button
                            onClick={() => setConfirmRemove(p.id)}
                            disabled={removing === p.id}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                            title="Remove participant"
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
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
