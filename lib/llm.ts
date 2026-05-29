// ============================================================
// LLM Provider 抽象层
// 根据环境变量 LLM_PROVIDER 返回不同的模型实例
// 支持: openai / groq / deepseek
// ============================================================

import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';

export type LLMProvider = 'openai' | 'groq' | 'deepseek';

// ---- Provider 配置 ----
const PROVIDER_CONFIG = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    envKey: 'OPENAI_API_KEY',
  },
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.1-70b-versatile',
    envKey: 'GROQ_API_KEY',
  },
  deepseek: {
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    envKey: 'DEEPSEEK_API_KEY',
  },
} as const;

// ---- 获取当前 Provider 名称 ----
export function getProviderName(): LLMProvider {
  const provider = process.env.LLM_PROVIDER?.toLowerCase() as LLMProvider;
  if (provider && provider in PROVIDER_CONFIG) {
    return provider;
  }
  return 'deepseek'; // 默认使用 deepseek
}

// ---- 获取 LLM 模型实例 ----
export function getLLM(customApiKey?: string, customProvider?: LLMProvider) {
  const providerName = customProvider || getProviderName();
  const config = PROVIDER_CONFIG[providerName];

  const apiKey = customApiKey || process.env[config.envKey] || '';

  const openai = createOpenAI({
    baseURL: config.baseURL,
    apiKey,
  });

  return {
    model: openai.chat(config.defaultModel),
    provider: providerName,
    modelId: config.defaultModel,
  };
}

// ---- Token 计数相关 ----
const TOKEN_COUNT_KEY = 'llm:token:daily';
const DAILY_TOKEN_LIMIT = 10000;

// 获取今日日期字符串（北京时间）
function getTodayKey(): string {
  const now = new Date();
  const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return beijing.toISOString().slice(0, 10);
}

// 获取今日已用 token 数
export async function getDailyTokenCount(): Promise<number> {
  try {
    const { redis } = await import('./redis');
    const key = `${TOKEN_COUNT_KEY}:${getTodayKey()}`;
    const count = await redis.get<number>(key);
    return count || 0;
  } catch {
    return 0;
  }
}

// 增加今日 token 用量
export async function addDailyTokenCount(tokens: number): Promise<number> {
  try {
    const { redis } = await import('./redis');
    const key = `${TOKEN_COUNT_KEY}:${getTodayKey()}`;
    const newCount = await redis.incrby(key, tokens);
    // 设置 24 小时过期
    if (newCount === tokens) {
      await redis.expire(key, 86400);
    }
    return newCount;
  } catch {
    return 0;
  }
}

// 检查是否超过每日限额
export async function checkTokenLimit(): Promise<{ allowed: boolean; used: number; limit: number }> {
  const used = await getDailyTokenCount();
  return {
    allowed: used < DAILY_TOKEN_LIMIT,
    used,
    limit: DAILY_TOKEN_LIMIT,
  };
}

// 获取 token 限额常量
export function getTokenLimit(): number {
  return DAILY_TOKEN_LIMIT;
}
