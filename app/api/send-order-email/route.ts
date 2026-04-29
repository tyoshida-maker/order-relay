import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { order_no, order_date, delivery_date, from_company, flow_name, flow_companies, items, notes } = body

  // 商流の各会社メールアドレスに送信
  const recipients = flow_companies
    .filter((c: any) => c.email)
    .map((c: any) => c.email)

  if (recipients.length === 0) {
    return NextResponse.json({ message: 'No email addresses found' })
  }

  const itemRows = items.map((item: any) =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${item.product_name}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${item.unit || ''}</td></tr>`
  ).join('')

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#1d4ed8;border-bottom:2px solid #1d4ed8;padding-bottom:8px;">📦 発注通知 - ${order_no}</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr><td style="padding:6px 0;color:#666;width:120px;">発注番号</td><td style="padding:6px 0;font-weight:bold;">${order_no}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">発注元</td><td style="padding:6px 0;">${from_company}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">発注日</td><td style="padding:6px 0;">${order_date}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">納品希望日</td><td style="padding:6px 0;">${delivery_date || '未定'}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">商流</td><td style="padding:6px 0;">${flow_name}</td></tr>
        ${notes ? `<tr><td style="padding:6px 0;color:#666;">備考</td><td style="padding:6px 0;">${notes}</td></tr>` : ''}
      </table>
      <h3 style="color:#374151;">発注明細</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#f3f4f6;">
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">商品名</th>
          <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #e5e7eb;">数量</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">単位</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <p style="margin-top:24px;color:#6b7280;font-size:13px;">このメールはOrder Relay システムから自動送信されています。</p>
    </div>
  `

  const results = []
  for (const email of recipients) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Order Relay <noreply@order-relay.classic.co.jp>',
        to: [email],
        subject: `【発注通知】${order_no} - ${from_company}`,
        html
      })
    })
    const result = await res.json()
    results.push({ email, result })
  }

  return NextResponse.json({ success: true, results })
}
