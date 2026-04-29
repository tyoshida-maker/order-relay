import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

export async function GET(req: NextRequest) {
      const token = req.nextUrl.searchParams.get('token');
      if (!token) return NextResponse.redirect(new URL('/', req.url));

  const { data: tokenRow, error } = await supabase
        .from('approval_tokens')
        .select('*')
        .eq('token', token)
        .single();

  if (error || !tokenRow) {
          return NextResponse.redirect(new URL('/orders?error=invalid_token', req.url));
  }

  if (tokenRow.used) {
          return new NextResponse('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>\u3053\u306e\u30ea\u30f3\u30af\u306f\u4f7f\u7528\u6e08\u307f\u3067\u3059</h2></body></html>', { headers: { 'Content-Type': 'text/html' } });
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
          return new NextResponse('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>\u6709\u52b9\u671f\u9650\u5207\u308c\u3067\u3059</h2></body></html>', { headers: { 'Content-Type': 'text/html' } });
  }

  const { order_id: orderId, step } = tokenRow;
      await supabase.from('approval_tokens').update({ used: true }).eq('id', tokenRow.id);
      const updateField = 'step' + step + '_approved';
      const updateAt = 'step' + step + '_approved_at';
      await supabase.from('orders').update({ [updateField]: true, [updateAt]: new Date().toISOString() }).eq('id', orderId);

  const { data: order } = await supabase.from('orders').select('*, companies(name)').eq('id', orderId).single();
      const orderNo = order?.order_number || orderId;
      const companyName = order?.companies?.name || '';
      const productName = order?.product_name || '';
      const quantity = order?.quantity || '';

  const nextStep = step + 1;
      if (nextStep <= 4) {
              const STEP_EMAILS: Record<number, string> = {
                        1: process.env.STEP1_EMAIL || '',
                        2: process.env.STEP2_EMAIL || '',
                        3: process.env.STEP3_EMAIL || '',
                        4: process.env.STEP4_EMAIL || '',
              };
              const STEP_LABELS: Record<number, string> = {
                        1: '\u7b2c1\u627f\u8a8d\uff08\u5225\u4f1a\u793e\u78ba\u8a8d\uff09',
                        2: '\u7b2c2\u627f\u8a8d\uff08\u4ed2\u5165\u5148\u78ba\u8a8d\uff09',
                        3: '\u6700\u7d42\u627f\u8a8d\uff08\u51fa\u8377\u5143\u78ba\u8a8d\uff09',
                        4: '\u53d7\u6ce8\u78ba\u5b9a\u901a\u77e5',
              };
              const nextEmail = STEP_EMAILS[nextStep];
              const nextLabel = STEP_LABELS[nextStep];
              const tableRows = '<tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>\u767a\u6ce8\u756a\u53f7</b></td><td style="padding:8px;border:1px solid #ddd">' + orderNo + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>\u767a\u6ce8\u5143</b></td><td style="padding:8px;border:1px solid #ddd">' + companyName + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>\u5546\u54c1</b></td><td style="padding:8px;border:1px solid #ddd">' + productName + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>\u6570\u91cf</b></td><td style="padding:8px;border:1px solid #ddd">' + quantity + '</td></tr>';
              const subject = nextStep <= 3 ? '\u300a\u627f\u8a8d\u4f9d\u983c\u300b\u767a\u6ce8\u66f8 ' + orderNo + ' - ' + nextLabel : '\u300a\u53d7\u6ce8\u78ba\u5b9a\u300b\u767a\u6ce8\u66f8 ' + orderNo + ' - \u5168\u627f\u8a8d\u5b8c\u4e86';
              const html = '<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#16a34a">\u53d7\u6ce8\u78ba\u5b9a\u306e\u3054\u901a\u77e5</h2><p>\u4ee5\u4e0b\u306e\u767a\u6ce8\u304c\u627f\u8a8d\u3055\u308c\u307e\u3057\u305f\u3002</p><table style="width:100%;border-collapse:collapse;margin:20px 0">' + tableRows + '</table></div>';
              if (nextEmail) {
                        await resend.emails.send({
                                    from: 'Order Relay <onboarding@resend.dev>',
                                    to: nextEmail,
                                    subject,
                                    html,
                        });
              }
      }

  return new NextResponse('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2 style="color:#16a34a">\u627f\u8a8d\u5b8c\u4e86</h2><p>\u767a\u6ce8\u66f8 ' + orderNo + ' \u306e\u627f\u8a8d\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002</p></body></html>', { headers: { 'Content-Type': 'text/html' } });
}
