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
    return new NextResponse('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>このリンクは使用済みです</h2></body></html>', {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return new NextResponse('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>有効期限切れです</h2></body></html>', {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  const { order_id: orderId, step } = tokenRow;

  // トークンを使用済みにする
  await supabase.from('approval_tokens').update({ used: true }).eq('id', tokenRow.id);

  // 現在のorderを取得して approved_steps を確認
  const { data: currentOrder, error: fetchError } = await supabase
    .from('orders')
    .select('approved_steps, current_step')
    .eq('id', orderId)
    .single();

  if (fetchError || !currentOrder) {
    return new NextResponse(
      '<html><body style="font-family:sans-serif;padding:40px;text-align:center;"><h1>エラー</h1><p>注文が見つかりません</p></body></html>',
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // approved_steps に step を追加（重複は除外）
  const currentApproved: number[] = currentOrder.approved_steps || [];
  const newApprovedSteps = currentApproved.includes(step)
    ? currentApproved
    : [...currentApproved, step];

  // ステップ進行 + 全ステップ完了判定
  const TOTAL_STEPS = 4;
  const nextStep = step + 1;
  const isCompleted = nextStep > TOTAL_STEPS;

  const { error: updateError } = await supabase.from('orders').update({
    approved_steps: newApprovedSteps,
    current_step: isCompleted ? TOTAL_STEPS : nextStep,
    status: isCompleted ? 'completed' : 'in_progress',
    updated_at: new Date().toISOString()
  }).eq('id', orderId);

  if (updateError) {
    console.error('[approve-token] update failed:', updateError);
    return new NextResponse(
      '<html><body style="font-family:sans-serif;padding:40px;text-align:center;"><h1>エラー</h1><p>承認処理に失敗しました</p></body></html>',
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const { data: order } = await supabase.from('orders').select('*, companies(name)').eq('id', orderId).single();
  const orderNo = order?.order_number || orderId;
  const companyName = order?.companies?.name || '';
  const productName = order?.product_name || '';
  const quantity = order?.quantity || '';

  if (!isCompleted) {
    const STEP_EMAILS: Record<number, string> = {
      1: process.env.STEP1_EMAIL || '',
      2: process.env.STEP2_EMAIL || '',
      3: process.env.STEP3_EMAIL || '',
      4: process.env.STEP4_EMAIL || '',
    };
    const STEP_LABELS: Record<number, string> = {
      1: '第1承認（別会社確認）',
      2: '第2承認（仕入先確認）',
      3: '最終承認（出荷元確認）',
      4: '受注確定通知',
    };
    const nextEmail = STEP_EMAILS[nextStep];
    const nextLabel = STEP_LABELS[nextStep];
    const tableRows = '<tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>発注番号</b></td><td style="padding:8px;border:1px solid #ddd">' + orderNo + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>発注元</b></td><td style="padding:8px;border:1px solid #ddd">' + companyName + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>商品</b></td><td style="padding:8px;border:1px solid #ddd">' + productName + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>数量</b></td><td style="padding:8px;border:1px solid #ddd">' + quantity + '</td></tr>';
    const subject = nextStep <= TOTAL_STEPS
      ? '《承認依頼》発注書 ' + orderNo + ' - ' + nextLabel
      : '《受注確定》発注書 ' + orderNo + ' - 全承認完了';
    const html = '<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#16a34a">受注確定のご通知</h2><p>以下の発注が承認されました。</p><table style="width:100%;border-collapse:collapse;margin:20px 0">' + tableRows + '</table></div>';

    if (nextEmail) {
      await resend.emails.send({
        from: 'Order Relay <onboarding@resend.dev>',
        to: nextEmail,
        subject,
        html,
      });
    }
  }

  return new NextResponse('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2 style="color:#16a34a">承認完了</h2><p>発注書 ' + orderNo + ' の承認が完了しました。</p></body></html>', {
    headers: { 'Content-Type': 'text/html' }
  });
}
