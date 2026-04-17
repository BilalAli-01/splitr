import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ovhtlnhnzglircqcypst.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aHRsbmhuemdsaXJjcWN5cHN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQxNTQwMSwiZXhwIjoyMDkxOTkxNDAxfQ.nMBKi_0OLbjFqujdDZEHOhVxVBnAJ4mhS1x9ejmEaEA'

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
  payid: string
  code: string
  status: string
  organiser_pin: string | null
}

export type Participant = {
  id: string
  event_id: string
  name: string
  paid: boolean
  paid_at: string | null
}
