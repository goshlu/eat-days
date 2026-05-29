// ============================================================
// 食材识别 API
// 使用 GPT-4V 识别图片中的食材
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, apiKey } = body;

    if (!image) {
      return NextResponse.json(
        { error: '缺少图片数据' },
        { status: 400 },
      );
    }

    // 支持 base64 图片或 URL
    const imageContent = image.startsWith('data:')
      ? image // base64 data URL
      : image; // URL

    const openai = createOpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY || '',
    });

    const result = await generateText({
      model: openai.chat('gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content: `你是一个专业的食材识别助手。请识别图片中的所有食材（蔬菜、肉类、调料、主食等），并以 JSON 格式输出。

输出格式：
{
  "ingredients": ["食材1", "食材2", "食材3"],
  "summary": "简短描述图片中的食材概况（一句话）",
  "suggestions": "基于这些食材，可以做什么川菜（一句话建议）"
}

注意：
- 只输出可识别的食材，不要猜测
- 食材名称用中文
- 如果图片不清晰或无法识别，ingredients 返回空数组`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请识别这张图片中的所有食材。',
            },
            {
              type: 'image',
              image: imageContent,
            },
          ],
        },
      ],
      temperature: 0.3,
    });

    // 解析 JSON 结果
    const text = result.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({
        success: true,
        data: {
          ingredients: [],
          summary: '无法识别图片中的食材',
          suggestions: '请尝试拍摄更清晰的照片',
        },
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      data: {
        ingredients: parsed.ingredients || [],
        summary: parsed.summary || '',
        suggestions: parsed.suggestions || '',
      },
    });
  } catch (error) {
    console.error('[/api/recognize] Error:', error);

    Sentry.captureException(error, {
      tags: { api: 'recognize' },
    });

    return NextResponse.json(
      { error: '食材识别失败，请重试', success: false },
      { status: 500 },
    );
  }
}