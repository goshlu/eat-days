// ============================================================
// 导出用户数据 API
// 返回用户的所有推荐、黑名单、反馈数据
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // 并行查询用户数据
    const [user, recommendations, blacklistItems, feedbacks] = await Promise.all([
      // 用户基本信息
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          spicyLevel: true,
          dislikes: true,
          provider: true,
          createdAt: true,
        },
      }),
      // 推荐记录
      prisma.recommendation.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          cook: true,
          takeout: true,
          eatOut: true,
          createdAt: true,
        },
      }),
      // 黑名单
      prisma.blacklistItem.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          dishName: true,
          createdAt: true,
        },
      }),
      // 反馈
      prisma.feedback.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rating: true,
          cookDish: true,
          takeoutDish: true,
          eatOutDish: true,
          section: true,
          createdAt: true,
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 },
      );
    }

    // 构建导出数据
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        spicyLevel: user.spicyLevel,
        dislikes: user.dislikes,
        provider: user.provider,
        memberSince: user.createdAt,
      },
      recommendations: recommendations.map(r => ({
        date: r.date,
        cook: r.cook,
        takeout: r.takeout,
        eatOut: r.eatOut,
        createdAt: r.createdAt,
      })),
      blacklist: blacklistItems.map(b => ({
        dishName: b.dishName,
        addedAt: b.createdAt,
      })),
      feedbacks: feedbacks.map(f => ({
        rating: f.rating > 0 ? '👍' : '👎',
        dishes: {
          cook: f.cookDish,
          takeout: f.takeoutDish,
          eatOut: f.eatOutDish,
        },
        section: f.section,
        createdAt: f.createdAt,
      })),
      statistics: {
        totalRecommendations: recommendations.length,
        totalBlacklistItems: blacklistItems.length,
        totalFeedbacks: feedbacks.length,
        positiveFeedbacks: feedbacks.filter(f => f.rating > 0).length,
        negativeFeedbacks: feedbacks.filter(f => f.rating < 0).length,
      },
    };

    // 返回 JSON 文件下载
    const json = JSON.stringify(exportData, null, 2);
    const filename = `sichuan-solo-data-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[/api/export-data] Error:', error);
    return NextResponse.json(
      { error: '导出数据失败' },
      { status: 500 },
    );
  }
}
