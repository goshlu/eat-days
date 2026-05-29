'use client';

import * as React from 'react';
import { useCompletion } from 'ai/react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SettingsDialog } from '@/components/settings-dialog';
import { RecommendCard } from '@/components/recommend-card';
import { UserNav } from '@/components/user-nav';
import { WeatherBadge } from '@/components/weather-badge';
import { ShareButton } from '@/components/share-button';
import { VoiceControl } from '@/components/voice-control';
import { VoiceFeedbackButton } from '@/components/voice-feedback-button';
import { RefreshCw, Loader2, Shuffle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackRecommendationShown, trackSettingsUpdated } from '@/lib/analytics';

// ---- 推荐数据类型 ----
interface RecommendationJSON {
  cook: { dish: string; reason: string; quickTip: string; ingredients: string };
  takeout: { dish: string; reason: string; tip: string };
  eatOut: { type: string; dish: string; tip: string };
  chefComment?: string;
}

// ============================================================
// 一人食·川菜推荐官 — 主页面
// ============================================================

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const;
const STORAGE_KEY = 'sichuan_solo_prefs';
const HISTORY_KEY = 'sichuan_solo_history';
const HISTORY_TTL = 7 * 24 * 60 * 60 * 1000;
const RATE_LIMIT_KEY = 'sichuan_solo_rate_limit';
const RATE_LIMIT_MAX = 3;

// ---- 工具函数 ----
function getDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${WEEKDAYS[now.getDay()]}`;
}

function getApiDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${WEEKDAYS[now.getDay()]}`;
}

// ---- 每日额度管理（localStorage） ----
function getTodayRateLimit(): { count: number; date: string } {
  try {
    const raw = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '{}');
    const today = new Date().toISOString().slice(0, 10);
    if (raw.date === today) {
      return { count: raw.count || 0, date: today };
    }
    return { count: 0, date: today };
  } catch {
    return { count: 0, date: new Date().toISOString().slice(0, 10) };
  }
}

function incrementRateLimit(): number {
  const today = new Date().toISOString().slice(0, 10);
  const { count } = getTodayRateLimit();
  const newCount = count + 1;
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ count: newCount, date: today }));
  return newCount;
}

// ---- 主页面 ----
export default function Home() {
  // NextAuth session
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;

  // 偏好状态
  const [spicyLevel, setSpicyLevel] = React.useState(3);
  const [dislikes, setDislikes] = React.useState<string[]>([]);
  const [city, setCity] = React.useState('成都');
  const [weatherDesc, setWeatherDesc] = React.useState('');
  const [ingredients, setIngredients] = React.useState<string[]>([]);
  const [history, setHistory] = React.useState<{ dish: string; date: number }[]>([]);
  const [mounted, setMounted] = React.useState(false);
  const shareRef = React.useRef<HTMLDivElement>(null);

  // 本地推荐状态
  const [localRecommendation, setLocalRecommendation] = React.useState<RecommendationJSON | null>(null);

  // 每日额度状态
  const [rateLimitReached, setRateLimitReached] = React.useState(false);

  // 加载本地存储
  React.useEffect(() => {
    setMounted(true);
    try {
      const prefs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (prefs.spicyLevel) setSpicyLevel(prefs.spicyLevel);
      if (prefs.dislikes) setDislikes(prefs.dislikes);
      if (prefs.city) setCity(prefs.city);
    } catch { /* ignore */ }

    try {
      const raw: { dish: string; date: number }[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const now = Date.now();
      const filtered = raw.filter((h) => now - h.date < HISTORY_TTL);
      setHistory(filtered);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    } catch { /* ignore */ }

    // 检查每日额度
    try {
      const { count } = getTodayRateLimit();
      if (count >= RATE_LIMIT_MAX) {
        setRateLimitReached(true);
      }
    } catch { /* ignore */ }
  }, []);

  // 保存偏好
  const savePrefs = React.useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ spicyLevel, dislikes }));
  }, [spicyLevel, dislikes]);

  // 保存历史
  const saveHistory = React.useCallback((items: { dish: string; date: number }[]) => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  }, []);

  // 添加历史
  const addHistoryDish = React.useCallback(
    (name: string) => {
      setHistory((prev) => {
        if (prev.find((h) => h.dish === name)) return prev;
        const next = [...prev, { dish: name, date: Date.now() }];
        saveHistory(next);
        return next;
      });
    },
    [saveHistory],
  );

  // 黑名单
  const blacklist = React.useMemo(() => history.map((h) => h.dish), [history]);

  // ---- useCompletion（AI 模式） ----
  const [aiRecommendation, setAiRecommendation] = React.useState<RecommendationJSON | null>(null);
  const [speakText, setSpeakText] = React.useState<string | undefined>();
  
  const {
    completion,
    isLoading: aiLoading,
    error: aiError,
    complete,
    stop,
  } = useCompletion({
    api: '/api/recommend',
    onFinish: (_prompt, completion) => {
      // 从完成内容中提取菜品名加入历史
      const cookMatch = completion.match(/\*\*推荐菜[：:]\*\*\s*(.+)/);
      const takeoutMatch = completion.match(/\*\*推荐点[：:]\*\*\s*(.+)/);
      if (cookMatch?.[1]) addHistoryDish(cookMatch[1].trim());
      if (takeoutMatch?.[1]) addHistoryDish(takeoutMatch[1].trim());
      // 解析为 JSON
      const cook = {
        dish: cookMatch?.[1]?.trim() || '',
        reason: completion.match(/\*\*理由[：:]\*\*\s*(.+)/)?.[1]?.trim() || '',
        quickTip: completion.match(/\*\*快手秘籍[：:]\*\*\s*(.+)/)?.[1]?.trim() || '',
        ingredients: completion.match(/\*\*食材清单[：:（(（]单人份[）)]\*\*\s*(.+)/)?.[1]?.trim() || '',
      };
      const takeout = {
        dish: takeoutMatch?.[1]?.trim() || '',
        reason: completion.match(/\*\*理由[：:]\*\*\s*(.+)/)?.[1]?.trim() || '',
        tip: completion.match(/\*\*凑单小贴士[：:]\*\*\s*(.+)/)?.[1]?.trim() || '',
      };
      const eatOut = {
        type: completion.match(/\*\*推荐餐厅类型[：:]\*\*\s*(.+)/)?.[1]?.trim() || '',
        dish: completion.match(/\*\*必点菜品[：:]\*\*\s*(.+)/)?.[1]?.trim() || '',
        tip: completion.match(/\*\*单人友好提示[：:]\*\*\s*(.+)/)?.[1]?.trim() || '',
      };
      const chefComment = completion.match(/\*\*点评[：:]\*\*\s*(.+)/)?.[1]?.trim() || '';
      setAiRecommendation({ cook, takeout, eatOut, chefComment });
      // 语音播报第一道菜
      if (cook.dish) {
        setSpeakText(`今日推荐做饭：${cook.dish}。${cook.reason}`);
      }
      // 埋点
      trackRecommendationShown({
        cook: cook.dish,
        takeout: takeout.dish,
        eatOut: eatOut.dish,
        source: 'ai',
        spicyLevel,
        userId,
      });
      // AI 模式成功，递增本地额度计数
      const newCount = incrementRateLimit();
      if (newCount >= RATE_LIMIT_MAX) {
        setRateLimitReached(true);
      }
    },
    onError: (err: Error) => {
      console.error('AI completion error:', err);
      // 检查是否为 429 额度超限错误
      if (err?.message?.includes('429') || err?.message?.includes('RATE_LIMIT_EXCEEDED')) {
        setRateLimitReached(true);
      }
    },
  });

  // ---- 生成入口 ----
  const generate = React.useCallback(() => {
    if (rateLimitReached) return;

    // 通过后端 API 调用 AI
    setLocalRecommendation(null);
    setAiRecommendation(null);
    complete('请生成今日一人食川菜推荐。', {
      body: {
        date: getApiDateStr(),
        spicyLevel,
        dislikes,
        historyDishes: blacklist,
        userId,
        weather: weatherDesc || undefined,
        city,
        ingredients: ingredients.length > 0 ? ingredients : undefined,
      },
    });
  }, [complete, spicyLevel, dislikes, blacklist, userId, weatherDesc, city, ingredients, rateLimitReached]);

  // ---- 刷新（换一天） ----
  const refresh = React.useCallback(() => {
    if (rateLimitReached) return;
    if (aiLoading) {
      stop();
    }
    // 清除今天的历史记录
    const today = new Date().toISOString().slice(0, 10);
    const filtered = history.filter(
      (h) => new Date(h.date).toISOString().slice(0, 10) !== today,
    );
    setHistory(filtered);
    saveHistory(filtered);
    // 稍后重新生成
    setTimeout(generate, 100);
  }, [aiLoading, stop, history, saveHistory, generate, rateLimitReached]);

  // ---- 随机惊喜（从历史中随机选一天） ----
  const [randomLoading, setRandomLoading] = React.useState(false);

  const randomSurprise = React.useCallback(async () => {
    if (!userId) {
      // 未登录时直接调用普通推荐
      generate();
      return;
    }

    setRandomLoading(true);
    setLocalRecommendation(null);
    setAiRecommendation(null);

    try {
      const res = await fetch(`/api/random?userId=${userId}`);
      const data = await res.json();

      if (data.success && data.data) {
        // 有历史记录，显示随机一天
        setLocalRecommendation(data.data.json || null);
      } else {
        // 没有历史，降级调用正常推荐
        generate();
      }
    } catch {
      // 出错时降级调用正常推荐
      generate();
    } finally {
      setRandomLoading(false);
    }
  }, [userId, generate]);

  // 语音命令处理
  const handleVoiceCommand = React.useCallback((command: 'generate' | 'refresh') => {
    if (command === 'generate') {
      generate();
    } else if (command === 'refresh') {
      refresh();
    }
  }, [generate, refresh]);

  // 语音反馈处理
  const handleVoiceFeedback = React.useCallback((feedback: {
    transcript: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    suggestions: {
      spicyLevel?: number;
      preferredIngredients?: string[];
      dislikedIngredients?: string[];
      preferredDishes?: string[];
    };
    response: string;
  }) => {
    const { suggestions, sentiment } = feedback;

    // 更新辣度偏好
    if (suggestions.spicyLevel) {
      setSpicyLevel(suggestions.spicyLevel);
    }

    // 更新忌口列表
    if (suggestions.dislikedIngredients && suggestions.dislikedIngredients.length > 0) {
      setDislikes(prev => {
        const combined = [...prev, ...suggestions.dislikedIngredients!];
        const newDislikes = Array.from(new Set(combined));
        return newDislikes;
      });
    }

    // 如果是负向反馈或有具体修改意见，自动刷新推荐
    if (sentiment === 'negative' || suggestions.spicyLevel || suggestions.dislikedIngredients) {
      setTimeout(() => generate(), 500);
    }

    // 保存偏好到本地存储
    savePrefs();
  }, [generate, savePrefs]);

  // ---- 设置保存 ----
  const handleSaveSettings = React.useCallback(
    (settings: { spicyLevel: number; dislikes: string[]; city: string }) => {
      setSpicyLevel(settings.spicyLevel);
      setDislikes(settings.dislikes);
      setCity(settings.city);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(settings),
      );
      // 埋点
      trackSettingsUpdated({
        spicyLevel: settings.spicyLevel,
        dislikes: settings.dislikes,
        provider: 'backend',
        userId,
      });
    },
    [userId],
  );

  // ---- 清空历史 ----
  const clearHistory = React.useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, [saveHistory]);

  // ---- 当前展示内容 ----
  const displayContent = completion;
  const displayRecommendation = aiRecommendation;
  const displayLoading = aiLoading;
  const displayError = rateLimitReached
    ? '明天再来吧，今天的推荐次数已用完 😋'
    : (aiError?.message || null);

  // 防止 SSR hydration 不匹配
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <header className="gradient-header text-white pt-12 pb-8 px-5">
          <div className="relative z-10 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold tracking-wide">🍜 一人食·川菜推荐官</h1>
            <p className="text-white/70 text-sm mt-1">加载中…</p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="gradient-header text-white pt-12 pb-8 px-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 max-w-lg mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-wide">🍜 一人食·川菜推荐官</h1>
            <p className="text-white/70 text-sm mt-1">专为独居青年打造的川味每日推荐</p>
            <p className="text-white/60 text-xs mt-2">{getDateStr()}</p>
            <div className="mt-2">
              <WeatherBadge city={city} onWeatherLoaded={(w) => setWeatherDesc(`${w.description} ${w.temp}°C`)} />
            </div>
          </div>
          <div className="flex gap-2 mt-1 items-center">
            <UserNav />
            <SettingsDialog
              spicyLevel={spicyLevel}
              dislikes={dislikes}
              city={city}
              userId={userId}
              onSave={handleSaveSettings}
            />
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-lg mx-auto px-4 -mt-4 relative z-10 pb-8">
        {/* 当前偏好标签 */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary" className="text-xs">
            🌶️ 辣度 {spicyLevel}/5
          </Badge>
          {dislikes.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              🚫 忌口：{dislikes.join('、')}
            </Badge>
          )}
        </div>

        {/* 额度提示 */}
        {rateLimitReached && (
          <Card className="mb-4 border-amber-200 bg-amber-50">
            <CardContent className="p-4 text-center">
              <p className="text-amber-700 font-medium text-sm">🔒 今日推荐次数已用完</p>
              <p className="text-amber-500 text-xs mt-1">明天再来吧，每天最多生成 {RATE_LIMIT_MAX} 次推荐</p>
            </CardContent>
          </Card>
        )}

        {/* 推荐内容（可截图区域） */}
        <div ref={shareRef}>
        <RecommendCard
          content={displayContent}
          recommendation={displayRecommendation}
          isLoading={displayLoading}
          error={rateLimitReached ? null : displayError}
          dateStr={getDateStr()}
          userId={userId}
          spicyLevel={spicyLevel}
          dislikes={dislikes}
        />

        </div>

        {/* 分享按钮 */}
        {(displayContent || displayRecommendation) && !displayLoading && (
          <div className="mt-3 flex justify-end">
            <ShareButton targetRef={shareRef as React.RefObject<HTMLElement>} dateStr={getDateStr()} />
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 mt-4">
          <Button
            onClick={generate}
            disabled={displayLoading || randomLoading || rateLimitReached}
            className={cn(
              'flex-1 h-12 text-base font-bold gradient-btn border-0 shadow-lg shadow-purple-500/20',
              rateLimitReached && 'opacity-50 cursor-not-allowed'
            )}
          >
            {rateLimitReached ? (
              '🔒 明天再来吧'
            ) : displayLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中…
              </>
            ) : (
              '🎲 今天吃什么'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={randomSurprise}
            disabled={displayLoading || randomLoading || rateLimitReached}
            className={cn(
              'h-12 shrink-0 px-3',
              rateLimitReached && 'opacity-50 cursor-not-allowed'
            )}
            title="随机惊喜：回顾往日推荐"
          >
            {randomLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Shuffle className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            disabled={displayLoading || randomLoading || rateLimitReached}
            className={cn(
              'h-12 w-12 shrink-0',
              rateLimitReached && 'opacity-50 cursor-not-allowed'
            )}
            title="换一天"
          >
            <RefreshCw className={cn('h-5 w-5', displayLoading && 'animate-spin')} />
          </Button>
          <VoiceControl
            onCommand={handleVoiceCommand}
            speakText={speakText}
            disabled={displayLoading || rateLimitReached}
            className="h-12"
          />
        </div>

        {/* 历史记录 */}
        <Card className="mt-4">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">
                📋 最近7天已推荐{' '}
                <span className="text-muted-foreground font-normal">({history.length})</span>
              </h2>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="h-6 px-2 text-xs text-red-400 hover:text-red-500 hover:bg-red-50"
                >
                  清空
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {history.length === 0 ? (
                <span className="text-muted-foreground text-xs">暂无记录</span>
              ) : (
                history.map((h) => (
                  <Badge key={h.dish} variant="secondary" className="text-xs font-normal">
                    {h.dish}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 历史记录入口 */}
        {userId && (
          <Card className="mt-4 cursor-pointer hover:shadow-md transition-all" onClick={() => window.location.href = '/history'}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">📋 历史推荐</p>
                  <p className="text-xs text-muted-foreground">查看过去 7 天的推荐记录</p>
                </div>
              </div>
              <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground py-6">
          <p>一人食·川菜推荐官 v1.0</p>
          <p className="mt-1">MIT © 2026 · 川味不将就</p>
        </footer>
      </main>

      {/* 浮动语音反馈按钮 */}
      <VoiceFeedbackButton
        currentRecommendation={displayContent || undefined}
        userId={userId}
        onFeedback={handleVoiceFeedback}
        disabled={displayLoading}
      />
    </div>
  );
}