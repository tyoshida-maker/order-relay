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

type ItemRow = {
    quantity: number;
    unit_price: number | null;
    amount: number | null;
    products: { name: string; category: string | null } | null;
};

async function buildApprovalEmailHtml(
    orderId: string,
    step: number,
    totalSteps: number,
    approveUrl: string,
    orderDetailUrl: string
  ) {
    const { data: order } = await supabase
      .from('orders')
      .select('order_no, order_date, delivery_date, notes, from_company_id, flow_route_id')
      .eq('id', orderId)
      .single();

  if (!order) return null;

  const { data: stepCompany } = await supabase
      .from('flow_route_companies')
      .select('approver_email, company_id, role')
      .eq('flow_route_id', order.flow_route_id)
      .eq('step_order', step)
      .single();

  const { data: approverCompany } = stepCompany
      ? await supabase.from('companies').select('name').eq('id', stepCompany.company_id).single()
        : { data: null };

  let fromCompanyName = '-';
    if (order.from_company_id) {
          const { data: fromComp } = await supabase
            .from('companies')
            .select('name')
            .eq('id', order.from_company_id)
            .single();
          if (fromComp) fromCompanyName = fromComp.name;
    }

  const { data: items } = await supabase
      .from('order_items')
      .select('quantity, unit_price, amount, products(name, category)')
      .eq('order_id', orderId);

  const orderItems: ItemRow[] = (items as ItemRow[] | null) || [];

  const totalAmount = orderItems.reduce((sum, item) => {
        const amt = item.amount ?? (item.unit_price || 0) * item.quantity;
        return sum + amt;
  }, 0);

  const itemsHtml =
        orderItems.length > 0
        ? orderItems
              .map((item) => {
                            const amt = item.amount ?? (item.unit_price || 0) * item.quantity;
                            return `
                                    <tr>
                                              <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.products?.name || '-'}</td>
                                                        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${item.quantity}</td>
                                                                  <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.products?.category || 'ロット'}</td>
                                                                            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">¥${(item.unit_price || 0).toLocaleString()}</td>
                                                                                      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">¥${amt.toLocaleString()}</td>
                                                                                              </tr>`;
              })
              .join('')
          : '<tr><td colspan="5" style="padding:8px;text-align:center;color:#6b7280;">明細なし</td></tr>';

    return `
    <div style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#f9fafb;">
      <div style="background:white;padding:32px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color:#4f46e5;margin:0 0 16px;">承認依頼が届きました</h2>
              <div style="background:#eff6ff;padding:16px;border-radius:8px;margin-bottom:24px;">
                    <p style="margin:4px 0;"><strong>📦 注文番号:</strong> ${order.order_no}</p>
                          <p style="margin:4px 0;"><strong>🏢 発注元:</strong> ${fromCompanyName}</p>
                                <p style="margin:4px 0;"><strong>📅 発注日:</strong> ${order.order_date}</p>
                                      ${order.delivery_date ? `<p style="margin:4px 0;"><strong>🚚 納品希望日:</strong> ${order.delivery_date}</p>` : ''}
                                            <p style="margin:4px 0;"><strong>🔄 ステップ:</strong> ${step + 1}/${totalSteps} (${stepCompany?.role || '-'})</p>
                                                  <p style="margin:4px 0;"><strong>👤 承認会社:</strong> ${approverCompany?.name || '-'}</p>
                                                      </div>
                                                          <h3 style="color:#1f2937;margin:24px 0 12px;border-bottom:2px solid #4f46e5;padding-bottom:8px;">📋 発注明細</h3>
                                                              <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                                                                    <thead>
                                                                            <tr style="background:#f3f4f6;">
                                                                                      <th style="padding:8px;text-align:left;border-bottom:2px solid #d1d5db;">商品</th>
                                                                                                <th style="padding:8px;text-align:right;border-bottom:2px solid #d1d5db;">数量</th>
                                                                                                          <th style="padding:8px;text-align:left;border-bottom:2px solid #d1d5db;">単位</th>
                                                                                                                    <th style="padding:8px;text-align:right;border-bottom:2px solid #d1d5db;">単価</th>
                                                                                                                              <th style="padding:8px;text-align:right;border-bottom:2px solid #d1d5db;">金額</th>
                                                                                                                                      </tr>
                                                                                                                                            </thead>
                                                                                                                                                  <tbody>
                                                                                                                                                          ${itemsHtml}
                                                                                                                                                                </tbody>
                                                                                                                                                                      <tfoot>
                                                                                                                                                                              <tr style="background:#fef3c7;">
                                                                                                                                                                                        <td colspan="4" style="padding:12px 8px;text-align:right;font-weight:bold;">合計</td>
                                                                                                                                                                                                  <td style="padding:12px 8px;text-align:right;font-weight:bold;font-size:18px;color:#dc2626;">¥${totalAmount.toLocaleString()}</td>
                                                                                                                                                                                                          </tr>
                                                                                                                                                                                                                </tfoot>
                                                                                                                                                                                                                    </table>
                                                                                                                                                                                                                        ${
                                                                                                                                                                                                                                order.notes
                                                                                                                                                                                                                                  ? `<div style="background:#fefce8;padding:12px;border-left:4px solid #eab308;margin:16px 0;">
                                                                                                                                                                                                                                          <p style="margin:0;color:#713f12;"><strong>📝 備考:</strong> ${order.notes}</p>
                                                                                                                                                                                                                                                </div>`
                                                                                                                                                                                                                                  : ''
                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
                                                                                                                                                                                                                                      <p style="color:#374151;margin:16px 0;">下記ボタンをクリックすると承認が完了し、次のステップに自動で通知されます。</p>
                                                                                                                                                                                                                                          <p style="margin:32px 0;text-align:center;">
                                                                                                                                                                                                                                                <a href="${approveUrl}"
                                                                                                                                                                                                                                                        style="background:#4f46e5;color:white;padding:16px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;font-size:16px;">
                                                                                                                                                                                                                                                                ✅ このステップを承認する
                                                                                                                                                                                                                                                                      </a>
                                                                                                                                                                                                                                                                          </p>
                                                                                                                                                                                                                                                                              <p style="text-align:center;margin:16px 0;">
                                                                                                                                                                                                                                                                                    <a href="${orderDetailUrl}" style="color:#4f46e5;text-decoration:underline;font-size:14px;">
                                                                                                                                                                                                                                                                                            詳細をブラウザで確認する →
                                                                                                                                                                                                                                                                                                  </a>
                                                                                                                                                                                                                                                                                                      </p>
                                                                                                                                                                                                                                                                                                          <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
                                                                                                                                                                                                                                                                                                              <p style="color:#6b7280;font-size:12px;text-align:center;">
                                                                                                                                                                                                                                                                                                                    このリンクは7日間有効です。<br>
                                                                                                                                                                                                                                                                                                                          システムから自動送信されています。返信は不要です。
                                                                                                                                                                                                                                                                                                                              </p>
                                                                                                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                                                                                                                  <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px;">
                                                                                                                                                                                                                                                                                                                                      powered by order-relay
                                                                                                                                                                                                                                                                                                                                        </p>
                                                                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                                                                                        `;
}

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
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
        return new NextResponse(errorHtml('このリンクの有効期限が切れています。'), {
                status: 400,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
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
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
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
          totalSteps = 4;
    }

  // 5. approved_steps更新
  const currentApproved: number[] = currentOrder.approved_steps || [];
    const newApprovedSteps = currentApproved.includes(step)
      ? currentApproved
          : [...currentApproved, step];

  const nextStep = step + 1;
    const isCompleted = nextStep >= totalSteps;

  const { error: updateError } = await supabase
      .from('orders')
      .update({
              approved_steps: newApprovedSteps,
              current_step: isCompleted ? totalSteps : nextStep,
              status: isCompleted ? 'completed' : 'in_progress',
              updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

  if (updateError) {
        console.error('[approve-token] update failed:', updateError);
        return new NextResponse(errorHtml('承認処理に失敗しました。'), {
                status: 500,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
  }

  // 6. 次ステップへの詳細メール送信
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

          const baseUrl =
                    process.env.NEXT_PUBLIC_BASE_URL || 'https://order-relay.vercel.app';

          // 次のトークン発行
          const { data: nextToken } = await supabase
                .from('approval_tokens')
                .insert({ order_id: orderId, step: nextStep })
                .select('token')
                .single();

          if (nextToken) {
                    const fromAddress =
                                process.env.MAIL_FROM || 'Order Relay <noreply@order-relay.net>';
                    const nextApproveUrl = `${baseUrl}/api/approve-token?token=${nextToken.token}`;
                    const orderDetailUrl = `${baseUrl}/orders/${orderId}`;

                const detailedHtml = await buildApprovalEmailHtml(
                            orderId,
                            nextStep,
                            totalSteps,
                            nextApproveUrl,
                            orderDetailUrl
                          );

                try {
                            await resend.emails.send({
                                          from: fromAddress,
                                          to: nextStepCompany.approver_email,
                                          subject: `【承認依頼】${currentOrder.order_no} - ${nextCompany?.name || ''}`,
                                          html:
                                                          detailedHtml ||
                                                          `
                                                          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                                                            <h2 style="color:#4f46e5;">承認依頼が届きました</h2>
                                                              <p>注文番号: <strong>${currentOrder.order_no}</strong></p>
                                                                <p>ステップ: ${nextStep + 1}/${totalSteps}（${nextStepCompany.role}）</p>
                                                                  <p>会社: ${nextCompany?.name || '-'}</p>
                                                                    <p style="margin:32px 0;">
                                                                        <a href="${nextApproveUrl}"
                                                                               style="background:#4f46e5;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
                                                                                     このステップを承認する
                                                                                         </a>
                                                                                           </p>
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
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
