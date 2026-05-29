// ============================================================
// 预生成任务状态查询 API
// GET /api/pre-generate/status
// ============================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getActiveUserIds } from '@/lib/activity';

// ---- 类型 ----
interface TaskStatus {
  status: string;
  stats?: {
    processed: number;
    generated: number;
    skipped: number;
    errors: number;
    totalTokens: number;
    duration: number;
  };
  timestamp: number;
}

// ---- GET /api/pre-generate/status ----
export async function GET() {
  try {
    // 获取上次运行状态
    let lastRun: TaskStatus | null = null;
    try {
      lastRun = await redis.get<TaskStatus>('pre-generate:last-run');
    } catch {
      // Redis 不可用
    }

    // 获取活跃用户数
    const activeUserIds = await getActiveUserIds();

    // 获取今日已缓存的推荐数
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    let cachedCount = 0;
    try {
      const keys = await redis.keys(`recommend:*:${dateStr}*`);
      cachedCount = keys.length;
    } catch {
      // Redis 不可用
    }

    // 获取数据库统计
    const [totalUsers, totalRecommendations, recentActiveUsers] = await Promise.all([
      prisma.user.count(),
      prisma.recommendation.count(),
      prisma.recommendation.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { userId: true },
        distinct: ['userId'],
      }).then((users) => users.length),
    ]);

    return NextResponse.json({
      success: true,
      lastRun: lastRun
        ? {
            status: lastRun.status,
            stats: lastRun.stats,
            timestamp: new Date(lastRun.timestamp).toISOString(),
            timeAgo: getTimeAgo(lastRun.timestamp),
          }
        : null,
      current: {
        activeUsers: activeUserIds.length,
        cachedToday: cachedCount,
      },
      database: {
        totalUsers,
        totalRecommendations,
        recentActiveUsers,
      },
    });
  } catch (error) {
    console.error('[PreGenerate Status] Error:', error);
    return NextResponse.json(
      { error: '获取状态失败', details: (error as Error).message },
      { status: 500 },
    );
  }
}

// ---- 辅助函数：计算时间差 ----
function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
}
