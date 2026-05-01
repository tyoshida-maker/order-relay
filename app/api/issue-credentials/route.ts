import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let pw = '';
  for (let i = 0; i < length; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { flow_route_company_id } = body;

    if (!flow_route_company_id) {
      return NextResponse.json({ error: 'flow_route_company_id is required' }, { status: 400 });
    }

    // 1. flow_route_companies からレコード取得
    const { data: frc, error: frcError } = await supabaseAdmin
      .from('flow_route_companies')
      .select(`
        id, flow_route_id, company_id, role, step_order, company_slug, approver_email,
        flow_routes ( name ),
        companies ( name )
      `)
      .eq('id', flow_route_company_id)
      .single();

    if (frcError || !frc) {
      return NextResponse.json({ error: 'flow_route_company not found' }, { status: 404 });
    }

    if (!frc.approver_email) {
      return NextResponse.json({ error: '承認者メールアドレスが未登録です' }, { status: 400 });
    }

    const email = frc.approver_email;
    const companyName = (frc.companies as any)?.name || '-';
    const routeName = (frc.flow_routes as any)?.name || '-';
    const role = frc.role;
    const slug = frc.company_slug;
    const loginId = `${role}_${slug}`.toLowerCase().replace(/[^a-z0-9_-]/g, '');

    // 2. 既に発行済みかチェック
    const { data: existingUser } = await supabaseAdmin
      .from('flow_route_users')
      .select('id, user_id, login_id')
      .eq('flow_route_id', frc.flow_route_id)
      .eq('company_id', frc.company_id)
      .maybeSingle();

    const newPassword = generatePassword();
    let userId: string;
    let isReissue = false;

    if (existingUser) {
      // 再発行: 既存ユーザーのパスワードを更新
      isReissue = true;
      userId = existingUser.user_id;
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
      if (updateError) {
        return NextResponse.json({ error: 'パスワード更新失敗: ' + updateError.message }, { status: 500 });
      }
    } else {
      // 新規発行: Supabase Auth に登録
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true,
        user_metadata: { company_id: frc.company_id, role, login_id: loginId },
      });

      if (authError || !authUser.user) {
        return NextResponse.json({ 
          error: 'Auth登録失敗: ' + (authError?.message || 'unknown') 
        }, { status: 500 });
      }

      userId = authUser.user.id;

      // or_user_profiles にも登録
      const profileRole = role === 'buyer' ? 'orderer'
        : role === 'middle' ? 'intermediary'
        : 'shipper';
      
      await supabaseAdmin.from('or_user_profiles').insert({
        id: userId,
        email,
        role: profileRole,
        company_id: frc.company_id,
        display_name: `${companyName}担当者`,
      });

      // flow_route_users に登録
      await supabaseAdmin.from('flow_route_users').insert({
        flow_route_id: frc.flow_route_id,
        company_id: frc.company_id,
        user_id: userId,
        login_id: loginId,
        initial_password_sent_at: new Date().toISOString(),
        password_reset_required: true,
      });
    }

    // 3. メール送信
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://order-relay.vercel.app';
    const portalUrl = `${baseUrl}/${role}/${slug}`;
    const fromAddress = process.env.MAIL_FROM || 'Order Relay <noreply@orderrelay.com>';

    const subject = isReissue
      ? `【再発行】${companyName}様 ログイン情報のお知らせ`
      : `【発行】${companyName}様 ログイン情報のお知らせ`;

    const htmlBody = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#4f46e5;">${companyName}様</h2>
        <p>商流ルート「<strong>${routeName}</strong>」の${role === 'buyer' ? '発注者' : role === 'middle' ? '中間者' : '発送者'}として、専用ポータルのログイン情報を${isReissue ? '<strong style="color:#dc2626;">再発行</strong>' : '発行'}しました。</p>
        
        <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:24px 0;">
          <h3 style="margin-top:0;color:#374151;">ログイン情報</h3>
          <p><strong>専用URL:</strong><br><a href="${portalUrl}" style="color:#4f46e5;">${portalUrl}</a></p>
          <p><strong>メールアドレス（ログインID）:</strong><br><code style="background:#fff;padding:4px 8px;border-radius:4px;">${email}</code></p>
          <p><strong>初期パスワード:</strong><br><code style="background:#fff;padding:4px 8px;border-radius:4px;font-size:16px;">${newPassword}</code></p>
        </div>

        <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;">
          <p style="margin:0;font-size:14px;color:#92400e;">
            ⚠️ セキュリティのため、初回ログイン後にパスワードを変更してください。
          </p>
        </div>

        <p style="margin-top:32px;">
          <a href="${portalUrl}" 
             style="background:#4f46e5;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
            専用ポータルへアクセス
          </a>
        </p>

        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="color:#6b7280;font-size:12px;">
          このメールに心当たりがない場合は破棄してください。<br>
          システムから自動送信されています。
        </p>
      </div>
    `;

    try {
      await resend.emails.send({
        from: fromAddress,
        to: email,
        subject,
        html: htmlBody,
      });
    } catch (mailError) {
      console.error('[issue-credentials] mail send failed:', mailError);
    }

    return NextResponse.json({
      success: true,
      isReissue,
      email,
      loginId,
      portalUrl,
      companyName,
    });

  } catch (e: any) {
    console.error('[issue-credentials] error:', e);
    return NextResponse.json({ error: e.message || 'unknown error' }, { status: 500 });
  }
}
