// ============================================================
// 发送报告邮件 API
// 使用 Resend 发送包含风味雷达图的报告
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createRequestLogger } from '@/lib/logger';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  const logger = createRequestLogger(requestId);

  try {
    const { to, subject, html, userName } = await req.json();

    if (!to) {
      return NextResponse.json({ error: '缺少收件人邮箱' }, { status: 400 });
    }

    logger.info({ to, subject }, 'Sending report email');

    const { data, error } = await resend.emails.send({
      from: '一人食·川菜推荐官 <report@sichuan-solo.app>',
      to: [to],
      subject: subject || '您的月度饮食报告',
      html: html || '<p>报告内容加载失败</p>',
    });

    if (error) {
      logger.error({ error }, 'Resend API error');
      return NextResponse.json({ error: '发送邮件失败' }, { status: 500 });
    }

    logger.info({ emailId: data?.id }, 'Report email sent successfully');

    return NextResponse.json({
      success: true,
      emailId: data?.id,
    });
  } catch (error) {
    logger.error({ error }, 'Send report email failed');
    return NextResponse.json({ error: '发送邮件失败' }, { status: 500 });
  }
}
