// ============================================================
// 语音反馈 API
// 1. Whisper API 转文字
// 2. GPT-3.5 分析用户态度和偏好
// 3. 返回更新建议
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { getLLM } from '@/lib/llm';
import { generateText } from 'ai';

// 分析用户语音反馈
async function analyzeFeedback(text: string, currentRecommendation: string): Promise<{
  sentiment: 'positive' | 'negative' | 'neutral';
  suggestions: {
    spicyLevel?: number;
    preferredIngredients?: string[];
    dislikedIngredients?: string[];
    preferredDishes?: string[];
    feedback?: string;
  };
  response: string;
}> {
  const { model } = await getLLM();

  const prompt = `你是一个美食推荐助手的偏好分析模块。

当前推荐内容：
${currentRecommendation}

用户语音反馈：
"${text}"

请分析用户的反馈，返回 JSON 格式：
{
  "sentiment": "positive/negative/neutral",
  "suggestions": {
    "spicyLevel": 1-5的数字（如果用户提到辣度）,
    "preferredIngredients": ["用户喜欢的食材"],
    "dislikedIngredients": ["用户不喜欢的食材"],
    "preferredDishes": ["用户想吃的菜品"],
    "feedback": "用户的其他意见"
  },
  "response": "给用户的简短回复（20字以内，友好幽默）"
}

示例：
- "太辣了" -> {"sentiment":"negative","suggestions":{"spicyLevel":2},"response":"好的，下次给您少放点辣椒"}
- "麻婆豆腐不错" -> {"sentiment":"positive","suggestions":{"preferredDishes":["麻婆豆腐"]},"response":"收到！看来您喜欢经典川菜"}
- "能不能来点清淡的" -> {"sentiment":"neutral","suggestions":{"spicyLevel":1,"preferredIngredients":["蔬菜","豆腐"]},"response":"了解，给您安排清淡口味"}
- "不要香菜" -> {"sentiment":"negative","suggestions":{"dislikedIngredients":["香菜"]},"response":"好的，香菜已加入黑名单"}

只返回 JSON，不要其他文字。`;

  const { text: result } = await generateText({
    model,
    prompt,
    temperature: 0.3,
  });

  try {
    // 提取 JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // 解析失败
  }

  return {
    sentiment: 'neutral',
    suggestions: {},
    response: '收到您的反馈',
  };
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  const logger = createRequestLogger(requestId);

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const currentRecommendation = formData.get('recommendation') as string || '';
    const userId = formData.get('userId') as string || '';

    if (!audioFile) {
      return NextResponse.json({ error: '缺少音频文件' }, { status: 400 });
    }

    logger.info({ userId, fileSize: audioFile.size }, 'Voice feedback received');

    // Step 1: 调用 Whisper API 转文字
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'zh');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      const error = await whisperResponse.text();
      logger.error({ error, status: whisperResponse.status }, 'Whisper API failed');
      return NextResponse.json({ error: '语音识别失败' }, { status: 500 });
    }

    const whisperResult = await whisperResponse.json();
    const transcript = whisperResult.text;

    logger.info({ transcript }, 'Whisper transcription completed');

    // Step 2: GPT-3.5 分析用户态度
    const analysis = await analyzeFeedback(transcript, currentRecommendation);

    logger.info({ sentiment: analysis.sentiment, suggestions: analysis.suggestions }, 'Feedback analyzed');

    return NextResponse.json({
      success: true,
      transcript,
      analysis,
    });
  } catch (error) {
    logger.error({ error }, 'Voice feedback processing failed');
    return NextResponse.json({ error: '处理语音反馈失败' }, { status: 500 });
  }
}
