import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

const STEP_EMAILS: Record<number, string> = {
      1: process.env.STEP1_EMAIL || '',
      2: process.env.STEP2_EMAIL || '',
      3: process.env.STEP3_EMAIL || '',
};

const STEP_LABELS: Record<number, string> = {
      1: '\u7b2c1\u627f\u8a8d\uff08\u5225\u4f1a\u793e\u78ba\u8a8d\uff09',
      2: '\u7b2c2\u627f\u8a8d\uff08\u4ed2\u5165\u5148\u78ba\u8a8d\uff09',
      3: '\u6700\u7d42\u627f\u8a8d\uff08\u51fa\u8377\u5143\u78ba\u8a8d\uff09',
};

export async function POST(req: NextRequest) {
      const { orderId, step } = await req.json();

  if (!orderId || !step) {
          return NextResponse.json({ error: 'orderId and step are required' }, { status: 400 });
  }

  const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, companies(name)')
        .eq('id', orderId)
        .single();

  if (orderError || !order) {
          return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { data: tokenData, error: tokenError } = await supabase
        .from('approval_tokens')
        .insert({ order_id: orderId, step }).select('token').single();

  if (tokenError || !tokenData) {
          return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }

  const approveUrl = 'https://order-relay.vercel.app/api/approve-token?token=' + tokenData.token;
      const toEmail = STEP_EMAILS[step];
      const stepLabel = STEP_LABELS[step];
      const orderNo = order.order_number || orderId;
      const companyName = order.companies?.name || '';
      const productName = order.product_name || '';
      const quantity = order.quantity || '';

  const subject = step <= 3
        ? '\u300a\u627f\u8a8d\u4f9d\u983c\u300b\u767a\u6ce8\u66f8 ' + orderNo + ' - ' + stepLabel
          : '\u300a\u53d7\u6ce8\u78ba\u5b9a\u300b\u767a\u6ce8\u66f8 ' + orderNo + ' - \u5168\u627f\u8a8d\u5b8c\u4e86';

  const tableRows = '<tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>\u767a\u6ce8\u756a\u53f7</b></td><td style="padding:8px;border:1px solid #ddd">' + orderNo + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>\u767a\u6ce8\u5143</b></td><td style="padding:8px;border:1px solid #ddd">' + companyName + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>\u5546\u54c1</b></td><td style="padding:8px;border:1px solid #ddd">' + productName + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>\u6570\u91cf</b></td><td style="padding:8px;border:1px solid #ddd">' + quantity + '</td></tr>';
      const btnHtml = step <= 3 ? '<div style="text-align:center;margin:30px 0"><a href="' + approveUrl + '" style="background:#16a34a;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-size:16px">\u627f\u8a8d\u3059\u308b</a></div>' : '';
      const headerColor = step <= 3 ? '#2563eb' : '#16a34a';
      const headerText = step <= 3 ? '\u767a\u6ce8\u627f\u8a8d\u306e\u3054\u4f9d\u983c' : '\u53d7\u6ce8\u78ba\u5b9a\u306e\u3054\u901a\u77e5';
      const bodyText = step <= 3 ? '\u4ee5\u4e0b\u306e\u767a\u6ce8\u4e8b\u9805\u3092\u3054\u627f\u8a8d\u304f\u3060\u3055\u3044\u3002' : '\u5168\u3066\u306e\u627f\u8a8d\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002\u53d7\u6ce8\u78ba\u5b9a\u3092\u304a\u77e5\u3089\u305b\u3057\u307e\u3059\u3002';

  const html = '<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2 style="color:' + headerColor + '">' + headerText + '</h2><p>' + bodyText + '</p><table style="width:100%;border-collapse:collapse;margin:20px 0">' + tableRows + '</table>' + btnHtml + '</div>';

  await resend.emails.send({
          from: 'Order Relay <onboarding@resend.dev>',
          to: toEmail,
          subject,
          html,
  });

  return NextResponse.json({ success: true, step, approveUrl: step <= 3 ? approveUrl : null });
}
