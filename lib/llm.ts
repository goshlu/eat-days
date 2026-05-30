// ============================================================
// LLM Provider 抽象层
// 使用 LLM_API_KEY 环境变量，支持 Redis 动态更新
// 支持: openai / groq / deepseek
// ============================================================

import { createOpenAI } from '@ai-sdk/openai';

export type LLMProvider = 'openai' | 'groq' | 'deepseek';

// ---- Provider 配置 ----
const PROVIDER_CONFIG = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
  },
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.1-70b-versatile',
  },
  deepseek: {
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
  },
} as const;

// Redis key 存储动态配置
const REDIS_KEY_CONFIG = 'llm:config';

interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
}

// ---- 获取当前配置（优先 Redis，降级环境变量） ----
async function getLLMConfig(): Promise<LLMConfig> {
  // 默认配置
  const defaultProvider = (process.env.LLM_PROVIDER?.toLowerCase() as LLMProvider) || 'deepseek';
  const providerEnvKey: Record<LLMProvider, string | undefined> = {
    openai: process.env.OPENAI_API_KEY,
    groq: process.env.GROQ_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
  };
  const defaultApiKey = process.env.LLM_API_KEY || providerEnvKey[defaultProvider] || '';

  try {
    const { redis } = await import('./redis');
    const cached = await redis.get<LLMConfig>(REDIS_KEY_CONFIG);
    if (cached?.apiKey) {
      return cached;
    }
  } catch {
    // Redis 不可用，使用默认配置
  }

  return {
    provider: defaultProvider,
    apiKey: defaultApiKey,
  };
}

// ---- 获取当前 Provider 名称 ----
export async function getProviderName(): Promise<LLMProvider> {
  const config = await getLLMConfig();
  return config.provider;
}

// ---- 获取 LLM 模型实例 ----
export async function getLLM() {
  const config = await getLLMConfig();
  const providerConfig = PROVIDER_CONFIG[config.provider] || PROVIDER_CONFIG.deepseek;

  if (!config.apiKey) {
    throw new Error(`LLM_API_KEY_MISSING:${config.provider}`);
  }

  const openai = createOpenAI({
    baseURL: providerConfig.baseURL,
    apiKey: config.apiKey,
  });

  return {
    model: openai.chat(providerConfig.defaultModel),
    provider: config.provider,
    modelId: providerConfig.defaultModel,
  };
}

// ---- 更新 LLM 配置（管理员用） ----
export async function updateLLMConfig(newConfig: Partial<LLMConfig>): Promise<LLMConfig> {
  const current = await getLLMConfig();
  const updated = { ...current, ...newConfig };

  try {
    const { redis } = await import('./redis');
    await redis.set(REDIS_KEY_CONFIG, updated);
  } catch {
    // Redis 不可用
  }

  return updated;
}

// ---- 获取当前配置（脱敏，用于展示） ----
export async function getLLMConfigSafe(): Promise<{ provider: LLMProvider; apiKeyMasked: string }> {
  const config = await getLLMConfig();
  const masked = config.apiKey
    ? `${config.apiKey.slice(0, 8)}${'*'.repeat(8)}${config.apiKey.slice(-4)}`
    : '未配置';
  return {
    provider: config.provider,
    apiKeyMasked: masked,
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
