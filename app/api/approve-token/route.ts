import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
}

const STEP_EMAILS: Record<number, string> = {
  2: 'info.syc@classic.co.jp',
  3: 'yoshidasyc@gmail.com',
  4: 't.yoshida@classic.co.jp',
};

const STEP_LABELS: Record<number, string> = {
  2: 'Step2: 会示syc',
  3: 'Step3: ゼロテックファーム',
  4: 'Step4: 九州食粮',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tokenValue = searchParams.get('token');
    if (!tokenValue) {
      return new NextResponse('<html><body><h2>Error: token not found</h2></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('approval_tokens')
      .select('*')
      .eq('token', tokenValue)
      .single();
    if (tokenError || !tokenRecord) {
      return new NextResponse('<html><body><h2>Error: invalid token</h2></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    if (tokenRecord.used) {
      return new NextResponse('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>このリンクはすでに使用済みです</h2></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return new NextResponse('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>有効期限切れです</h2></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    const { order_id: orderId, step } = tokenRecord;
    await supabase.from('approval_tokens').update({ used: true }).eq('id', tokenRecord.id);
    const updateField = 'step' + step + '_approved';
    const updateAt = 'step' + step + '_approved_at';
    await supabase.from('orders').update({ [updateField]: true, [updateAt]: new Date().toISOString() }).eq('id', orderId);
    const { data: order } = await supabase.from('orders').select('*, companies(name)').eq('id', orderId).single();
    const orderNo = order?.order_number || orderId;
    const companyName = order?.companies?.name || '';
    const productName = order?.product_name || '';
    const quantity = order?.quantity || '';
    const transporter = createTransporter();
    const nextStep = step + 1;
    if (nextStep <= 4) {
      const nextEmail = STEP_EMAILS[nextStep];
      const nextLabel = STEP_LABELS[nextStep];
      if (nextStep === 4) {
        const subject4 = '《受注確定》発注書 ' + orderNo + ' - 全承認完了';
        const html4 = '<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#16a34a">受注確定のご通知</h2><p>' + nextLabel + ' ご担当者様</p><p>全承認完了となりました。受注対応をお願いいたします。</p><table style="border-collapse:collapse;width:100%"><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>発注番号</b></td><td style="padding:8px;border:1px solid #ddd">' + orderNo + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>発注元</b></td><td style="padding:8px;border:1px solid #ddd">' + companyName + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>商品</b></td><td style="padding:8px;border:1px solid #ddd">' + productName + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>数量</b></td><td style="padding:8px;border:1px solid #ddd">' + quantity + '</td></tr></table></div>';
        await transporter.sendMail({ from: '"Order Relay" <' + process.env.GMAIL_USER + '>', to: nextEmail, subject: subject4, html: html4 });
        await supabase.from('orders').update({ status: 'confirmed' }).eq('id', orderId);
      } else {
        const { data: nextTokenData } = await supabase.from('approval_tokens').insert({ order_id: orderId, step: nextStep }).select('token').single();
        const nextApproveUrl = nextTokenData ? (process.env.NEXT_PUBLIC_APP_URL + '/api/approve-token?token=' + nextTokenData.token) : '';
        const subjectN = '《承認依頼》発注書 ' + orderNo + ' - ' + nextLabel;
        const htmlN = '<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#2563eb">発注承認のご依頼</h2><p>' + nextLabel + ' ご担当者様</p><p>以下の発注書の承認をお願いいたします。</p><table style="border-collapse:collapse;width:100%"><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>発注番号</b></td><td style="padding:8px;border:1px solid #ddd">' + orderNo + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>発注元</b></td><td style="padding:8px;border:1px solid #ddd">' + companyName + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>商品</b></td><td style="padding:8px;border:1px solid #ddd">' + productName + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>数量</b></td><td style="padding:8px;border:1px solid #ddd">' + quantity + '</td></tr></table><div style="text-align:center;margin:30px 0"><a href="' + nextApproveUrl + '" style="background:#16a34a;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-size:16px;font-weight:bold">ワンクリックで承認する</a></div><p style="color:#6b7280;font-size:12px">このリンクは7日間有効です。</p></div>';
        await transporter.sendMail({ from: '"Order Relay" <' + process.env.GMAIL_USER + '>', to: nextEmail, subject: subjectN, html: htmlN });
      }
    }
    const successHtml = '<html><head><meta charset="utf-8"><title>承認完了</title></head><body style="font-family:sans-serif;text-align:center;padding:60px;background:#f0fdf4"><div style="max-width:400px;margin:0 auto;background:white;padding:40px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1)"><div style="font-size:48px;margin-bottom:16px">&#x2705;</div><h2 style="color:#16a34a;margin-bottom:8px">承認が完了しました</h2><p style="color:#6b7280">発注番号: ' + orderNo + '</p><p style="color:#6b7280">ご対応ありがとうございました。</p></div></body></html>';
    return new NextResponse(successHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (err) {
    console.error('approve-token error:', err);
    return new NextResponse('<html><body><h2>エラーが発生しました</h2></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}