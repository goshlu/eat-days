// ============================================================
// 黑名单管理 API
// 用户手动将菜品加入黑名单，下次不再推荐
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 强制动态渲染
export const dynamic = 'force-dynamic';

// ---- POST /api/blacklist ----
// 将菜品加入黑名单
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dishName, userId } = body;

    if (!dishName || typeof dishName !== 'string') {
      return NextResponse.json(
        { error: '缺少菜品名称 dishName' },
        { status: 400 },
      );
    }

    const trimmedName = dishName.trim();

    if (!trimmedName) {
      return NextResponse.json(
        { error: '菜品名称不能为空' },
        { status: 400 },
      );
    }

    // 保存到数据库（如果 userId 存在）
    if (userId) {
      try {
        await prisma.blacklistItem.create({
          data: {
            dishName: trimmedName,
            userId,
          },
        });
      } catch (dbError) {
        // 可能是重复记录，忽略
        console.warn('[/api/blacklist] DB save warning:', dbError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `「${trimmedName}」已加入黑名单，下次推荐将避开`,
      dishName: trimmedName,
    });
  } catch (error) {
    console.error('[/api/blacklist] Error:', error);
    return NextResponse.json(
      { error: '操作失败' },
      { status: 500 },
    );
  }
}

// ---- GET /api/blacklist ----
// 查询用户当前黑名单
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: '缺少 userId 参数' },
        { status: 400 },
      );
    }

    const items = await prisma.blacklistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, dishName: true, createdAt: true },
    });

    return NextResponse.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error) {
    console.error('[/api/blacklist GET] Error:', error);
    return NextResponse.json(
      { error: '查询失败' },
      { status: 500 },
    );
  }
}

// ---- DELETE /api/blacklist ----
// 将菜品从黑名单移除
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { dishName, userId } = body;

    if (!dishName || !userId) {
      return NextResponse.json(
        { error: '缺少 dishName 或 userId' },
        { status: 400 },
      );
    }

    await prisma.blacklistItem.deleteMany({
      where: {
        dishName: dishName.trim(),
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `「${dishName}」已从黑名单移除`,
    });
  } catch (error) {
    console.error('[/api/blacklist DELETE] Error:', error);
    return NextResponse.json(
      { error: '操作失败' },
      { status: 500 },
    );
  }
}