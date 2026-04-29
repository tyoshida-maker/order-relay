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
              2: '\u7b2c2\u627f\u8a8d\uff08\u4ed2\u4e16\u4eba\u78ba\u8a8d\uff09',
              3: '\u7b2c3\u627f\u8a8d\uff08\u6700\u7d42\u627f\u8a8d\uff09',
};

export async function POST(req: NextRequest) {
        try {
                  const body = await req.json();
                  // Support both orderId and order_id, step defaults to 1
          const orderId: string = body.orderId || body.order_id;
                  const step: number = body.step || 1;

          if (!orderId) {
                      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
          }

          const { data: order, error: orderError } = await supabase
                    .from('orders')
                    .select('id, order_no, current_step, status')
                    .eq('id', orderId)
                    .single();

          if (orderError || !order) {
                      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
          }

          const token = crypto.randomUUID();
                  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

          const { error: tokenError } = await supabase
                    .from('approval_tokens')
                    .insert({ order_id: orderId, step, token, expires_at: expiresAt, used: false });

          if (tokenError) {
                      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
          }

          const approveUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://order-relay.vercel.app'}/api/approve-token?token=${token}`;
                  const toEmail = STEP_EMAILS[step];
                  const stepLabel = STEP_LABELS[step] || `\u7b2c${step}\u627f\u8a8d`;

          if (toEmail) {
                      await resend.emails.send({
                                    from: 'Order Relay <noreply@order-relay.com>',
                                    to: toEmail,
                                    subject: `[\u627f\u8a8d\u4f9d\u983c] ${order.order_no} - ${stepLabel}`,
                                    html: `
                                              <h2>\u767a\u6ce8\u627f\u8a8d\u306e\u4f9d\u983c</h2>
                                                        <p>\u6ce8\u6587\u756a\u53f7: <strong>${order.order_no}</strong></p>
                                                                  <p>\u627f\u8a8d\u30b9\u30c6\u30c3\u30d7: ${stepLabel}</p>
                                                                            <p>\u4ee5\u4e0b\u306e\u30dc\u30bf\u30f3\u3092\u30af\u30ea\u30c3\u30af\u3057\u3066\u627f\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\uff1a</p>
                                                                                      <a href="${approveUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">\u627f\u8a8d\u3059\u308b</a>
                                                                                                <p style="color:#666;font-size:12px;">\u3053\u306e\u30ea\u30f3\u30af\u306f24\u6642\u9593\u6709\u52b9\u3067\u3059\u3002</p>
                                                                                                        `,
                      });
          }

          return NextResponse.json({ success: true, approveUrl });
        } catch (err) {
                  console.error('approve-order error:', err);
                  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
}
