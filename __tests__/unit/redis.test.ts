// ============================================================
// lib/redis.ts 单元测试
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @upstash/redis - 使用 class 形式
vi.mock('@upstash/redis', () => {
  class MockRedis {
    get = vi.fn();
    set = vi.fn();
    del = vi.fn();
    incr = vi.fn();
    incrby = vi.fn();
    expire = vi.fn();
    smembers = vi.fn();
    sadd = vi.fn();
    srem = vi.fn();
    keys = vi.fn();
    pipeline = vi.fn().mockReturnValue({
      get: vi.fn().mockReturnThis(),
      exec: vi.fn(),
    });
  }
  return { Redis: MockRedis };
});

describe('Redis Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should export a redis instance', async () => {
    const { redis } = await import('@/lib/redis');
    expect(redis).toBeDefined();
  });

  it('should have standard Redis methods', async () => {
    const { redis } = await import('@/lib/redis');
    expect(typeof redis.get).toBe('function');
    expect(typeof redis.set).toBe('function');
    expect(typeof redis.del).toBe('function');
    expect(typeof redis.incr).toBe('function');
    expect(typeof redis.keys).toBe('function');
  });

  it('should export default redis instance', async () => {
    const { default: defaultRedis } = await import('@/lib/redis');
    expect(defaultRedis).toBeDefined();
  });
});
