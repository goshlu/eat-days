import { Redis } from '@upstash/redis';

// ============================================================
// Upstash Redis 客户端（单例）
// 用于缓存每日推荐结果，降低 AI API 调用成本
// ============================================================

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export default redis;