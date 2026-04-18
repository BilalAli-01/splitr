import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { eventName, costPerPerson } = await request.json()

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.stripe_account_id) {
      return NextResponse.json({ error: 'Stripe not connected' }, { status: 400 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const accountId = profile.stripe_account_id

    const product = await stripe.products.create(
      { name: eventName },
      { stripeAccount: accountId }
    )

    const price = await stripe.prices.create(
      {
        product: product.id,
        currency: 'aud',
        unit_amount: Math.round(costPerPerson * 100),
      },
      { stripeAccount: accountId }
    )

    const paymentLink = await stripe.paymentLinks.create(
      { line_items: [{ price: price.id, quantity: 1 }] },
      { stripeAccount: accountId }
    )

    return NextResponse.json({ url: paymentLink.url })
  } catch (err) {
    console.error('Stripe error:', err)
    return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 })
  }
}
