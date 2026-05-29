// ============================================================
// 删除用户账户 API
// 删除用户的所有推荐、黑名单、反馈、会话数据
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { userId, confirm } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: '缺少 userId 参数' },
        { status: 400 },
      );
    }

    // 必须确认才能删除
    if (confirm !== 'DELETE_MY_ACCOUNT') {
      return NextResponse.json(
        { error: '请提供确认码' },
        { status: 400 },
      );
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 },
      );
    }

    // 并行删除所有用户数据
    const [deletedRecommendations, deletedBlacklist, deletedFeedbacks, deletedSessions, deletedAccounts] = await Promise.all([
      prisma.recommendation.deleteMany({ where: { userId } }),
      prisma.blacklistItem.deleteMany({ where: { userId } }),
      prisma.feedback.deleteMany({ where: { userId } }),
      prisma.session.deleteMany({ where: { userId } }),
      prisma.account.deleteMany({ where: { userId } }),
    ]);

    // 最后删除用户本身
    await prisma.user.delete({ where: { id: userId } });

    console.log(`[DeleteAccount] User ${userId} (${user.name || user.email}) deleted`);

    return NextResponse.json({
      success: true,
      message: '账户已删除',
      deleted: {
        recommendations: deletedRecommendations.count,
        blacklistItems: deletedBlacklist.count,
        feedbacks: deletedFeedbacks.count,
        sessions: deletedSessions.count,
        accounts: deletedAccounts.count,
      },
    });
  } catch (error) {
    console.error('[/api/delete-account] Error:', error);
    return NextResponse.json(
      { error: '删除账户失败' },
      { status: 500 },
    );
  }
}
