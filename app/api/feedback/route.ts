// ============================================================
// 推荐反馈 API
// 存储用户对推荐的评分（👍/👎）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      recommendationId,
      rating,
      cookDish,
      takeoutDish,
      eatOutDish,
      section,
      spicyLevel,
      dislikes,
      comment,
    } = body;

    // 参数校验
    if (!rating || (rating !== 1 && rating !== -1)) {
      return NextResponse.json(
        { error: 'rating 必须是 1 或 -1' },
        { status: 400 },
      );
    }

    if (!cookDish && !takeoutDish && !eatOutDish) {
      return NextResponse.json(
        { error: '至少需要一个菜品名' },
        { status: 400 },
      );
    }

    // 存储反馈
    const feedback = await prisma.feedback.create({
      data: {
        userId: userId || null,
        recommendationId: recommendationId || null,
        rating,
        cookDish: cookDish || '',
        takeoutDish: takeoutDish || '',
        eatOutDish: eatOutDish || '',
        section: section || null,
        spicyLevel: spicyLevel || 3,
        dislikes: dislikes || [],
        comment: comment || null,
      },
    });

    console.log(`[Feedback] ${rating > 0 ? '👍' : '👎'} saved: ${feedback.id}`);

    return NextResponse.json({
      success: true,
      id: feedback.id,
    });
  } catch (error) {
    console.error('[/api/feedback] Error:', error);
    return NextResponse.json(
      { error: '保存反馈失败' },
      { status: 500 },
    );
  }
}

// GET - 查询反馈统计（管理员用）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '7');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // 总体统计
    const [totalPositive, totalNegative] = await Promise.all([
      prisma.feedback.count({ where: { rating: 1, createdAt: { gte: cutoff } } }),
      prisma.feedback.count({ where: { rating: -1, createdAt: { gte: cutoff } } }),
    ]);

    // 被踩最多的做饭菜品
    const topDislikedCookDishes = await prisma.feedback.groupBy({
      by: ['cookDish'],
      where: { rating: -1, createdAt: { gte: cutoff }, cookDish: { not: '' } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // 被踩最多的外卖菜品
    const topDislikedTakeoutDishes = await prisma.feedback.groupBy({
      by: ['takeoutDish'],
      where: { rating: -1, createdAt: { gte: cutoff }, takeoutDish: { not: '' } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // 按辣度统计差评
    const negativeBySpicyLevel = await prisma.feedback.groupBy({
      by: ['spicyLevel'],
      where: { rating: -1, createdAt: { gte: cutoff } },
      _count: { id: true },
      orderBy: { spicyLevel: 'asc' },
    });

    // 按板块统计差评
    const negativeBySection = await prisma.feedback.groupBy({
      by: ['section'],
      where: { rating: -1, createdAt: { gte: cutoff }, section: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return NextResponse.json({
      success: true,
      period: `${days}天`,
      summary: {
        positive: totalPositive,
        negative: totalNegative,
        total: totalPositive + totalNegative,
        satisfactionRate: totalPositive + totalNegative > 0
          ? Math.round((totalPositive / (totalPositive + totalNegative)) * 100)
          : 0,
      },
      topDislikedCookDishes: topDislikedCookDishes.map(d => ({
        dish: d.cookDish,
        count: d._count.id,
      })),
      topDislikedTakeoutDishes: topDislikedTakeoutDishes.map(d => ({
        dish: d.takeoutDish,
        count: d._count.id,
      })),
      negativeBySpicyLevel: negativeBySpicyLevel.map(d => ({
        level: d.spicyLevel,
        count: d._count.id,
      })),
      negativeBySection: negativeBySection.map(d => ({
        section: d.section,
        count: d._count.id,
      })),
    });
  } catch (error) {
    console.error('[/api/feedback GET] Error:', error);
    return NextResponse.json(
      { error: '查询反馈失败' },
      { status: 500 },
    );
  }
}
