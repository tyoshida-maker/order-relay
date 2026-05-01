import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId: string = body.orderId || body.order_id;
    const step: number = body.step ?? 0;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    // 1. 注文と商流ルートを取得
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_no, current_step, status, flow_route_id, from_company_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.flow_route_id) {
      return NextResponse.json({ error: 'Order has no flow_route_id' }, { status: 400 });
    }

    // 2. flow_route_companies から step に対応する承認者を取得
    const { data: stepCompany, error: stepError } = await supabase
      .from('flow_route_companies')
      .select('approver_email, company_id, role, step_order, company_slug')
      .eq('flow_route_id', order.flow_route_id)
      .eq('step_order', step)
      .single();

    if (stepError || !stepCompany) {
      return NextResponse.json({ error: `No company found at step ${step}` }, { status: 404 });
    }

    if (!stepCompany.approver_email) {
      return NextResponse.json(
        { error: `No approver_email set for step ${step}` },
        { status: 400 }
      );
    }

    // 3. 会社名を取得
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', stepCompany.company_id)
      .single();

    // 4. 承認トークンをINSERT
    const { data: tokenData, error: tokenError } = await supabase
      .from('approval_tokens')
      .insert({ order_id: orderId, step })
      .select('token')
      .single();

    if (tokenError || !tokenData) {
      console.error('[approve-order] token insert failed:', tokenError);
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
    }

    // 5. 承認URL生成
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://order-relay.vercel.app';
    const approveUrl = `${baseUrl}/api/approve-token?token=${tokenData.token}`;

    // 6. メール送信
    const fromAddress = process.env.MAIL_FROM || 'Order Relay <noreply@orderrelay.com>';
    const subject = `【承認依頼】${order.order_no} - ${company?.name || 'Order Relay'}`;
    const htmlBody = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#4f46e5;">承認依頼が届きました</h2>
        <p>注文番号: <strong>${order.order_no}</strong></p>
        <p>ステップ: ${step + 1}（${stepCompany.role}）</p>
        <p>会社: ${company?.name || '-'}</p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p>下記ボタンをクリックすると承認が完了します。</p>
        <p style="margin:32px 0;">
          <a href="${approveUrl}" 
             style="background:#4f46e5;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
            このステップを承認する
          </a>
        </p>
        <p style="color:#6b7280;font-size:12px;">
          このリンクは7日間有効です。<br>
          システムから自動送信されています。返信は不要です。
        </p>
      </div>
    `;

    try {
      await resend.emails.send({
        from: fromAddress,
        to: stepCompany.approver_email,
        subject,
        html: htmlBody,
      });
    } catch (mailError) {
      console.error('[approve-order] mail send failed:', mailError);
      // メール送信失敗してもトークンは作成済みなのでURLを返す
    }

    return NextResponse.json({ 
      success: true, 
      step, 
      approveUrl,
      sentTo: stepCompany.approver_email 
    });

  } catch (e) {
    console.error('[approve-order] unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
