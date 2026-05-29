// ============================================================
// 加入聚餐房间 API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRequestLogger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  const logger = createRequestLogger(requestId);

  try {
    const { code, userId, nickname, spicyLevel, dislikes, preferences } = await req.json();

    if (!code || !nickname) {
      return NextResponse.json({ error: '缺少房间码或昵称' }, { status: 400 });
    }

    // 查找房间
    const group = await prisma.group.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!group) {
      return NextResponse.json({ error: '房间不存在' }, { status: 404 });
    }

    if (group.status !== 'waiting') {
      return NextResponse.json({ error: '房间已关闭或正在推荐中' }, { status: 400 });
    }

    // 检查昵称是否已存在
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_nickname: {
          groupId: group.id,
          nickname,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: '昵称已被使用' }, { status: 400 });
    }

    // 加入房间
    const member = await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: userId || null,
        nickname,
        spicyLevel: spicyLevel || 3,
        dislikes: dislikes || [],
        preferences,
      },
    });

    logger.info({ groupId: group.id, nickname }, 'Member joined group');

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        nickname: member.nickname,
        spicyLevel: member.spicyLevel,
        dislikes: member.dislikes,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Join group failed');
    return NextResponse.json({ error: '加入房间失败' }, { status: 500 });
  }
}
