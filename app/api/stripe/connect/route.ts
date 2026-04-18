import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const userId = searchParams.get('user_id')

  if (!userId) return NextResponse.redirect(`${origin}/settings`)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.STRIPE_CLIENT_ID!,
    scope: 'read_write',
    redirect_uri: `${origin}/api/stripe/callback`,
    state: userId,
  })

  return NextResponse.redirect(`https://connect.stripe.com/oauth/authorize?${params}`)
}
