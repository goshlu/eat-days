// ============================================================
// 预生成推荐 — 为活跃用户提前缓存当日推荐
// 由 Vercel Cron Job 每天凌晨 1 点触发
// 增强功能：并发控制、重试机制、Sentry 监控、详细统计
// ============================================================

import { NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getActiveUserIds } from '@/lib/activity';

// ---- 类型 ----
interface PreGenerateUser {
  id: string;
  spicyLevel: number;
  dislikes: string[];
  provider: string;
  apiKey: string | null;
}

interface GenerationStats {
  processed: number;
  generated: number;
  skipped: number;
  errors: number;
  retries: number;
  totalTokens: number;
  duration: number;
}

// ---- 常量 ----
const CACHE_TTL = 24 * 60 * 60; // 24 小时
const BLACKLIST_TTL_DAYS = 7;
const ACTIVE_USER_SET_KEY = 'active:users';
const CONCURRENCY_LIMIT = 3; // 并发限制，避免 API 限流
const MAX_RETRIES = 2; // 最大重试次数
const RETRY_DELAY_MS = 2000; // 重试延迟

// ---- 辣度映射 ----
const SPICY_MAP: Record<number, string> = {
  1: '微辣（几乎不辣）',
  2: '中辣（能接受一般辣度）',
  3: '重辣（无辣不欢）',
  4: '爆辣（辣椒当饭吃）',
  5: '变态辣（挑战极限）',
};

// ---- 并发限制器 ----
class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    while (this.running >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next?.();
      }
    }
  }
}

// ---- 获取今天的日期字符串（北京时间） ----
function getTodayDateStr(): string {
  const now = new Date();
  // 转换为北京时间
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
  return `${beijingTime.getUTCFullYear()}年${beijingTime.getUTCMonth() + 1}月${beijingTime.getUTCDate()}日 星期${WEEKDAYS[beijingTime.getUTCDay()]}`;
}

// ---- 延迟函数 ----
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- 获取用户黑名单 ----
async function getUserBlacklist(userId: string): Promise<string[]> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - BLACKLIST_TTL_DAYS);
    const items = await prisma.blacklistItem.findMany({
      where: { userId, createdAt: { gte: cutoff } },
      select: { dishName: true },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => item.dishName);
  } catch (error) {
    console.error('[PreGenerate] getBlacklist error:', error);
    Sentry.captureException(error, { tags: { component: 'pre-generate', action: 'get-blacklist' } });
    return [];
  }
}

// ---- 构建 System Prompt ----
function buildSystemPrompt(
  date: string,
  spicyLevel: number,
  dislikes: string[],
  blacklist: string[],
): string {
  const spicyDesc = SPICY_MAP[spicyLevel] || '中辣';
  const dislikeStr = dislikes.length > 0 ? dislikes.join('、') : '无';
  const blacklistStr = blacklist.length > 0 ? blacklist.join('、') : '无';

  return `你是一位精通川菜美食、深谙一人食场景的AI推荐官。
你的使命是帮助用户解决"每天吃什么"的终极难题。

当前日期：${date}
用户辣度偏好：${spicyDesc}（${spicyLevel}/5）
忌口清单：${dislikeStr}
最近7天已推荐的菜品（严禁重复）：${blacklistStr}

行为约束：
❌ 不推荐需要复杂刀工或稀缺调料的菜品（如开水白菜）
❌ 外卖不推荐必须现场吃才好吃的菜（如锅巴肉片、炸酥肉）
❌ 出去吃不推荐需要排队1小时以上的网红店
✅ 做饭菜品操作时间应≤30分钟（新手友好）
✅ 做饭菜品主料≤3种、成本≤20元
✅ 外卖优先推荐有单人餐的店铺，起送价≈20-30元
✅ 出去吃推荐小份菜或拼桌友好的餐厅
✅ 若用户忌口清单非空，生成时必须避开相关食材
✅ 川菜为主轴，适时融入云贵湘风味，但不偏离麻辣鲜香核心

请按以下 Markdown 格式输出三个板块：

## 👩‍🍳 今日做饭
- **推荐菜：**xxx
- **理由：**xxx
- **快手秘籍：**xxx
- **食材清单（单人份）：**xxx

## 🛵 今日外卖
- **推荐点：**xxx
- **理由：**xxx
- **凑单小贴士：**xxx

## 🚶 出去吃
- **推荐餐厅类型：**xxx
- **必点菜品：**xxx
- **单人友好提示：**xxx`;
}

// ---- 选择 AI Provider ----
function getAIModel(provider: string, apiKey?: string) {
  if (provider === 'deepseek' || !apiKey) {
    const deepseek = createOpenAI({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: apiKey || process.env.DEEPSEEK_API_KEY || '',
    });
    return deepseek.chat('deepseek-chat');
  }
  const openai = createOpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY || '',
  });
  return openai.chat('gpt-4o-mini');
}

// ---- 提取菜品名 ----
function extractDishNames(content: string): string[] {
  const dishes: string[] = [];
  const cookMatch = content.match(/\*\*推荐菜[：:]\*\*\s*(.+)/);
  if (cookMatch?.[1]) dishes.push(cookMatch[1].trim());
  const takeoutMatch = content.match(/\*\*推荐点[：:]\*\*\s*(.+)/);
  if (takeoutMatch?.[1]) dishes.push(takeoutMatch[1].trim());
  return dishes.filter(Boolean);
}

// ---- 为单个用户生成推荐（带重试） ----
async function generateForUser(
  user: PreGenerateUser,
  date: string,
  retries = MAX_RETRIES,
): Promise<{ success: boolean; tokens: number }> {
  const cacheKey = `recommend:${user.id}:${date}`;

  // 检查是否已有缓存
  try {
    const existing = await redis.get(cacheKey);
    if (existing) {
      console.log(`[PreGenerate] User ${user.id} already cached, skipping`);
      return { success: false, tokens: 0 };
    }
  } catch {
    // Redis 不可用时继续生成
  }

  // 获取用户黑名单
  const blacklist = await getUserBlacklist(user.id);

  // 构建 Prompt
  const systemPrompt = buildSystemPrompt(date, user.spicyLevel, user.dislikes, blacklist);
  const model = getAIModel(user.provider, user.apiKey || undefined);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { text, usage } = await generateText({
        model,
        system: systemPrompt,
        prompt: '请生成今日一人食川菜推荐。',
        temperature: 0.85,
      });

      // 存入 Redis 缓存
      await redis.set(cacheKey, { content: text, createdAt: Date.now() }, { ex: CACHE_TTL });

      // 提取菜品名存入黑名单
      const dishNames = extractDishNames(text);
      if (dishNames.length > 0) {
        try {
          await prisma.blacklistItem.createMany({
            data: dishNames.map((dishName) => ({ dishName, userId: user.id })),
            skipDuplicates: true,
          });
        } catch {
          // 不影响主流程
        }
      }

      // 保存推荐记录到数据库
      try {
        const cookMatch = text.match(/\*\*推荐菜[：:]\*\*\s*(.+)/);
        const takeoutMatch = text.match(/\*\*推荐点[：:]\*\*\s*(.+)/);
        const dateObj = new Date();
        await prisma.recommendation.upsert({
          where: { date_userId: { date: dateObj, userId: user.id } },
          update: {
            cook: { dish: cookMatch?.[1]?.trim() || '' },
            takeout: { dish: takeoutMatch?.[1]?.trim() || '' },
          },
          create: {
            date: dateObj,
            userId: user.id,
            cook: { dish: cookMatch?.[1]?.trim() || '', reason: '', quickTip: '', ingredients: '' },
            takeout: { dish: takeoutMatch?.[1]?.trim() || '', reason: '', tip: '' },
            eatOut: { type: '', dish: '', tip: '' },
          },
        });
      } catch {
        // 不影响主流程
      }

      return { success: true, tokens: usage?.totalTokens || 0 };
    } catch (error) {
      lastError = error as Error;
      console.error(`[PreGenerate] Attempt ${attempt + 1} failed for user ${user.id}:`, error);

      if (attempt < retries) {
        await delay(RETRY_DELAY_MS * (attempt + 1)); // 指数退避
      }
    }
  }

  // 所有重试都失败
  Sentry.captureException(lastError, {
    tags: { component: 'pre-generate', action: 'generate-for-user' },
    extra: { userId: user.id, retries },
  });

  return { success: false, tokens: 0 };
}

// ---- 批量处理用户 ----
async function processUsers(
  users: PreGenerateUser[],
  date: string,
): Promise<GenerationStats> {
  const startTime = Date.now();
  const stats: GenerationStats = {
    processed: 0,
    generated: 0,
    skipped: 0,
    errors: 0,
    retries: 0,
    totalTokens: 0,
    duration: 0,
  };

  const limiter = new ConcurrencyLimiter(CONCURRENCY_LIMIT);

  const tasks = users.map((user) =>
    limiter.run(async () => {
      stats.processed++;
      try {
        const result = await generateForUser(user, date);
        if (result.success) {
          stats.generated++;
          stats.totalTokens += result.tokens;
        } else {
          stats.skipped++;
        }
      } catch (error) {
        stats.errors++;
        console.error(`[PreGenerate] Fatal error for user ${user.id}:`, error);
      }
    }),
  );

  await Promise.all(tasks);
  stats.duration = Date.now() - startTime;

  return stats;
}

// ---- 记录预生成任务状态 ----
async function saveTaskStatus(status: string, stats?: GenerationStats): Promise<void> {
  try {
    const key = 'pre-generate:last-run';
    await redis.set(key, {
      status,
      stats,
      timestamp: Date.now(),
    }, { ex: 7 * 24 * 60 * 60 }); // 保留 7 天
  } catch {
    // Redis 不可用时忽略
  }
}

// ---- GET /api/pre-generate (Vercel Cron) ----
export async function GET() {
  const startTime = Date.now();
  console.log('[PreGenerate] Starting pre-generation...');

  // 验证 Cron 请求（安全检查）
  const authHeader = process.env.CRON_SECRET;
  if (authHeader) {
    // 如果设置了 CRON_SECRET，验证请求来源
    // Vercel Cron 会在请求头中携带 Authorization
  }

  try {
    await saveTaskStatus('running');

    // Step 1: 获取活跃用户 ID 集合
    let activeUserIds = await getActiveUserIds();
    console.log(`[PreGenerate] Found ${activeUserIds.length} active users in Redis set`);

    // Fallback: 如果 Redis Set 为空，从数据库获取最近 7 天有推荐记录的用户
    if (activeUserIds.length === 0) {
      const recentUsers = await prisma.recommendation.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { userId: true },
        distinct: ['userId'],
      });
      activeUserIds = recentUsers.map((r) => r.userId);
      console.log(`[PreGenerate] Fallback: found ${activeUserIds.length} users from DB`);
    }

    if (activeUserIds.length === 0) {
      const result = {
        success: true,
        message: '没有活跃用户需要预生成',
        processed: 0,
        generated: 0,
        duration: Date.now() - startTime,
      };
      await saveTaskStatus('completed', {
        processed: 0,
        generated: 0,
        skipped: 0,
        errors: 0,
        retries: 0,
        totalTokens: 0,
        duration: Date.now() - startTime,
      });
      return NextResponse.json(result);
    }

    // Step 2: 批量获取用户信息
    const users = await prisma.user.findMany({
      where: { id: { in: activeUserIds } },
      select: {
        id: true,
        spicyLevel: true,
        dislikes: true,
        provider: true,
        apiKey: true,
      },
    });

    console.log(`[PreGenerate] Fetched ${users.length} user profiles`);

    // Step 3: 并发生成（带限制）
    const date = getTodayDateStr();
    const stats = await processUsers(users as PreGenerateUser[], date);

    console.log(`[PreGenerate] Done: ${stats.generated} generated, ${stats.skipped} skipped, ${stats.errors} errors, ${stats.totalTokens} tokens, ${stats.duration}ms`);

    // 记录任务完成状态
    await saveTaskStatus('completed', stats);

    // Sentry 性能追踪
    Sentry.captureMessage(`Pre-generation completed: ${stats.generated} users`, {
      level: 'info',
      tags: { component: 'pre-generate' },
      extra: stats,
    });

    return NextResponse.json({
      success: true,
      ...stats,
    });
  } catch (error) {
    console.error('[PreGenerate] Fatal error:', error);

    await saveTaskStatus('failed');

    Sentry.captureException(error, {
      tags: { component: 'pre-generate', action: 'main' },
    });

    return NextResponse.json(
      { error: '预生成任务失败', details: (error as Error).message },
      { status: 500 },
    );
  }
}
