'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase, Event } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'

type Participation = {
  id: string
  name: string
  paid: boolean
  events: Event
}

type EventWithAmounts = Event & { participants: { custom_amount: number | null }[] }

export default function HomePage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [organisedEvents, setOrganisedEvents] = useState<EventWithAmounts[]>([])
  const [joinedEvents, setJoinedEvents] = useState<Participation[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    async function load() {
      const [{ data: organised }, { data: joined }] = await Promise.all([
        supabase
          .from('events')
          .select('*, participants(custom_amount)')
          .eq('organiser_user_id', user!.id)
          .order('event_date', { ascending: true, nullsFirst: false }),
        supabase
          .from('participants')
          .select('id, name, paid, events(*)')
          .eq('user_id', user!.id),
      ])
      setOrganisedEvents((organised as unknown as EventWithAmounts[]) ?? [])
      setJoinedEvents((joined as unknown as Participation[]) ?? [])
      setDataLoading(false)
    }
    load()
  }, [user])

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (!user) return null

  const name = user.user_metadata?.name ?? 'there'

  const activeOrganised = organisedEvents.filter(e => e.status !== 'closed')
  const closedOrganised = organisedEvents.filter(e => e.status === 'closed')

  const uniqueJoined = joinedEvents.filter(
    (p, i, arr) => arr.findIndex(x => x.events?.id === p.events?.id) === i
  )

  const sortByEventDate = (a: Participation, b: Participation) => {
    const dateA = a.events?.event_date
    const dateB = b.events?.event_date
    if (!dateA && !dateB) return 0
    if (!dateA) return 1
    if (!dateB) return -1
    return dateA < dateB ? -1 : dateA > dateB ? 1 : 0
  }

  const activeJoined = uniqueJoined.filter(p => p.events?.status !== 'closed').sort(sortByEventDate)
  const closedJoined = uniqueJoined.filter(p => p.events?.status === 'closed').sort(sortByEventDate)

  const hasAnything =
    organisedEvents.length > 0 || joinedEvents.length > 0

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-600 tracking-tight">Splitr</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Hey, {name} 👋</p>
          </div>
          <div className="flex items-center gap-3">
            {user.app_metadata?.is_admin && (
              <Link href="/admin" className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold px-2.5 py-1 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                Admin
              </Link>
            )}
            <Link
              href="/events/create"
              className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              + Create
            </Link>
            <ThemeToggle />
            <button onClick={signOut} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-lg mx-auto space-y-7">

          {!hasAnything && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 text-center">
              <p className="text-3xl mb-3">🎉</p>
              <p className="font-semibold text-gray-900 dark:text-white">No events yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">
                Create your first event or join one via a shared link.
              </p>
              <Link
                href="/events/create"
                className="inline-block bg-indigo-600 text-white rounded-xl px-6 py-3 text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Create an event
              </Link>
            </div>
          )}

          {organisedEvents.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Events you organised
              </h2>
              <div className="space-y-3">
                {activeOrganised.map(event => (
                  <Link
                    key={event.id}
                    href={`/dashboard/${event.code}`}
                    className="block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{event.name}</p>
                        {event.event_date && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(event.event_date)}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {event.pricing_mode === 'flexible' && event.cost_per_person === 0
                          ? <p className="font-bold text-purple-600 dark:text-purple-400">Flexible</p>
                          : event.pricing_mode !== 'fixed' && event.participants?.some(p => p.custom_amount !== null)
                            ? <p className="font-bold text-indigo-600">Custom</p>
                            : <p className="font-bold text-indigo-600">{formatCurrency(event.cost_per_person)}</p>
                        }
                        <p className="text-xs text-gray-400">per person</p>
                      </div>
                    </div>
                  </Link>
                ))}
                {closedOrganised.map(event => (
                  <Link
                    key={event.id}
                    href={`/dashboard/${event.code}`}
                    className="block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 opacity-55 hover:opacity-75 transition-opacity"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{event.name}</p>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full shrink-0">Closed</span>
                        </div>
                        {event.event_date && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(event.event_date)}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {event.pricing_mode === 'flexible' && event.cost_per_person === 0
                          ? <p className="font-bold text-gray-500 dark:text-gray-400">Flexible</p>
                          : event.pricing_mode !== 'fixed' && event.participants?.some(p => p.custom_amount !== null)
                            ? <p className="font-bold text-gray-500 dark:text-gray-400">Custom</p>
                            : <p className="font-bold text-gray-500 dark:text-gray-400">{formatCurrency(event.cost_per_person)}</p>
                        }
                        <p className="text-xs text-gray-400">per person</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {(activeJoined.length > 0 || closedJoined.length > 0) && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Events you&apos;ve joined
              </h2>
              <div className="space-y-3">
                {activeJoined.map(p => (
                  <Link
                    key={p.id}
                    href={`/join/${p.events?.code}`}
                    className="block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{p.events?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Joined as <span className="font-medium">{p.name}</span></p>
                        {p.events?.event_date && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(p.events.event_date)}</p>
                        )}
                      </div>
                      <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        p.paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {p.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                  </Link>
                ))}
                {closedJoined.map(p => (
                  <Link
                    key={p.id}
                    href={`/join/${p.events?.code}`}
                    className="block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 opacity-55 hover:opacity-75 transition-opacity"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{p.events?.name}</p>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full shrink-0">Closed</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Joined as <span className="font-medium">{p.name}</span></p>
                      </div>
                      <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        p.paid ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {p.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  )
}
