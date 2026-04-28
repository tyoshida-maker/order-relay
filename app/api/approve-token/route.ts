import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/', req.url))

  const { data: tokenRow, error } = await supabase
    .from('approval_tokens')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !tokenRow) {
    return NextResponse.redirect(new URL('/orders?error=invalid_token', req.url))
  }
  if (tokenRow.used) {
    return NextResponse.redirect(new URL(`/orders/${tokenRow.order_id}?msg=already_approved`, req.url))
  }
  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.redirect(new URL('/orders?error=token_expired', req.url))
  }

  // Call approve-order API
  const approveRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://order-relay.vercel.app'}/api/approve-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: tokenRow.order_id })
  })

  if (!approveRes.ok) {
    return NextResponse.redirect(new URL(`/orders/${tokenRow.order_id}?error=approve_failed`, req.url))
  }

  // Mark token as used
  await supabase.from('approval_tokens').update({ used: true }).eq('id', tokenRow.id)

  return NextResponse.redirect(new URL(`/orders/${tokenRow.order_id}?approved=1`, req.url))
}
