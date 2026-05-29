'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, Lock, TrendingUp, ThumbsDown, Settings } from 'lucide-react';

// ============================================================
// 数据分析页面（仅管理员可看）
// 展示 PostHog 事件统计
// ============================================================

// ---- 管理员 ID 列表（从环境变量读取） ----
const ADMIN_IDS = (process.env.NEXT_PUBLIC_ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

// ---- 模拟数据（实际应从 PostHog API 获取） ----
// 注：生产环境应调用 PostHog API 获取真实数据
const MOCK_DATA = {
  totalRecommendations: 1247,
  totalDislikes: 89,
  totalSettingsUpdates: 156,
  topDishes: [
    { name: '麻婆豆腐', count: 87 },
    { name: '回锅肉', count: 72 },
    { name: '鱼香肉丝', count: 65 },
    { name: '水煮肉片', count: 58 },
    { name: '宫保鸡丁', count: 52 },
  ],
  topDislikes: [
    { name: '香菜', count: 23 },
    { name: '内脏', count: 18 },
    { name: '折耳根', count: 12 },
  ],
  spicyDistribution: [
    { level: 1, label: '微辣', count: 89 },
    { level: 2, label: '中辣', count: 234 },
    { level: 3, label: '重辣', count: 456 },
    { level: 4, label: '爆辣', count: 312 },
    { level: 5, label: '变态辣', count: 156 },
  ],
  sourceDistribution: [
    { source: 'AI 生成', count: 892 },
    { source: '本地模式', count: 245 },
    { source: '缓存命中', count: 110 },
  ],
};

// ---- 简单柱状图组件 ----
function BarChart({ data, maxValue, color }: { data: { label: string; value: number }[]; maxValue: number; color: string }) {
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16 text-right">{item.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <span className="text-xs font-medium w-10">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ---- 主页面 ----
export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const router = useRouter();

  // 检查管理员权限
  const isAdmin = userId && ADMIN_IDS.includes(userId);

  // 加载中
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <p className="text-muted-foreground">加载中…</p>
      </div>
    );
  }

  // 未登录或非管理员
  if (!userId || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <header className="gradient-header text-white pt-12 pb-8 px-5">
          <div className="relative z-10 max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/')}
                className="h-8 w-8 text-white hover:bg-white/20 -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold tracking-wide">📊 数据分析</h1>
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 -mt-4 relative z-10 pb-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm font-medium mb-1">无权访问</p>
              <p className="text-muted-foreground text-xs text-center max-w-xs">
                此页面仅管理员可查看
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push('/')}
              >
                返回首页
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const maxSpicy = Math.max(...MOCK_DATA.spicyDistribution.map(d => d.count));
  const maxDish = Math.max(...MOCK_DATA.topDishes.map(d => d.count));

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="gradient-header text-white pt-12 pb-8 px-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
              className="h-8 w-8 text-white hover:bg-white/20 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-wide">📊 数据分析</h1>
          </div>
          <p className="text-white/70 text-sm">PostHog 事件统计（模拟数据）</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 -mt-4 relative z-10 pb-8">
        {/* 概览卡片 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-4 w-4 mx-auto text-purple-500 mb-1" />
              <p className="text-xs text-muted-foreground">推荐次数</p>
              <p className="text-lg font-bold">{MOCK_DATA.totalRecommendations}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <ThumbsDown className="h-4 w-4 mx-auto text-red-500 mb-1" />
              <p className="text-xs text-muted-foreground">忌口点击</p>
              <p className="text-lg font-bold">{MOCK_DATA.totalDislikes}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Settings className="h-4 w-4 mx-auto text-blue-500 mb-1" />
              <p className="text-xs text-muted-foreground">设置更新</p>
              <p className="text-lg font-bold">{MOCK_DATA.totalSettingsUpdates}</p>
            </CardContent>
          </Card>
        </div>

        {/* 热门推荐菜品 */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              热门推荐菜品
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={MOCK_DATA.topDishes.map(d => ({ label: d.name, value: d.count }))}
              maxValue={maxDish}
              color="#8b5cf6"
            />
          </CardContent>
        </Card>

        {/* 辣度分布 */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              🌶️ 辣度偏好分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={MOCK_DATA.spicyDistribution.map(d => ({ label: d.label, value: d.count }))}
              maxValue={maxSpicy}
              color="#f97316"
            />
          </CardContent>
        </Card>

        {/* 来源分布 */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              📈 推荐来源分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={MOCK_DATA.sourceDistribution.map(d => ({ label: d.source, value: d.count }))}
              maxValue={Math.max(...MOCK_DATA.sourceDistribution.map(d => d.count))}
              color="#3b82f6"
            />
          </CardContent>
        </Card>

        {/* 热门忌口 */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              🚫 热门忌口
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {MOCK_DATA.topDislikes.map((item, i) => (
                <div key={i} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 rounded-full">
                  <span className="text-sm text-red-700">{item.name}</span>
                  <span className="text-xs text-red-500">({item.count})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* PostHog 链接 */}
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">
              完整数据分析请访问 PostHog 控制台
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://app.posthog.com', '_blank')}
            >
              打开 PostHog
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground py-6">
          <Button
            variant="link"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => router.push('/')}
          >
            ← 返回首页
          </Button>
        </footer>
      </main>
    </div>
  );
}
