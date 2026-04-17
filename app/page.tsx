'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { generateCode } from '@/lib/utils'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [totalCost, setTotalCost] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')

  const costPerPerson =
    totalCost && maxParticipants && Number(maxParticipants) > 0
      ? (Number(totalCost) / Number(maxParticipants)).toFixed(2)
      : null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const data = new FormData(form)

    const name = data.get('name') as string
    const description = data.get('description') as string
    const event_date = data.get('event_date') as string
    const total_cost = Number(data.get('total_cost'))
    const max_participants = Number(data.get('max_participants'))
    const organiser_name = data.get('organiser_name') as string
    const payid = data.get('payid') as string
    const organiser_pin = data.get('organiser_pin') as string

    if (organiser_pin.length < 4) {
      setError('PIN must be at least 4 digits.')
      setLoading(false)
      return
    }

    if (max_participants < 1) {
      setError('Max participants must be at least 1.')
      setLoading(false)
      return
    }

    const code = generateCode()

    const { error: insertError } = await supabase.from('events').insert({
      name,
      description: description || null,
      event_date: event_date || null,
      total_cost,
      max_participants,
      organiser_name,
      payid,
      code,
      status: 'active',
      organiser_pin,
    })

    if (insertError) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    localStorage.setItem(`splitr_auth_${code}`, 'true')
    router.push(`/dashboard/${code}`)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-indigo-600 tracking-tight">Splitr</h1>
          <p className="text-sm text-gray-500 mt-0.5">Split group event costs via PayID</p>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Create an event</h2>
            <p className="text-sm text-gray-500 mb-6">
              Fill in the details below and share the link with your group.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="name">
                  Event name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Bucks Night 2025"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Optional — any extra details for your group"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="event_date">
                  Event date
                </label>
                <input
                  id="event_date"
                  name="event_date"
                  type="date"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="total_cost">
                    Total cost ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="total_cost"
                    name="total_cost"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="max_participants">
                    No. of people <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="max_participants"
                    name="max_participants"
                    type="number"
                    required
                    min="1"
                    step="1"
                    placeholder="e.g. 10"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {costPerPerson && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-indigo-700 font-medium">Cost per person</span>
                  <span className="text-lg font-bold text-indigo-700">${costPerPerson}</span>
                </div>
              )}

              <div className="border-t border-gray-100 pt-5 space-y-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Your details</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="organiser_name">
                    Your name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="organiser_name"
                    name="organiser_name"
                    type="text"
                    required
                    placeholder="e.g. Alex"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="payid">
                    Your PayID <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="payid"
                    name="payid"
                    type="text"
                    required
                    placeholder="e.g. alex@email.com or 0412 345 678"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Participants will send payment to this PayID manually.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="organiser_pin">
                    Dashboard PIN <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="organiser_pin"
                    name="organiser_pin"
                    type="password"
                    inputMode="numeric"
                    required
                    minLength={4}
                    maxLength={8}
                    placeholder="Choose a 4–8 digit PIN"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    You&apos;ll need this to access your organiser dashboard. Don&apos;t share it.
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating event…' : 'Create event'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
