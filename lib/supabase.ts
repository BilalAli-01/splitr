import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Event = {
  id: string
  name: string
  description: string | null
  event_date: string | null
  total_cost: number
  max_participants: number
  cost_per_person: number
  organiser_name: string
  payid: string | null
  bsb: string | null
  account_number: string | null
  account_name: string | null
  stripe_link: string | null
  code: string
  status: string
  organiser_pin: string | null
  organiser_user_id: string | null
  leave_restriction: string
}

export type Participant = {
  id: string
  event_id: string
  name: string
  paid: boolean
  paid_at: string | null
  user_id: string | null
}
