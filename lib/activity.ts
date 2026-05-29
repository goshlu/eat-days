// ============================================================
// 活跃用户追踪工具
// 用于记录用户活跃状态，支持预生成推荐
// ============================================================

import { redis } from './redis';

// ---- 常量 ----
const ACTIVE_USER_SET_KEY = 'active:users';
const ACTIVE_USER_TTL = 7 * 24 * 60 * 60; // 7 天

/**
 * 记录用户活跃状态
 * 在用户请求推荐、登录等操作时调用
 */
export async function trackUserActivity(userId: string): Promise<void> {
  try {
    await Promise.all([
      // 记录最后活跃时间
      redis.set(`active:user:${userId}`, Date.now(), { ex: ACTIVE_USER_TTL }),
      // 添加到活跃用户集合
      redis.sadd(ACTIVE_USER_SET_KEY, userId),
    ]);
  } catch (error) {
    // 静默失败，不影响主流程
    console.warn('[Activity] Failed to track user:', userId, error);
  }
}

/**
 * 获取活跃用户列表
 */
export async function getActiveUserIds(): Promise<string[]> {
  try {
    return await redis.smembers(ACTIVE_USER_SET_KEY);
  } catch (error) {
    console.error('[Activity] Failed to get active users:', error);
    return [];
  }
}

/**
 * 检查用户是否活跃
 */
export async function isUserActive(userId: string): Promise<boolean> {
  try {
    const lastActive = await redis.get<number>(`active:user:${userId}`);
    if (!lastActive) return false;
    const threshold = Date.now() - ACTIVE_USER_TTL * 1000;
    return lastActive > threshold;
  } catch {
    return false;
  }
}

/**
 * 获取用户最后活跃时间
 */
export async function getLastActiveTime(userId: string): Promise<number | null> {
  try {
    return await redis.get<number>(`active:user:${userId}`);
  } catch {
    return null;
  }
}

/**
 * 批量获取用户活跃状态
 */
export async function getUsersActivityStatus(
  userIds: string[],
): Promise<Map<string, { isActive: boolean; lastActive: number | null }>> {
  const result = new Map<string, { isActive: boolean; lastActive: number | null }>();
  const threshold = Date.now() - ACTIVE_USER_TTL * 1000;

  try {
    // 批量获取最后活跃时间
    const pipeline = redis.pipeline();
    for (const userId of userIds) {
      pipeline.get(`active:user:${userId}`);
    }
    const results = await pipeline.exec<number[]>();

    userIds.forEach((userId, index) => {
      const lastActive = results[index];
      result.set(userId, {
        isActive: lastActive ? lastActive > threshold : false,
        lastActive,
      });
    });
  } catch (error) {
    console.error('[Activity] Failed to batch get activity:', error);
    userIds.forEach((userId) => {
      result.set(userId, { isActive: false, lastActive: null });
    });
  }

  return result;
}
