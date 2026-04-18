import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/settings?stripe_error=1`)
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const response = await stripe.oauth.token({ grant_type: 'authorization_code', code })
    const accountId = response.stripe_user_id

    return NextResponse.redirect(
      `${origin}/settings/stripe-connected?account_id=${accountId}`
    )
  } catch {
    return NextResponse.redirect(`${origin}/settings?stripe_error=1`)
  }
}
