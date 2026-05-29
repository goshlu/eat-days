// ============================================================
// 随机惊喜 API
// 随机返回用户历史推荐中的一天（排除今天）
// 若没有历史则返回 null，前端可降级调用正常推荐
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

    // 获取今天日期范围（北京时间）
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // 查询排除今天的所有历史推荐
    const recommendations = await prisma.recommendation.findMany({
      where: {
        userId,
        date: {
          not: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        cook: true,
        takeout: true,
        eatOut: true,
      },
    });

    // 没有历史记录
    if (recommendations.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: '没有历史推荐记录',
      });
    }

    // 随机选一天
    const randomIndex = Math.floor(Math.random() * recommendations.length);
    const randomRec = recommendations[randomIndex];

    // 格式化日期
    const recDate = new Date(randomRec.date);
    const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
    const dateStr = `${recDate.getFullYear()}年${recDate.getMonth() + 1}月${recDate.getDate()}日 星期${WEEKDAYS[recDate.getDay()]}`;

    // 将 JSON 内容组装成 Markdown 格式
    const cook = randomRec.cook as { dish?: string; reason?: string; quickTip?: string; ingredients?: string };
    const takeout = randomRec.takeout as { dish?: string; reason?: string; tip?: string };
    const eatOut = randomRec.eatOut as { type?: string; dish?: string; tip?: string };

    const content = `## 👩‍🍳 今日做饭
- **推荐菜：**${cook?.dish || '暂无'}
- **理由：**${cook?.reason || '暂无'}
- **快手秘籍：**${cook?.quickTip || '暂无'}
- **食材清单（单人份）：**${cook?.ingredients || '暂无'}

## 🛵 今日外卖
- **推荐点：**${takeout?.dish || '暂无'}
- **理由：**${takeout?.reason || '暂无'}
- **凑单小贴士：**${takeout?.tip || '暂无'}

## 🚶 出去吃
- **推荐餐厅类型：**${eatOut?.type || '暂无'}
- **必点菜品：**${eatOut?.dish || '暂无'}
- **单人友好提示：**${eatOut?.tip || '暂无'}`;

    return NextResponse.json({
      success: true,
      data: {
        date: dateStr,
        content,
        originalDate: randomRec.date,
      },
    });
  } catch (error) {
    console.error('[/api/random] Error:', error);
    return NextResponse.json(
      { error: '查询失败' },
      { status: 500 },
    );
  }
}
