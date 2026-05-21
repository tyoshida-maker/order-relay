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

    // 1. 注文を取得
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_no, order_date, delivery_date, current_step, status, flow_route_id, from_company_id, notes')
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

    // 3. 承認者の会社名を取得
    const { data: approverCompany } = await supabase
      .from('companies')
      .select('name')
      .eq('id', stepCompany.company_id)
      .single();

    // 4. 発注元の会社名を取得
    let fromCompanyName = '-';
    if (order.from_company_id) {
      const { data: fromComp } = await supabase
        .from('companies')
        .select('name')
        .eq('id', order.from_company_id)
        .single();
      if (fromComp) fromCompanyName = fromComp.name;
    }

    // 5. 商品明細を取得
    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, unit_price, amount, products(name, category)')
      .eq('order_id', orderId);

    type ItemRow = {
      quantity: number;
      unit_price: number | null;
      amount: number | null;
      products: { name: string; category: string | null } | null;
    };

    const orderItems: ItemRow[] = (items as ItemRow[] | null) || [];

    // 6. 合計金額計算
    const totalAmount = orderItems.reduce((sum, item) => {
      const amt = item.amount ?? ((item.unit_price || 0) * item.quantity);
      return sum + amt;
    }, 0);

    // 7. 商品明細のHTML生成
    const itemsHtml = orderItems.length > 0
      ? orderItems.map(item => {
        const amt = item.amount ?? ((item.unit_price || 0) * item.quantity);
        return `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.products?.name || '-'}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.products?.category || 'ロット'}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">¥${(item.unit_price || 0).toLocaleString()}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">¥${amt.toLocaleString()}</td>
          </tr>
        `;
      }).join('')
      : '<tr><td colspan="5" style="padding:8px;text-align:center;color:#6b7280;">明細なし</td></tr>';

    // 8. 承認トークンをINSERT
    const { data: tokenData, error: tokenError } = await supabase
      .from('approval_tokens')
      .insert({ order_id: orderId, step })
      .select('token')
      .single();

    if (tokenError || !tokenData) {
      console.error('[approve-order] token insert failed:', tokenError);
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
    }

    // 9. 承認URL生成
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://order-relay.vercel.app';
    const approveUrl = `${baseUrl}/api/approve-token?token=${tokenData.token}`;
    const orderDetailUrl = `${baseUrl}/orders/${orderId}`;

    // 10. メール送信
    const fromAddress = process.env.MAIL_FROM || 'Order Relay <noreply@order-relay.net>';
    const subject = `【承認依頼】${order.order_no} - ${approverCompany?.name || 'Order Relay'}`;
    const htmlBody = `
<div style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#f9fafb;">
  <div style="background:white;padding:32px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="color:#4f46e5;margin:0 0 16px;">承認依頼が届きました</h2>
    
    <div style="background:#eff6ff;padding:16px;border-radius:8px;margin-bottom:24px;">
      <p style="margin:4px 0;"><strong>📦 注文番号:</strong> ${order.order_no}</p>
      <p style="margin:4px 0;"><strong>🏢 発注元:</strong> ${fromCompanyName}</p>
      <p style="margin:4px 0;"><strong>📅 発注日:</strong> ${order.order_date}</p>
      ${order.delivery_date ? `<p style="margin:4px 0;"><strong>🚚 納品希望日:</strong> ${order.delivery_date}</p>` : ''}
      <p style="margin:4px 0;"><strong>🔄 ステップ:</strong> ${step + 1} (${stepCompany.role})</p>
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

    ${order.notes ? `
      <div style="background:#fefce8;padding:12px;border-left:4px solid #eab308;margin:16px 0;">
        <p style="margin:0;color:#713f12;"><strong>📝 備考:</strong> ${order.notes}</p>
      </div>
    ` : ''}

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

    try {
      await resend.emails.send({
        from: fromAddress,
        to: stepCompany.approver_email,
        subject,
        html: htmlBody,
      });
    } catch (mailError) {
      console.error('[approve-order] mail send failed:', mailError);
    }

    return NextResponse.json({
      success: true,
      step,
      approveUrl,
      sentTo: stepCompany.approver_email,
      orderTotal: totalAmount,
      itemsCount: orderItems.length
    });

  } catch (e) {
    console.error('[approve-order] unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
