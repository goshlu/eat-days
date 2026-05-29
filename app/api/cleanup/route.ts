// ============================================================
// 定时清理任务：删除超过 7 天的黑名单记录
// 由 Vercel Cron Job 每天凌晨 3 点触发
// ============================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const result = await prisma.blacklistItem.deleteMany({
      where: {
        createdAt: { lt: cutoff },
      },
    });

    console.log(`[Cleanup] Deleted ${result.count} expired blacklist items`);

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      cutoffDate: cutoff.toISOString(),
    });
  } catch (error) {
    console.error('[Cleanup] Error:', error);
    return NextResponse.json(
      { error: '清理任务失败' },
      { status: 500 },
    );
  }
}