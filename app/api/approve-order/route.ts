import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function sendApprovalEmail(order: any, toCompany: any, fromCompany: any, items: any[]) {
  if (!process.env.RESEND_API_KEY || !toCompany?.email) return
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://order-relay.vercel.app'
  // Generate one-click token
  const { data: tokenRow } = await supabase.from('approval_tokens').insert({
    order_id: order.id, step: order.current_step
  }).select().single()
  const approveUrl = tokenRow
    ? `${appUrl}/api/approve-token?token=${tokenRow.token}`
    : `${appUrl}/orders/${order.id}`

  const itemsHtml = items.map(item =>
    `<tr><td style="padding:4px 8px;border:1px solid #e5e7eb;">${item.name}</td><td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:center;">${item.quantity} ${item.unit}</td><td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;">${item.unit_price ? '&yen;' + Number(item.unit_price).toLocaleString() : '-'}</td></tr>`
  ).join('')

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
    <h2 style="color:#1d4ed8;border-bottom:2px solid #1d4ed8;padding-bottom:8px;">&#128230; ${order.order_no} - ${fromCompany?.name || ''} からの発注承認依頼</h2>
    <p>前のステップが承認されました。内容をご確認の上、承認ください。</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr><td style="padding:6px 0;color:#666;width:120px;">発注番号</td><td style="font-weight:bold;">${order.order_no}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">発注元</td><td>${fromCompany?.name || ''}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">発注日</td><td>${order.order_date}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">納品希望日</td><td>${order.delivery_date || '未定'}</td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead><tr style="background:#f3f4f6;"><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:left;">商品</th><th style="padding:6px 8px;border:1px solid #e5e7eb;">数量</th><th style="padding:6px 8px;border:1px solid #e5e7eb;">単価</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <a href="${approveUrl}" style="display:inline-block;background:#16a34a;color:white;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;margin:16px 0;">
      &#9989; ワンクリックで承認する
    </a>
    <p style="color:#6b7280;font-size:12px;">このリンクは7日間有効です。Order Relay システムから自動送信されました。</p>
  </div>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Order Relay <onboarding@resend.dev>',
      to: [toCompany.email],
      subject: `[承認依頼] ${order.order_no} - ${fromCompany?.name || ''}`,
      html
    })
  })
}

async function sendCompletionEmail(order: any, finalCompany: any, fromCompany: any, items: any[]) {
  if (!process.env.RESEND_API_KEY || !finalCompany?.email) return
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://order-relay.vercel.app'

  const itemsHtml = items.map(item =>
    `<tr><td style="padding:4px 8px;border:1px solid #e5e7eb;">${item.name}</td><td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:center;">${item.quantity} ${item.unit}</td><td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;">${item.unit_price ? '&yen;' + Number(item.unit_price).toLocaleString() : '-'}</td></tr>`
  ).join('')

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
    <h2 style="color:#16a34a;border-bottom:2px solid #16a34a;padding-bottom:8px;">&#127881; 発注確定通知 - ${order.order_no}</h2>
    <p>全承認フローが完了しました。以下の内容で発注が確定しました。</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr><td style="padding:6px 0;color:#666;width:120px;">発注番号</td><td style="font-weight:bold;">${order.order_no}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">発注元</td><td>${fromCompany?.name || ''}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">発注日</td><td>${order.order_date}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">納品希望日</td><td>${order.delivery_date || '未定'}</td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead><tr style="background:#f3f4f6;"><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:left;">商品</th><th style="padding:6px 8px;border:1px solid #e5e7eb;">数量</th><th style="padding:6px 8px;border:1px solid #e5e7eb;">単価</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <a href="${appUrl}/orders/${order.id}" style="display:inline-block;background:#1d4ed8;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin:8px 0;">発注詳細を確認</a>
    <p style="color:#6b7280;font-size:12px;">Order Relay システムから自動送信されました。</p>
  </div>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Order Relay <onboarding@resend.dev>',
      to: [finalCompany.email],
      subject: `[発注確定] ${order.order_no} - 全承認完了`,
      html
    })
  })
}

export async function POST(req: NextRequest) {
  const { order_id } = await req.json()
  if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*, flows(*), companies(*)')
    .eq('id', order_id)
    .single()
  if (orderErr || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const steps: Array<{ company_id: string }> = order.flows?.steps || []
  const currentStep: number = order.current_step ?? 0
  const nextStep = currentStep + 1
  const isLast = nextStep >= steps.length

  const approvedSteps: number[] = order.approved_steps || []
  if (!approvedSteps.includes(currentStep)) approvedSteps.push(currentStep)

  const { error: updateErr } = await supabase.from('orders').update({
    current_step: nextStep,
    approved_steps: approvedSteps,
    status: isLast ? 'completed' : 'in_progress'
  }).eq('id', order_id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Get all companies and order items
  const allCompanyIds = steps.map(s => s.company_id)
  const { data: allCompanies } = await supabase.from('companies').select('*').in('id', allCompanyIds)
  const { data: orderItems } = await supabase.from('order_items').select('*, products(*)').eq('order_id', order_id)
  const items = (orderItems || []).map(i => ({
    name: i.products?.name || '',
    quantity: i.quantity,
    unit: i.products?.unit || '',
    unit_price: i.unit_price
  }))

  if (!isLast) {
    const nextCompany = allCompanies?.find(c => c.id === steps[nextStep]?.company_id)
    await sendApprovalEmail({ ...order, current_step: nextStep }, nextCompany, order.companies, items)
  } else {
    // Final step: send completion email to last company (e.g. 九州食糧)
    const lastCompany = allCompanies?.find(c => c.id === steps[steps.length - 1]?.company_id)
    await sendCompletionEmail(order, lastCompany, order.companies, items)
  }

  return NextResponse.json({ success: true, current_step: nextStep, is_completed: isLast })
}
