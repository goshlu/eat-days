// ============================================================
// 健康检查接口
// 用于监控和负载均衡器健康探针
// ============================================================

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: 'ok' | 'error' | 'skipped';
    redis: 'ok' | 'error' | 'skipped';
    ai: 'ok' | 'error' | 'skipped';
  };
}

const startTime = Date.now();

export async function GET() {
  const checks: HealthCheck['checks'] = {
    database: 'skipped',
    redis: 'skipped',
    ai: 'skipped',
  };

  let overallStatus: string = 'healthy';

  // 检查数据库连接
  try {
    const { prisma } = await import('@/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    overallStatus = 'degraded';
  }

  // 检查 Redis 连接
  try {
    const { redis } = await import('@/lib/redis');
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
    // Redis 不可用不影响整体状态（有降级方案）
  }

  // 检查 AI 服务配置
  if (process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY) {
    checks.ai = 'ok';
  } else {
    checks.ai = 'skipped';
  }

  const response: HealthCheck = {
    status: overallStatus as HealthCheck['status'],
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, { status: statusCode });
}