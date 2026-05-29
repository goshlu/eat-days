'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HistoryCard } from '@/components/history-card';
import { HistoryCalendar } from '@/components/history-calendar';
import { ArrowLeft, Loader2, CalendarX, List, CalendarDays } from 'lucide-react';

// ---- 类型 ----
interface HistoryEntry {
  id: string;
  date: string;
  cook: { dish: string; reason: string; quickTip: string; ingredients: string };
  takeout: { dish: string; reason: string; tip: string };
  eatOut: { type: string; dish: string; tip: string };
}

// ---- 页面 ----
export default function HistoryPage() {
  const { data: session, status } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const router = useRouter();

  const [entries, setEntries] = React.useState<HistoryEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'list' | 'calendar'>('list');

  React.useEffect(() => {
    if (status === 'loading') return;

    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/history?userId=${userId}`);
        if (!res.ok) throw new Error('查询失败');
        const data = await res.json();
        setEntries(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [userId, status]);

  // 未登录
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <header className="gradient-header text-white pt-12 pb-8 px-5">
          <div className="relative z-10 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold tracking-wide">📋 历史推荐</h1>
            <p className="text-white/70 text-sm mt-1">加载中…</p>
          </div>
        </header>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
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
              <h1 className="text-2xl font-bold tracking-wide">📋 历史推荐</h1>
            </div>
            <p className="text-white/70 text-sm">查看过去 7 天的每日推荐</p>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 -mt-4 relative z-10 pb-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CalendarX className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm font-medium mb-1">请先登录</p>
              <p className="text-muted-foreground text-xs text-center max-w-xs">
                登录后可查看你的历史推荐记录
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

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="gradient-header text-white pt-12 pb-8 px-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
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
            <h1 className="text-2xl font-bold tracking-wide">📋 历史推荐</h1>
          </div>
          <p className="text-white/70 text-sm">过去 7 天的每日推荐记录</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 -mt-4 relative z-10 pb-8">
        {/* 统计 & 视图切换 */}
        <div className="flex gap-3 mb-4">
          <Card className="flex-1">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">记录数</p>
              <p className="text-xl font-bold">{entries.length}</p>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">覆盖天数</p>
              <p className="text-xl font-bold">
                {new Set(entries.map((e) => new Date(e.date).toDateString())).size}
              </p>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="p-2 flex items-center justify-center gap-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode('calendar')}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 加载状态 */}
        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground text-sm">加载历史记录…</span>
            </CardContent>
          </Card>
        )}

        {/* 错误状态 */}
        {error && !loading && (
          <Card className="border-destructive/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-destructive text-sm">加载失败：{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => window.location.reload()}
              >
                重试
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 空状态 */}
        {!loading && !error && entries.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CalendarX className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm font-medium mb-1">暂无历史记录</p>
              <p className="text-muted-foreground text-xs text-center max-w-xs">
                过去 7 天还没有推荐记录，去首页生成一份吧
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push('/')}
              >
                去生成推荐
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 历史内容 */}
        {!loading && !error && entries.length > 0 && (
          viewMode === 'calendar' ? (
            <HistoryCalendar entries={entries} />
          ) : (
            <div className="space-y-3">
              {entries.map((entry, i) => (
                <HistoryCard
                  key={entry.id}
                  entry={{
                    ...entry,
                    date: entry.date,
                  }}
                  defaultOpen={i === 0}
                />
              ))}
            </div>
          )
        )}

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