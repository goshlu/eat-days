// ============================================================
// 历史推荐查询 API
// 查询当前用户过去 N 天的推荐记录（默认7天）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRequestLogger } from '@/lib/logger';

// 强制动态渲染（使用了 request.url）
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  const logger = createRequestLogger(requestId);

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const days = parseInt(searchParams.get('days') || '7');

    if (!userId) {
      return NextResponse.json(
        { error: '缺少 userId 参数' },
        { status: 400 },
      );
    }

    // 查询过去 N 天的推荐记录
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const recommendations = await prisma.recommendation.findMany({
      where: {
        userId,
        date: { gte: cutoff },
      },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        cook: true,
        takeout: true,
        eatOut: true,
      },
    });

    logger.info({ userId, days, count: recommendations.length }, 'History query completed');

    return NextResponse.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    logger.error({ error }, 'History query failed');
    return NextResponse.json(
      { error: '查询失败' },
      { status: 500 },
    );
  }
}