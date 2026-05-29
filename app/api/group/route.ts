// ============================================================
// 聚餐房间 API
// 创建房间、加入房间、获取房间信息
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRequestLogger } from '@/lib/logger';
import { nanoid } from 'nanoid';

// 生成6位短码
function generateCode(): string {
  return nanoid(6).toUpperCase();
}

// 创建房间
export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  const logger = createRequestLogger(requestId);

  try {
    const { name, userId, nickname, spicyLevel, dislikes, city } = await req.json();

    if (!name || !nickname) {
      return NextResponse.json({ error: '缺少房间名或昵称' }, { status: 400 });
    }

    const code = generateCode();

    const group = await prisma.group.create({
      data: {
        code,
        name,
        creatorId: userId || 'anonymous',
        city: city || '成都',
        members: {
          create: {
            userId: userId || null,
            nickname,
            spicyLevel: spicyLevel || 3,
            dislikes: dislikes || [],
            isCreator: true,
          },
        },
      },
      include: {
        members: true,
      },
    });

    logger.info({ groupId: group.id, code, name }, 'Group created');

    return NextResponse.json({
      success: true,
      group: {
        id: group.id,
        code: group.code,
        name: group.name,
        status: group.status,
        members: group.members,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Create group failed');
    return NextResponse.json({ error: '创建房间失败' }, { status: 500 });
  }
}

// 获取房间信息
export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  const logger = createRequestLogger(requestId);

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: '缺少房间码' }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        members: {
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: '房间不存在' }, { status: 404 });
    }

    logger.info({ groupId: group.id, code, memberCount: group.members.length }, 'Group fetched');

    return NextResponse.json({
      success: true,
      group: {
        id: group.id,
        code: group.code,
        name: group.name,
        status: group.status,
        city: group.city,
        aiResult: group.aiResult,
        members: group.members.map(m => ({
          id: m.id,
          nickname: m.nickname,
          spicyLevel: m.spicyLevel,
          dislikes: m.dislikes,
          preferences: m.preferences,
          isCreator: m.isCreator,
        })),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get group failed');
    return NextResponse.json({ error: '获取房间信息失败' }, { status: 500 });
  }
}
