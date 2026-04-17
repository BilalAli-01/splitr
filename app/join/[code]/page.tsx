'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, Event, Participant } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

type Step = 'details' | 'join' | 'payment'

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [step, setStep] = useState<Step>('details')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [joining, setJoining] = useState(false)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [participantCount, setParticipantCount] = useState(0)
  const [copied, setCopied] = useState(false)

  const fetchEvent = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('code', code)
      .single()

    if (error || !data) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setEvent(data)

    const { count } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', data.id)

    setParticipantCount(count ?? 0)
    setLoading(false)
  }, [code])

  useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setNameError('')

    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('Please enter your name.')
      return
    }

    if (!event) return

    if (participantCount >= event.max_participants) {
      setNameError('Sorry, this event is full.')
      return
    }

    setJoining(true)

    const { data, error } = await supabase
      .from('participants')
      .insert({ event_id: event.id, name: trimmed, paid: false })
      .select()
      .single()

    if (error || !data) {
      setNameError('Something went wrong. Try again.')
      setJoining(false)
      return
    }

    setParticipant(data)
    setStep('payment')
    setJoining(false)
  }

  function copyPayID() {
    if (!event) return
    navigator.clipboard.writeText(event.payid)
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

  const isFull = participantCount >= event.max_participants

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <Link href="/" className="text-2xl font-bold text-indigo-600 tracking-tight">
            Splitr
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto space-y-5">

          {/* Event info — always visible */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-xl font-bold text-gray-900">{event.name}</h2>
            {event.description && (
              <p className="text-sm text-gray-500 mt-1.5">{event.description}</p>
            )}
            {event.event_date && (
              <p className="text-sm text-gray-500 mt-1">{formatDate(event.event_date)}</p>
            )}

            <div className="mt-4 bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-500 font-medium">Your share</p>
                <p className="text-3xl font-bold text-indigo-700 mt-0.5">
                  {formatCurrency(event.cost_per_person)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-indigo-400">Organised by</p>
                <p className="text-sm font-semibold text-indigo-700">{event.organiser_name}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
              <span>{participantCount} of {event.max_participants} joined</span>
              {isFull && <span className="text-red-500 font-medium">Event full</span>}
            </div>
          </div>

          {/* Step: Enter name */}
          {step === 'details' && !isFull && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Join this event</h3>
              <p className="text-sm text-gray-500 mb-5">
                Enter your name so {event.organiser_name} knows who&apos;s in.
              </p>

              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="name">
                    Your name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sam"
                    autoFocus
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {nameError && (
                    <p className="text-xs text-red-500 mt-1.5">{nameError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={joining}
                  className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:opacity-50"
                >
                  {joining ? 'Joining…' : 'Join event'}
                </button>
              </form>
            </div>
          )}

          {/* Step: Full */}
          {isFull && (
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 text-center">
              <p className="text-3xl mb-3">😔</p>
              <p className="font-semibold text-gray-900">This event is full</p>
              <p className="text-sm text-gray-500 mt-1">
                All {event.max_participants} spots have been taken.
              </p>
            </div>
          )}

          {/* Step: Payment instructions */}
          {step === 'payment' && participant && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-green-50 border-b border-green-100 px-5 py-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-green-900">You&apos;re in, {participant.name}!</p>
                  <p className="text-xs text-green-700">Now send your payment via PayID</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Payment details
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-xs text-gray-500">Amount</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(event.cost_per_person)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">PayID</p>
                        <p className="text-sm font-semibold text-gray-900 break-all">{event.payid}</p>
                      </div>
                      <button
                        onClick={copyPayID}
                        className="shrink-0 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-xl px-4 py-3">
                      <p className="text-xs text-gray-500">Pay to (name)</p>
                      <p className="text-sm font-semibold text-gray-900">{event.organiser_name}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-800 font-medium">
                    💡 Include your name &quot;{participant.name}&quot; in the payment reference so {event.organiser_name} can identify your transfer.
                  </p>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  {event.organiser_name} will mark you as paid once they receive the transfer.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
