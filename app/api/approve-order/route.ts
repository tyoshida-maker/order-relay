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
  1: 'Step1: 株式会社創未家',
  2: 'Step2: 会社syc',
  3: 'Step3: ゼロテックファーム',
  4: 'Step4: 九州食糧',
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

    // 現在の注文情報を取得
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, companies(name)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // approval_tokens テーブルにトークン生成
    const { data: tokenData, error: tokenError } = await supabase
      .from('approval_tokens')
      .insert({ order_id: orderId, step })
      .select('token')
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
    }

    const approveUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/approve-token?token=${tokenData.token}`;
    const toEmail = STEP_EMAILS[step];
    const stepLabel = STEP_LABELS[step];
    const orderNo = order.order_number || orderId;
    const companyName = order.companies?.name || '不明';

    const transporter = createTransporter();

    if (step <= 3) {
      // 承認依頼メール
      await transporter.sendMail({
        from: `"Order Relay" <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: `【承認依頼】発注書 ${orderNo} - ${stepLabel}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">発注承認のご依頼</h2>
            <p>${stepLabel} ご担当者様</p>
            <p>以下の発注書の承認をお願いいたします。</p>
            <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: bold;">発注番号</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${orderNo}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: bold;">発注元</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${companyName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: bold;">商品</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${order.product_name || ''}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: bold;">数量</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${order.quantity || ''}</td>
              </tr>
            </table>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${approveUrl}" style="background-color: #16a34a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                ワンクリックで承認する
              </a>
            </div>
            <p style="color: #6b7280; font-size: 12px;">このリンクは7日間有効です。</p>
          </div>
        `,
      });
    } else {
      // Step4: 九州食糧への確定通知
      await transporter.sendMail({
        from: `"Order Relay" <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: `【受注確定】発注書 ${orderNo} - 全承認完了`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">受注確定のご通知</h2>
            <p>九州食糧 ご担当者様</p>
            <p>以下の発注書が全承認完了となりました。受注対応をお願いいたします。</p>
            <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: bold;">発注番号</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${orderNo}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: bold;">発注元</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${companyName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: bold;">商品</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${order.product_name || ''}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f9fafb; font-weight: bold;">数量</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${order.quantity || ''}</td>
              </tr>
            </table>
            <p style="color: #6b7280; font-size: 12px;">Order Relay システムより自動送信</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true, step, approveUrl: step <= 3 ? approveUrl : null });
  } catch (err) {
    console.error('approve-order error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
