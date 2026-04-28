export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

const STEP_LABELS: Record<number, string> = {
  1: 'Step1: 株式会示創未家',
  2: 'Step2: 会示syc',
  3: 'Step3: ゼロテックファーム',
  4: 'Step4: 九州食粮',
};

const STEP_EMAILS: Record<number, string> = {
  1: 'classicty0927@gmail.com',
  2: 'info.syc@classic.co.jp',
  3: 'yoshidasyc@gmail.com',
  4: 't.yoshida@classic.co.jp',
};

export async function POST(req: NextRequest) {
  try {
    const { orderId, step } = await req.json();
    if (!orderId || !step) {
      return NextResponse.json({ error: 'orderId and step are required' }, { status: 400 });
    }
    const { data: order, error: orderError } = await supabase
      .from('orders').select('*, companies(name)').eq('id', orderId).single();
    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    const { data: tokenData, error: tokenError } = await supabase
      .from('approval_tokens').insert({ order_id: orderId, step }).select('token').single();
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
    const transporter = createTransporter();
    const subject = step <= 3
      ? '《承認依頼》発注書 ' + orderNo + ' - ' + stepLabel
      : '《受注確定》発注書 ' + orderNo + ' - 全承認完了';
    const tableRows = '<tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>発注番号</b></td><td style="padding:8px;border:1px solid #ddd">' + orderNo + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>発注元</b></td><td style="padding:8px;border:1px solid #ddd">' + companyName + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>商品</b></td><td style="padding:8px;border:1px solid #ddd">' + productName + '</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>数量</b></td><td style="padding:8px;border:1px solid #ddd">' + quantity + '</td></tr>';
    const btnHtml = step <= 3 ? '<div style="text-align:center;margin:30px 0"><a href="' + approveUrl + '" style="background:#16a34a;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-size:16px;font-weight:bold">ワンクリックで承認する</a></div><p style="color:#6b7280;font-size:12px">このリンクは7日間有効です。</p>' : '';
    const headerColor = step <= 3 ? '#2563eb' : '#16a34a';
    const headerText = step <= 3 ? '発注承認のご依頼' : '受注確定のご通知';
    const bodyText = step <= 3 ? '以下の発注書の承認をお願いいたします。' : '全承認完了となりました。受注対応をお願いいたします。';
    const html = '<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2 style="color:' + headerColor + '">' + headerText + '</h2><p>' + stepLabel + ' ご担当者様</p><p>' + bodyText + '</p><table style="border-collapse:collapse;width:100%">' + tableRows + '</table>' + btnHtml + '</div>';
    await transporter.sendMail({ from: '"Order Relay" <' + process.env.GMAIL_USER + '>', to: toEmail, subject, html });
    return NextResponse.json({ success: true, step, approveUrl: step <= 3 ? approveUrl : null });
  } catch (err) {
    console.error('approve-order error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}