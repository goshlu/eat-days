// ============================================================
// 一人食·川菜推荐官 — AI 推荐 API
// 流式生成 + Upstash Redis 缓存 + Prisma 黑名单持久化
// ============================================================

import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

// ---- 类型定义 ----
interface RecommendRequest {
  prompt?: string;
  date: string;
  spicyLevel: number;
  dislikes: string[];
  historyDishes: string[];
  provider?: 'deepseek' | 'openai';
  apiKey?: string;
  userId?: string;
  weather?: string;
  city?: string;
  ingredients?: string[]; // 用户冰箱中的食材（拍照识别）
}

interface CachedRecommendation {
  content: string;
  createdAt: number;
}

// ---- 常量 ----
const CACHE_TTL = 24 * 60 * 60;
const BLACKLIST_TTL_DAYS = 7;

// ---- 辣度映射 ----
const SPICY_MAP: Record<number, string> = {
  1: '微辣（几乎不辣）',
  2: '中辣（能接受一般辣度）',
  3: '重辣（无辣不欢）',
  4: '爆辣（辣椒当饭吃）',
  5: '变态辣（挑战极限）',
};

// ---- 构建缓存 Key ----
function getCacheKey(userId: string | undefined, date: string): string {
  const uid = userId || 'anonymous';
  return `recommend:${uid}:${date}`;
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
- **单人友好提示：**xxx`;
}

// ---- 选择 AI Provider ----
function getAIModel(provider: string, apiKey?: string) {
  if (provider === 'deepseek') {
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
      provider = 'deepseek',
      apiKey,
      userId,
    } = body!;

    if (!date) {
      return Response.json({ error: '缺少必要参数：date' }, { status: 400 });
    }
    if (spicyLevel < 1 || spicyLevel > 5) {
      return Response.json({ error: 'spicyLevel 必须在 1-5 之间' }, { status: 400 });
    }

    // Step 1: 检查 Redis 缓存
    const cacheKey = getCacheKey(userId, date);
    try {
      const cached = await redis.get<CachedRecommendation>(cacheKey);
      if (cached?.content) {
        console.log(`[Cache HIT] ${cacheKey}`);
        return new Response(cached.content, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Cache': 'HIT' },
        });
      }
    } catch (cacheError) {
      console.warn('[Cache] Redis unavailable:', cacheError);
    }

    // Step 2: 获取黑名单
    const blacklist = await getBlacklist(userId, historyDishes);

    // Step 3: 构建 Prompt 并调用 AI
    const systemPrompt = buildSystemPrompt(date, spicyLevel, dislikes, blacklist, body?.weather, body?.city, body?.ingredients);
    const model = getAIModel(provider, apiKey);

    const result = streamText({
      model,
      system: systemPrompt,
      prompt: prompt || '请生成今日一人食川菜推荐。',
      temperature: 0.85,
    });

    // Step 4: 包装流式响应
    let fullContent = '';
    const textStream = result.toTextStreamResponse();

    if (!textStream.body) {
      throw new Error('Failed to get stream body');
    }

    const reader = textStream.body.getReader();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              const dishes = extractDishNames(fullContent);
              Promise.allSettled([
                redis.set(cacheKey, { content: fullContent, createdAt: Date.now() }, { ex: CACHE_TTL }).catch(() => {}),
                saveToBlacklist(userId, dishes),
                userId ? saveRecommendation(userId, date, fullContent) : Promise.resolve(),
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
            extra: { userId, date, provider },
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