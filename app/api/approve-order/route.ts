import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { order_id } = await req.json()
  if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

  // 発注と商流を取得
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*, flows(*), companies(*)')
    .eq('id', order_id)
    .single()
  if (orderErr || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const steps: Array<{ company_id: string; role: string }> = order.flows?.steps || []
  const currentStep: number = order.current_step ?? 0
  const nextStep = currentStep + 1

  // approved_stepsに現在のステップを追加
  const approvedSteps: number[] = order.approved_steps || []
  if (!approvedSteps.includes(currentStep)) approvedSteps.push(currentStep)

  // 次のステップがあるか確認
  const isLast = nextStep >= steps.length

  // ordersテーブルを更新
  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      current_step: nextStep,
      approved_steps: approvedSteps,
      status: isLast ? 'completed' : 'in_progress'
    })
    .eq('id', order_id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // 次のステップの会社にメール送信
  if (!isLast && process.env.RESEND_API_KEY) {
    const nextCompanyId = steps[nextStep]?.company_id
    const { data: companies } = await supabase.from('companies').select('*').in('id', steps.map(s => s.company_id))
    const nextCompany = companies?.find(c => c.id === nextCompanyId)
    const fromCompany = order.companies

    if (nextCompany?.email) {
      const items = [] // シンプルに空配列でOK（詳細はリンクで確認）
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://order-relay.vercel.app'
      const approveUrl = `${appUrl}/orders/${order_id}`

      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#1d4ed8;border-bottom:2px solid #1d4ed8;padding-bottom:8px;">📦 発注承認依頼 - ${order.order_no}</h2>
          <p>前のステップが承認されました。内容をご確認の上、承認をお願いします。</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <tr><td style="padding:6px 0;color:#666;width:120px;">発注番号</td><td style="padding:6px 0;font-weight:bold;">${order.order_no}</td></tr>
            <tr><td style="padding:6px 0;color:#666;">発注元</td><td style="padding:6px 0;">${fromCompany?.name || ''}</td></tr>
            <tr><td style="padding:6px 0;color:#666;">発注日</td><td style="padding:6px 0;">${order.order_date}</td></tr>
            <tr><td style="padding:6px 0;color:#666;">納品希望日</td><td style="padding:6px 0;">${order.delivery_date || '未定'}</td></tr>
            ${order.notes ? `<tr><td style="padding:6px 0;color:#666;">備考</td><td style="padding:6px 0;">${order.notes}</td></tr>` : ''}
          </table>
          <a href="${approveUrl}" style="display:inline-block;background:#1d4ed8;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0;">
            ✅ 発注を確認・承認する
          </a>
          <p style="margin-top:24px;color:#6b7280;font-size:13px;">このメールはOrder Relay システムから自動送信されています。</p>
        </div>
      `

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Order Relay <onboarding@resend.dev>',
          to: [nextCompany.email],
          subject: `【承認依頼】${order.order_no} - ${fromCompany?.name || ''}`,
          html
        })
      })
    }
  }

  return NextResponse.json({
    success: true,
    current_step: nextStep,
    is_completed: isLast,
    status: isLast ? 'completed' : 'in_progress'
  })
}
