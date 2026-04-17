'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase, Event } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function AdminPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const isAdmin = user?.user_metadata?.is_admin === true

  useEffect(() => {
    if (authLoading) return
    if (!user || !isAdmin) {
      router.push('/')
      return
    }

    async function load() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
      setEvents(data ?? [])
      setLoading(false)
    }
    load()
  }, [user, authLoading, isAdmin, router])

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400 text-sm">Loading…</div></div>
  }

  if (!user || !isAdmin) return null

  const filtered = events.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.organiser_name.toLowerCase().includes(search.toLowerCase()) ||
    e.code.toLowerCase().includes(search.toLowerCase())
  )

  const active = filtered.filter(e => e.status !== 'closed')
  const closed = filtered.filter(e => e.status === 'closed')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-2xl font-bold text-indigo-600 tracking-tight">Splitr</Link>
            <span className="ml-2 text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">My events</Link>
            <button onClick={signOut} className="text-sm text-gray-400 hover:text-gray-600">Log out</button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-5">

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All events ({events.length})</h2>
          </div>

          <input
            type="text"
            placeholder="Search by name, organiser, or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />

          {active.length === 0 && closed.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">No events found.</p>
            </div>
          )}

          {active.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Active ({active.length})</p>
              <div className="space-y-2">
                {active.map(event => <AdminEventRow key={event.id} event={event} />)}
              </div>
            </section>
          )}

          {closed.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Closed ({closed.length})</p>
              <div className="space-y-2 opacity-60">
                {closed.map(event => <AdminEventRow key={event.id} event={event} />)}
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  )
}

function AdminEventRow({ event }: { event: Event }) {
  return (
    <Link
      href={`/dashboard/${event.code}`}
      className="block bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:border-indigo-200 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 truncate">{event.name}</p>
            <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{event.code}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">by {event.organiser_name}</p>
          {event.event_date && <p className="text-xs text-gray-400">{formatDate(event.event_date)}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-indigo-600">{formatCurrency(event.cost_per_person)}</p>
          <p className="text-xs text-gray-400">per person</p>
        </div>
      </div>
    </Link>
  )
}
