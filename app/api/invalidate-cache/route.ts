// ============================================================
// 缓存失效 API
// 供设置面板调用，清除用户的推荐缓存
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: '缺少 userId 参数' },
        { status: 400 },
      );
    }

    // 获取用户的所有推荐缓存 key
    const pattern = `recommend:${userId}:*`;
    const keys = await redis.keys(pattern);

    // 同时清除偏好哈希
    const prefKey = `prefs:hash:${userId}`;

    if (keys.length > 0) {
      // 删除所有推荐缓存
      await redis.del(...keys);
    }
    // 删除偏好哈希
    await redis.del(prefKey);

    console.log(`[InvalidateCache] Cleared ${keys.length} cache keys for user ${userId}`);

    return NextResponse.json({
      success: true,
      clearedKeys: keys.length,
    });
  } catch (error) {
    console.error('[/api/invalidate-cache] Error:', error);
    return NextResponse.json(
      { error: '清除缓存失败' },
      { status: 500 },
    );
  }
}
