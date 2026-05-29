// ============================================================
// 管理员 API - LLM 配置管理
// 需要管理员权限（通过 ADMIN_SECRET 验证）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getLLMConfigSafe, updateLLMConfig, LLMProvider } from '@/lib/llm';

// 验证管理员权限
function verifyAdmin(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    console.warn('[AdminAPI] ADMIN_SECRET not configured');
    return false;
  }

  return authHeader === `Bearer ${adminSecret}`;
}

// GET - 获取当前 LLM 配置（脱敏）
export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: '无权限' }, { status: 401 });
  }

  try {
    const config = await getLLMConfigSafe();
    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('[Admin LLM Config GET] Error:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

// PUT - 更新 LLM 配置
export async function PUT(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: '无权限' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { provider, apiKey } = body;

    // 参数校验
    const validProviders: LLMProvider[] = ['openai', 'groq', 'deepseek'];
    if (provider && !validProviders.includes(provider)) {
      return NextResponse.json(
        { error: `provider 必须是 ${validProviders.join('/')}` },
        { status: 400 },
      );
    }

    if (apiKey !== undefined && typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'apiKey 必须是字符串' },
        { status: 400 },
      );
    }

    // 更新配置
    const updated = await updateLLMConfig({
      ...(provider && { provider }),
      ...(apiKey !== undefined && { apiKey }),
    });

    // 返回脱敏配置
    const safeConfig = await getLLMConfigSafe();

    console.log(`[Admin LLM Config] Updated: provider=${updated.provider}`);

    return NextResponse.json({
      success: true,
      message: '配置已更新',
      config: safeConfig,
    });
  } catch (error) {
    console.error('[Admin LLM Config PUT] Error:', error);
    return NextResponse.json({ error: '更新配置失败' }, { status: 500 });
  }
}
