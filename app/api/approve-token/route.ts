import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const completionHtml = (orderNo: string) => `
  <html><body style="font-family:sans-serif;padding:40px;text-align:center;">
    <h1 style="color:#10b981;">✅ 承認完了</h1>
    <p>注文番号 <strong>${orderNo}</strong> のステップを承認しました。</p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;">次の担当者に通知が送信されました。</p>
  </body></html>
`;

const errorHtml = (msg: string) => `
  <html><body style="font-family:sans-serif;padding:40px;text-align:center;">
    <h1 style="color:#ef4444;">エラー</h1>
    <p>${msg}</p>
  </body></html>
`;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) return NextResponse.redirect(new URL('/', req.url));

  // 1. トークン取得
  const { data: tokenRow, error } = await supabase
    .from('approval_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !tokenRow) {
    return NextResponse.redirect(new URL('/orders?error=invalid_token', req.url));
  }

  if (tokenRow.used) {
    return new NextResponse(errorHtml('このリンクは既に使用済みです。'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return new NextResponse(errorHtml('このリンクの有効期限が切れています。'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  const { order_id: orderId, step } = tokenRow;

  // 2. トークンを使用済みに
  await supabase.from('approval_tokens').update({ used: true }).eq('id', tokenRow.id);

  // 3. 現在のorderを取得
  const { data: currentOrder, error: fetchError } = await supabase
    .from('orders')
    .select('approved_steps, current_step, order_no, flow_route_id')
    .eq('id', orderId)
    .single();

  if (fetchError || !currentOrder) {
    return new NextResponse(errorHtml('注文が見つかりません。'), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // 4. 商流ルートの全ステップ数を取得（DB駆動）
  let totalSteps = 0;
  if (currentOrder.flow_route_id) {
    const { count } = await supabase
      .from('flow_route_companies')
      .select('*', { count: 'exact', head: true })
      .eq('flow_route_id', currentOrder.flow_route_id);
    totalSteps = count || 0;
  } else {
    totalSteps = 4; // フォールバック
  }

  // 5. approved_steps更新
  const currentApproved: number[] = currentOrder.approved_steps || [];
  const newApprovedSteps = currentApproved.includes(step)
    ? currentApproved
    : [...currentApproved, step];

  const nextStep = step + 1;
  const isCompleted = nextStep >= totalSteps;

  const { error: updateError } = await supabase.from('orders').update({
    approved_steps: newApprovedSteps,
    current_step: isCompleted ? totalSteps : nextStep,
    status: isCompleted ? 'completed' : 'in_progress',
    updated_at: new Date().toISOString()
  }).eq('id', orderId);

  if (updateError) {
    console.error('[approve-token] update failed:', updateError);
    return new NextResponse(errorHtml('承認処理に失敗しました。'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // 6. 次ステップへのメール送信（完了でない場合）
  if (!isCompleted) {
    const { data: nextStepCompany } = await supabase
      .from('flow_route_companies')
      .select('approver_email, company_id, role')
      .eq('flow_route_id', currentOrder.flow_route_id)
      .eq('step_order', nextStep)
      .single();

    if (nextStepCompany?.approver_email) {
      const { data: nextCompany } = await supabase
        .from('companies')
        .select('name')
        .eq('id', nextStepCompany.company_id)
        .single();

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://order-relay.vercel.app';
      
      // 次のトークンを発行
      const { data: nextToken } = await supabase
        .from('approval_tokens')
        .insert({ order_id: orderId, step: nextStep })
        .select('token')
        .single();

      if (nextToken) {
        const fromAddress = process.env.MAIL_FROM || 'Order Relay <noreply@orderrelay.com>';
        const nextUrl = `${baseUrl}/api/approve-token?token=${nextToken.token}`;
        
        try {
          await resend.emails.send({
            from: fromAddress,
            to: nextStepCompany.approver_email,
            subject: `【承認依頼】${currentOrder.order_no} - ${nextCompany?.name || ''}`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                <h2 style="color:#4f46e5;">承認依頼が届きました</h2>
                <p>注文番号: <strong>${currentOrder.order_no}</strong></p>
                <p>ステップ: ${nextStep + 1}/${totalSteps}（${nextStepCompany.role}）</p>
                <p>会社: ${nextCompany?.name || '-'}</p>
                <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
                <p style="margin:32px 0;">
                  <a href="${nextUrl}" 
                     style="background:#4f46e5;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
                    このステップを承認する
                  </a>
                </p>
                <p style="color:#6b7280;font-size:12px;">このリンクは7日間有効です。</p>
              </div>
            `,
          });
        } catch (e) {
          console.error('[approve-token] next mail failed:', e);
        }
      }
    }
  }

  return new NextResponse(completionHtml(currentOrder.order_no), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
