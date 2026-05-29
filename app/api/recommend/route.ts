// ============================================================
// 一人食·川菜推荐官 — AI 推荐 API
// 流式生成 + Upstash Redis 缓存 + Prisma 黑名单持久化
// ============================================================

import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { trackUserActivity } from '@/lib/activity';
import { getLLM, checkTokenLimit, addDailyTokenCount, getTokenLimit } from '@/lib/llm';
import { createHash } from 'crypto';

// ---- 类型定义 ----
interface RecommendRequest {
  prompt?: string;
  date: string;
  spicyLevel: number;
  dislikes: string[];
  historyDishes: string[];
  userId?: string;
  weather?: string;
  city?: string;
  ingredients?: string[];
}

interface RecommendationJSON {
  cook: { dish: string; reason: string; quickTip: string; ingredients: string };
  takeout: { dish: string; reason: string; tip: string };
  eatOut: { type: string; dish: string; tip: string };
  chefComment?: string;
}

interface CachedRecommendation {
  content: string; // Markdown 原文（兼容旧缓存）
  json?: RecommendationJSON; // JSON 结构化数据
  createdAt: number;
}

// ---- 常量 ----
const CACHE_TTL_STABLE = 24 * 60 * 60; // 偏好不变时缓存 24 小时
const CACHE_TTL_CHANGED = 2 * 60 * 60; // 偏好改变时缓存 2 小时
const BLACKLIST_TTL_DAYS = 7;
const RATE_LIMIT_MAX = 3; // 每用户每天最多生成 3 次
const RATE_LIMIT_TTL = 86400; // 24 小时过期

// ---- 辣度映射 ----
const SPICY_MAP: Record<number, string> = {
  1: '微辣（几乎不辣）',
  2: '中辣（能接受一般辣度）',
  3: '重辣（无辣不欢）',
  4: '爆辣（辣椒当饭吃）',
  5: '变态辣（挑战极限）',
};

// ---- 计算偏好哈希 ----
function computePreferencesHash(spicyLevel: number, dislikes: string[]): string {
  const sorted = [...dislikes].sort().join(',');
  const payload = `spicy:${spicyLevel}|dislikes:${sorted}`;
  return createHash('md5').update(payload).digest('hex').slice(0, 12);
}

// ---- 构建缓存 Key（含偏好哈希） ----
function getCacheKey(userId: string | undefined, date: string, spicyLevel: number, dislikes: string[]): string {
  const uid = userId || 'anonymous';
  const hash = computePreferencesHash(spicyLevel, dislikes);
  return `recommend:${uid}:${date}:${hash}`;
}

// ---- 获取用户的上次偏好哈希 ----
async function getLastPreferencesHash(userId: string): Promise<string | null> {
  try {
    return await redis.get<string>(`prefs:hash:${userId}`);
  } catch {
    return null;
  }
}

// ---- 保存用户的偏好哈希 ----
async function savePreferencesHash(userId: string, hash: string): Promise<void> {
  try {
    await redis.set(`prefs:hash:${userId}`, hash, { ex: 7 * 24 * 60 * 60 }); // 7 天过期
  } catch {
    // 静默失败
  }
}

// ---- 获取客户端标识（用于匿名用户限流） ----
function getClientId(req: NextRequest, userId?: string): string {
  if (userId) return userId;
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'anonymous';
}

// ---- 构建限流 Key ----
function getRateLimitKey(clientId: string, date: string): string {
  return `rate:limit:${clientId}:${date}`;
}

// ---- 获取黑名单 ----
async function getBlacklist(
  userId: string | undefined,
  frontendBlacklist: string[],
): Promise<string[]> {
  try {
    if (userId) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - BLACKLIST_TTL_DAYS);
      const dbBlacklist = await prisma.blacklistItem.findMany({
        where: { userId, createdAt: { gte: cutoff } },
        select: { dishName: true },
        orderBy: { createdAt: 'desc' },
      });
      const dbDishes = dbBlacklist.map((item) => item.dishName);
      const combined = new Set([...dbDishes, ...frontendBlacklist]);
      return Array.from(combined);
    }
    return frontendBlacklist;
  } catch (error) {
    console.error('[getBlacklist] Error:', error);
    return frontendBlacklist;
  }
}

// ---- 保存菜品到黑名单 ----
async function saveToBlacklist(
  userId: string | undefined,
  dishNames: string[],
): Promise<void> {
  if (!userId || dishNames.length === 0) return;
  try {
    await prisma.blacklistItem.createMany({
      data: dishNames.map((dishName) => ({ dishName, userId })),
      skipDuplicates: true,
    });
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - BLACKLIST_TTL_DAYS);
    await prisma.blacklistItem.deleteMany({
      where: { userId, createdAt: { lt: cutoff } },
    });
  } catch (error) {
    console.error('[saveToBlacklist] Error:', error);
  }
}

// ---- 保存推荐记录到数据库 ----
async function saveRecommendation(
  userId: string,
  date: string,
  content: string,
): Promise<void> {
  try {
    const cookMatch = content.match(/\*\*推荐菜[：:]\*\*\s*(.+)/);
    const cookReason = content.match(/\*\*理由[：:]\*\*\s*(.+)/);
    const cookTip = content.match(/\*\*快手秘籍[：:]\*\*\s*(.+)/);
    const cookIngredients = content.match(/\*\*食材清单[：:（(（]单人份[）)]\*\*\s*(.+)/);
    const takeoutMatch = content.match(/\*\*推荐点[：:]\*\*\s*(.+)/);
    const takeoutReason = content.match(/\*\*理由[：:]\*\*\s*(.+)/);
    const takeoutTip = content.match(/\*\*凑单小贴士[：:]\*\*\s*(.+)/);
    const eatoutType = content.match(/\*\*推荐餐厅类型[：:]\*\*\s*(.+)/);
    const eatoutDish = content.match(/\*\*必点菜品[：:]\*\*\s*(.+)/);
    const eatoutTip = content.match(/\*\*单人友好提示[：:]\*\*\s*(.+)/);

    const cook = { dish: cookMatch?.[1]?.trim() || '', reason: cookReason?.[1]?.trim() || '', quickTip: cookTip?.[1]?.trim() || '', ingredients: cookIngredients?.[1]?.trim() || '' };
    const takeout = { dish: takeoutMatch?.[1]?.trim() || '', reason: takeoutReason?.[1]?.trim() || '', tip: takeoutTip?.[1]?.trim() || '' };
    const eatOut = { type: eatoutType?.[1]?.trim() || '', dish: eatoutDish?.[1]?.trim() || '', tip: eatoutTip?.[1]?.trim() || '' };
    const dateObj = new Date(date);

    await prisma.recommendation.upsert({
      where: { date_userId: { date: dateObj, userId } },
      update: { cook, takeout, eatOut },
      create: { date: dateObj, userId, cook, takeout, eatOut },
    });
  } catch (error) {
    console.error('[saveRecommendation] Error:', error);
  }
}

// ---- 从完成内容中提取菜品名 ----
function extractDishNames(content: string): string[] {
  const dishes: string[] = [];
  const cookMatch = content.match(/\*\*推荐菜[：:]\*\*\s*(.+)/);
  if (cookMatch?.[1]) dishes.push(cookMatch[1].trim());
  const takeoutMatch = content.match(/\*\*推荐点[：:]\*\*\s*(.+)/);
  if (takeoutMatch?.[1]) dishes.push(takeoutMatch[1].trim());
  return dishes.filter(Boolean);
}

// ---- 将 Markdown 解析为 JSON 结构 ----
function parseMarkdownToJSON(content: string): RecommendationJSON {
  const cook = {
    dish: content.match(/\*\*推荐菜[：:]\*\*\s*(.+)/)?.[1]?.trim() || '',
    reason: content.match(/\*\*理由[：:]\*\*\s*(.+)/)?.[1]?.trim() || '',
    quickTip: content.match(/\*\*快手秘籍[：:]\*\*\s*(.+)/)?.[1]?.trim() || '',
    ingredients: content.match(/\*\*食材清单[：:（(（]单人份[）)]\*\*\s*(.+)/)?.[1]?.trim() || '',
  };
  const takeout = {
    dish: content.match(/\*\*推荐点[：:]\*\*\s*(.+)/)?.[1]?.trim() || '',
    reason: content.match(/\*\*理由[：:]\*\*\s*(.+)/)?.[1]?.trim() || '',
    tip: content.match(/\*\*凑单小贴士[：:]\*\*\s*(.+)/)?.[1]?.trim() || '',
  };
  const eatOut = {
    type: content.match(/\*\*推荐餐厅类型[：:]\*\*\s*(.+)/)?.[1]?.trim() || '',
    dish: content.match(/\*\*必点菜品[：:]\*\*\s*(.+)/)?.[1]?.trim() || '',
    tip: content.match(/\*\*单人友好提示[：:]\*\*\s*(.+)/)?.[1]?.trim() || '',
  };
  const chefComment = content.match(/\*\*点评[：:]\*\*\s*(.+)/)?.[1]?.trim() || '';
  return { cook, takeout, eatOut, chefComment };
}

// ---- 构建 System Prompt ----
function buildSystemPrompt(
  date: string,
  spicyLevel: number,
  dislikes: string[],
  blacklist: string[],
  weather?: string,
  city?: string,
  ingredients?: string[],
): string {
  const spicyDesc = SPICY_MAP[spicyLevel] || '中辣';
  const dislikeStr = dislikes.length > 0 ? dislikes.join('、') : '无';
  const blacklistStr = blacklist.length > 0 ? blacklist.join('、') : '无';
  const weatherLine = weather ? `当前天气：${city ? city + '，' : ''}${weather}` : '';
  const ingredientsLine = ingredients && ingredients.length > 0
    ? `用户冰箱现有食材：${ingredients.join('、')}（做饭推荐请优先使用这些食材设计菜谱）`
    : '';

  return `你是一位精通川菜美食、深谙一人食场景的AI推荐官。
你的使命是帮助用户解决"每天吃什么"的终极难题。

当前日期：${date}
用户辣度偏好：${spicyDesc}（${spicyLevel}/5）
忌口清单：${dislikeStr}
最近7天已推荐的菜品（严禁重复）：${blacklistStr}
${weatherLine}
${ingredientsLine}

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
${weather ? '✅ 请根据当前天气调整推荐（如雨天推荐热汤热菜，晴天可推荐凉菜，高温推荐清淡，低温推荐暖身菜品）' : ''}
${ingredients && ingredients.length > 0 ? '✅ 做饭板块请优先使用用户现有食材，减少额外采购' : ''}

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
- **单人友好提示：**xxx

## 💬 大厨点评
- **点评：**xxx（30字以内，幽默或专业，如"这道麻婆豆腐的豆瓣酱一定要用郫县三年陈，才够魂"）`;
}

// ---- POST /api/recommend ----
export async function POST(req: NextRequest) {
  let body: RecommendRequest | null = null;
  try {
    body = (await req.json()) as RecommendRequest;
    const {
      prompt,
      date,
      spicyLevel = 3,
      dislikes = [],
      historyDishes = [],
      apiKey,
      userId,
    } = body!;

    if (!date) {
      return Response.json({ error: '缺少必要参数：date' }, { status: 400 });
    }
    if (spicyLevel < 1 || spicyLevel > 5) {
      return Response.json({ error: 'spicyLevel 必须在 1-5 之间' }, { status: 400 });
    }

    // 记录用户活跃状态（用于预生成）
    if (userId) {
      await trackUserActivity(userId);
    }

    // Step 0: 检查 Token 限额
    const tokenStatus = await checkTokenLimit();
    if (!tokenStatus.allowed) {
      console.log(`[TokenLimit] EXCEEDED: ${tokenStatus.used}/${tokenStatus.limit}`);
      return Response.json(
        {
          error: 'TOKEN_LIMIT_EXCEEDED',
          message: '今日 AI 调用额度已用完，请明天再来',
          used: tokenStatus.used,
          limit: tokenStatus.limit,
        },
        { status: 429 },
      );
    }

    // Step 0.5: 检查每日请求额度限制
    const clientId = getClientId(req, userId);
    const rateLimitKey = getRateLimitKey(clientId, date);
    try {
      const currentCount = await redis.get<number>(rateLimitKey);
      if (currentCount !== null && currentCount >= RATE_LIMIT_MAX) {
        console.log(`[RateLimit] EXCEEDED for ${clientId} on ${date} (${currentCount}/${RATE_LIMIT_MAX})`);
        return Response.json(
          { error: 'RATE_LIMIT_EXCEEDED', message: '明天再来吧，今天的推荐次数已用完 😋' },
          { status: 429 },
        );
      }
    } catch (rateLimitError) {
      console.warn('[RateLimit] Redis unavailable:', rateLimitError);
    }

    // Step 1: 检查 Redis 缓存（缓存命中不消耗额度）
    const currentHash = computePreferencesHash(spicyLevel, dislikes);
    const cacheKey = getCacheKey(userId, date, spicyLevel, dislikes);
    
    // 检查偏好是否变化
    let cacheTTL = CACHE_TTL_STABLE; // 默认 24h
    if (userId) {
      const lastHash = await getLastPreferencesHash(userId);
      if (lastHash && lastHash !== currentHash) {
        cacheTTL = CACHE_TTL_CHANGED; // 偏好变化，缓存 2h
        console.log(`[Cache] Preferences changed for ${userId}: ${lastHash} -> ${currentHash}`);
      }
    }

    try {
      const cached = await redis.get<CachedRecommendation>(cacheKey);
      if (cached?.content) {
        console.log(`[Cache HIT] ${cacheKey}`);
        // 优先返回 JSON 结构，兼容旧缓存
        const jsonData = cached.json || parseMarkdownToJSON(cached.content);
        return Response.json({
          success: true,
          data: jsonData,
          fromCache: true,
        }, {
          headers: { 'X-Cache': 'HIT' },
        });
      }
    } catch (cacheError) {
      console.warn('[Cache] Redis unavailable:', cacheError);
    }

    // Step 2: 获取黑名单
    const blacklist = await getBlacklist(userId, historyDishes);

    // Step 2.5: 消耗一次额度（原子递增）
    try {
      const newCount = await redis.incr(rateLimitKey);
      if (newCount === 1) {
        await redis.expire(rateLimitKey, RATE_LIMIT_TTL);
      }
      console.log(`[RateLimit] ${clientId} on ${date}: ${newCount}/${RATE_LIMIT_MAX}`);
    } catch (rateLimitError) {
      console.warn('[RateLimit] Failed to increment:', rateLimitError);
      // 递增失败不阻塞请求
    }

    // Step 3: 构建 Prompt 并调用 AI
    const systemPrompt = buildSystemPrompt(date, spicyLevel, dislikes, blacklist, body?.weather, body?.city, body?.ingredients);
    const { model } = await getLLM();

    const result = streamText({
      model,
      system: systemPrompt,
      prompt: prompt || '请生成今日一人食川菜推荐。',
      temperature: 0.85,
      onFinish: async ({ usage }) => {
        // 记录 token 用量
        if (usage?.totalTokens) {
          const newTotal = await addDailyTokenCount(usage.totalTokens);
          console.log(`[Token] Used ${usage.totalTokens}, Daily total: ${newTotal}/${getTokenLimit()}`);
        }
      },
    });

    // Step 4: 包装流式响应
    let fullContent = '';
    const textStream = result.toTextStreamResponse();

    if (!textStream.body) {
      throw new Error('Failed to get stream body');
    }

    const reader = textStream.body.getReader();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // 解析为 JSON 并缓存
              const jsonData = parseMarkdownToJSON(fullContent);
              const dishes = extractDishNames(fullContent);
              Promise.allSettled([
                redis.set(cacheKey, { content: fullContent, json: jsonData, createdAt: Date.now() }, { ex: cacheTTL }).catch(() => {}),
                saveToBlacklist(userId, dishes),
                userId ? saveRecommendation(userId, date, fullContent) : Promise.resolve(),
                userId ? savePreferencesHash(userId, currentHash) : Promise.resolve(),
              ]).catch(() => {});
              controller.close();
              break;
            }
            fullContent += new TextDecoder().decode(value);
            controller.enqueue(value);
          }
        } catch (streamError) {
          Sentry.captureException(streamError, {
            tags: { api: 'recommend', phase: 'streaming' },
            extra: { userId, date },
          });
          controller.error(streamError);
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Cache': 'MISS', 'Transfer-Encoding': 'chunked' },
    });
  } catch (error) {
    console.error('[/api/recommend] Error:', error);
    Sentry.captureException(error, {
      tags: { api: 'recommend', phase: 'request' },
      extra: { date: body?.date, spicyLevel: body?.spicyLevel, provider: body?.provider, userId: body?.userId },
    });
    if (error instanceof SyntaxError) {
      return Response.json({ error: '请求格式错误，请检查 JSON 格式' }, { status: 400 });
    }
    return Response.json({ error: '服务器内部错误，请稍后重试' }, { status: 500 });
  }
}