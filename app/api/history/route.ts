// ============================================================
// 历史推荐查询 API
// 查询当前用户过去 7 天的推荐记录
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 强制动态渲染（使用了 request.url）
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: '缺少 userId 参数' },
        { status: 400 },
      );
    }

    // 查询过去 7 天的推荐记录
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

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

    return NextResponse.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    console.error('[/api/history] Error:', error);
    return NextResponse.json(
      { error: '查询失败' },
      { status: 500 },
    );
  }
}