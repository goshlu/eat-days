// ============================================================
// 聚餐推荐 API
// 根据成员偏好生成共享菜品推荐
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRequestLogger } from '@/lib/logger';
import { getLLM } from '@/lib/llm';
import { generateText } from 'ai';

// 生成聚餐推荐
async function generateGroupRecommendation(
  members: Array<{
    nickname: string;
    spicyLevel: number;
    dislikes: string[];
    preferences?: string | null;
  }>,
  city: string,
): Promise<{
  dishes: Array<{
    name: string;
    servings: number;
    spicyLevel: string;
    description: string;
    reason: string;
  }>;
  summary: string;
}> {
  const { model } = await getLLM();

  const memberInfo = members.map(m => 
    `- ${m.nickname}: 辣度${m.spicyLevel}/5, 忌口${m.dislikes.join('、') || '无'}${m.preferences ? `, 偏好${m.preferences}` : ''}`
  ).join('\n');

  const prompt = `你是一个聚餐推荐助手。请根据以下成员的偏好，推荐3-4道适合共享的川菜。

成员信息：
${memberInfo}
城市：${city}

要求：
1. 推荐3-4道适合多人共享的菜品
2. 标注每道菜适合几人食用
3. 兼顾不同辣度偏好，有辣有不辣
4. 避开所有人的忌口食材
5. 菜品搭配合理（有荤有素、有凉有热）

请返回JSON格式：
{
  "dishes": [
    {
      "name": "菜品名",
      "servings": 适合人数,
      "spicyLevel": "微辣/中辣/重辣",
      "description": "简短描述",
      "reason": "推荐理由"
    }
  ],
  "summary": "整体搭配建议（50字以内）"
}

只返回JSON，不要其他文字。`;

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.7,
  });

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // 解析失败
  }

  return {
    dishes: [
      { name: '回锅肉', servings: 3, spicyLevel: '中辣', description: '经典川菜', reason: '大众口味' },
      { name: '麻婆豆腐', servings: 2, spicyLevel: '重辣', description: '麻辣鲜香', reason: '下饭神器' },
      { name: '蒜泥白肉', servings: 3, spicyLevel: '微辣', description: '清爽开胃', reason: '适合不太能吃辣的人' },
    ],
    summary: '荤素搭配，辣度适中，适合聚餐分享',
  };
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  const logger = createRequestLogger(requestId);

  try {
    const { groupId } = await req.json();

    if (!groupId) {
      return NextResponse.json({ error: '缺少房间ID' }, { status: 400 });
    }

    // 获取房间和成员信息
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: true,
      },
    });

    if (!group) {
      return NextResponse.json({ error: '房间不存在' }, { status: 404 });
    }

    if (group.members.length < 2) {
      return NextResponse.json({ error: '至少需要2位成员才能生成推荐' }, { status: 400 });
    }

    logger.info({ groupId, memberCount: group.members.length }, 'Generating group recommendation');

    // 更新状态为推荐中
    await prisma.group.update({
      where: { id: groupId },
      data: { status: 'recommending' },
    });

    // 生成推荐
    const recommendation = await generateGroupRecommendation(
      group.members.map(m => ({
        nickname: m.nickname,
        spicyLevel: m.spicyLevel,
        dislikes: m.dislikes,
        preferences: m.preferences,
      })),
      group.city || '成都',
    );

    // 保存推荐结果
    await prisma.group.update({
      where: { id: groupId },
      data: {
        status: 'completed',
        aiResult: recommendation,
      },
    });

    logger.info({ groupId, dishes: recommendation.dishes.length }, 'Group recommendation generated');

    return NextResponse.json({
      success: true,
      recommendation,
    });
  } catch (error) {
    logger.error({ error }, 'Generate group recommendation failed');
    return NextResponse.json({ error: '生成推荐失败' }, { status: 500 });
  }
}
