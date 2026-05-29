// ============================================================
// 定时清理任务：删除过期数据
// 由 Vercel Cron Job 每天凌晨 3 点触发
// 清理内容：
//   1. 超过 7 天的黑名单记录
//   2. 过期的 Redis 缓存（TTL 自动处理，此处做统计）
//   3. 超过 30 天的推荐记录（可选，保留用户历史）
//   4. 清理非活跃用户从 active:users 集合
// ============================================================

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

// ---- 常量 ----
const BLACKLIST_TTL_DAYS = 7;
const ACTIVE_USER_THRESHOLD_DAYS = 7; // 7 天未活跃的用户从集合中移除

// ---- 清理过期黑名单 ----
async function cleanupBlacklist(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - BLACKLIST_TTL_DAYS);

  const result = await prisma.blacklistItem.deleteMany({
    where: {
      createdAt: { lt: cutoff },
    },
  });

  return result.count;
}

// ---- 清理非活跃用户集合 ----
async function cleanupActiveUsers(): Promise<number> {
  try {
    const activeUserIds = await redis.smembers('active:users');
    if (activeUserIds.length === 0) return 0;

    let removedCount = 0;
    const threshold = Date.now() - ACTIVE_USER_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

    // 检查每个用户的最后活跃时间
    for (const userId of activeUserIds) {
      try {
        const lastActive = await redis.get<number>(`active:user:${userId}`);
        if (!lastActive || lastActive < threshold) {
          await redis.srem('active:users', userId);
          removedCount++;
        }
      } catch {
        // 单个用户处理失败不影响整体
      }
    }

    return removedCount;
  } catch (error) {
    console.error('[Cleanup] Active users cleanup failed:', error);
    return 0;
  }
}

// ---- 获取 Redis 缓存统计 ----
async function getRedisStats(): Promise<{ totalKeys: number; memoryUsage: string }> {
  try {
    // 获取推荐缓存数量
    const recommendKeys = await redis.keys('recommend:*');
    return {
      totalKeys: recommendKeys.length,
      memoryUsage: 'N/A', // Upstash 不直接暴露内存使用
    };
  } catch {
    return { totalKeys: 0, memoryUsage: 'N/A' };
  }
}

// ---- 获取数据库统计 ----
async function getDatabaseStats(): Promise<{
  totalBlacklist: number;
  totalRecommendations: number;
  totalUsers: number;
}> {
  try {
    const [totalBlacklist, totalRecommendations, totalUsers] = await Promise.all([
      prisma.blacklistItem.count(),
      prisma.recommendation.count(),
      prisma.user.count(),
    ]);
    return { totalBlacklist, totalRecommendations, totalUsers };
  } catch {
    return { totalBlacklist: 0, totalRecommendations: 0, totalUsers: 0 };
  }
}

// ---- GET /api/cleanup (Vercel Cron) ----
export async function GET() {
  const startTime = Date.now();
  console.log('[Cleanup] Starting cleanup tasks...');

  try {
    // 并行执行清理任务
    const [blacklistDeleted, activeUsersRemoved, redisStats, dbStats] = await Promise.all([
      cleanupBlacklist(),
      cleanupActiveUsers(),
      getRedisStats(),
      getDatabaseStats(),
    ]);

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      cleanup: {
        blacklistDeleted,
        activeUsersRemoved,
      },
      stats: {
        redis: redisStats,
        database: dbStats,
      },
      duration,
    };

    console.log(`[Cleanup] Completed in ${duration}ms:`, {
      blacklistDeleted,
      activeUsersRemoved,
      totalRecommendCache: redisStats.totalKeys,
    });

    // Sentry 监控
    Sentry.captureMessage('Cleanup completed', {
      level: 'info',
      tags: { component: 'cleanup' },
      extra: result,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Cleanup] Fatal error:', error);

    Sentry.captureException(error, {
      tags: { component: 'cleanup', action: 'main' },
    });

    return NextResponse.json(
      { error: '清理任务失败', details: (error as Error).message },
      { status: 500 },
    );
  }
}
