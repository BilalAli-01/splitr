import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { count } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({ ok: true, events: count ?? 0 })
}
