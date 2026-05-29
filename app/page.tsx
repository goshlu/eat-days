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
import { PhotoRecognize } from '@/components/photo-recognize';
import { ShareButton } from '@/components/share-button';
import { RefreshCw, Utensils, Bike, MapPin, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// 一人食·川菜推荐官 — 主页面
// ============================================================

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const;
const STORAGE_KEY = 'sichuan_solo_prefs';
const HISTORY_KEY = 'sichuan_solo_history';
const HISTORY_TTL = 7 * 24 * 60 * 60 * 1000;

// ---- 本地菜品库（无 API Key 时使用） ----
const DISH_DB = {
  cook: [
    { dish: '麻婆豆腐', reason: '经典川菜，嫩滑入味，下饭神器', tip: '秘诀：先炒肉末出油，再下豆瓣酱炒红油，最后放豆腐轻推不要翻', ingredients: '嫩豆腐 1块、猪肉末 100g、郫县豆瓣酱 1勺、花椒粉少许' },
    { dish: '鱼香肉丝', reason: '酸甜微辣，新手也能轻松驾驭', tip: '秘诀：提前调好鱼香汁（糖醋酱油比例2:2:1）', ingredients: '猪里脊 150g、木耳 5朵、胡萝卜 半根、泡椒 2个' },
    { dish: '蒜苗回锅肉', reason: '肥而不腻，蒜苗提香', tip: '秘诀：五花肉先煮后切薄片，干煸至微卷再下蒜苗', ingredients: '五花肉 200g、蒜苗 3根、郫县豆瓣酱 1勺' },
    { dish: '番茄鸡蛋面', reason: '懒人首选，10分钟搞定', tip: '秘诀：番茄先炒出沙，加一勺番茄酱更浓郁', ingredients: '番茄 1个、鸡蛋 2个、面条 150g' },
    { dish: '酸辣土豆丝', reason: '清脆爽口，成本不到5块钱', tip: '秘诀：土豆丝泡水去淀粉，大火快炒保持脆感', ingredients: '土豆 1个、干辣椒 3个、醋 1勺' },
    { dish: '水煮肉片', reason: '麻辣鲜香，一个人的火锅盛宴', tip: '秘诀：肉片用蛋清和淀粉抓匀，最后泼热油激香', ingredients: '猪里脊 200g、豆芽 100g、干辣椒、花椒' },
    { dish: '宫保鸡丁', reason: '花生酥脆鸡肉嫩，经典不踩雷', tip: '秘诀：鸡丁腌制15分钟更嫩，花生最后放', ingredients: '鸡胸肉 150g、花生米 30g、黄瓜 半根' },
    { dish: '担担面', reason: '一人食面条首选，麻辣鲜香', tip: '秘诀：芝麻酱用温水澥开，加红油和花椒粉', ingredients: '碱面 150g、猪肉末 50g、芽菜 20g、芝麻酱 1勺' },
    { dish: '虎皮青椒', reason: '焦香微辣，素菜也能吃出肉味', tip: '秘诀：青椒用刀拍扁更容易煎出虎皮', ingredients: '青椒 5个、蒜 3瓣、酱油 1勺' },
    { dish: '酸菜鱼（小份）', reason: '酸辣鲜嫩，一锅搞定', tip: '秘诀：鱼片用蛋清和淀粉上浆，下锅后不要搅动', ingredients: '黑鱼片 200g、酸菜 100g、金针菇 1把' },
    { dish: '辣子鸡', reason: '干香麻辣，越嚼越香', tip: '秘诀：鸡块炸至金黄，多放干辣椒和花椒', ingredients: '鸡腿肉 200g、干辣椒 20个、花椒 1勺' },
    { dish: '蛋炒饭（川味版）', reason: '川味灵魂一锅出', tip: '秘诀：用隔夜饭，大火快炒粒粒分明', ingredients: '隔夜饭 1碗、鸡蛋 2个、豆瓣酱 半勺、葱花' },
    { dish: '麻辣香锅（单人版）', reason: '想吃啥放啥，比外卖实惠', tip: '秘诀：食材分别焯水，最后用麻辣香锅料翻炒', ingredients: '藕片、土豆、午餐肉、金针菇、麻辣香锅料 1包' },
    { dish: '蒜泥白肉', reason: '夏天开胃首选', tip: '秘诀：五花肉煮熟后冷藏1小时更好切薄片', ingredients: '五花肉 200g、蒜 5瓣、酱油、红油' },
    { dish: '红油抄手', reason: '皮薄馅大红油香', tip: '秘诀：红油是灵魂，加花椒面和醋更正宗', ingredients: '抄手皮 20张、猪肉馅 150g、红油、花椒粉' },
    { dish: '豆花饭', reason: '重庆街头最朴素的美味', tip: '秘诀：内酯豆腐直接用，蘸碟加辣椒面和花椒面', ingredients: '内酯豆腐 1盒、米饭 1碗、辣椒面、花椒面、葱花' },
  ],
  takeout: [
    { dish: '小碗菜·回锅肉套餐', reason: '单人份量刚好，荤素搭配', tip: '凑单：加酸辣土豆丝 + 可乐 ≈ 22元' },
    { dish: '钵钵鸡·红油味', reason: '签签计费，完美一人食', tip: '凑单：荤素各5签 + 鸡汤饭 ≈ 25元' },
    { dish: '重庆小面', reason: '麻辣鲜香一碗搞定', tip: '凑单：加煎蛋 + 冰粉 ≈ 18元' },
    { dish: '冒菜（单人份）', reason: '一个人的火锅', tip: '凑单：加毛肚和鸭血，配米饭 ≈ 25元' },
    { dish: '卤肉饭·川味版', reason: '米饭杀手', tip: '凑单：加卤蛋和卤豆干 ≈ 20元' },
    { dish: '酸辣粉', reason: '酸辣过瘾，外卖经典', tip: '凑单：加肉夹馍 ≈ 18元' },
    { dish: '黄焖鸡米饭', reason: '汤汁浓郁，拌饭一绝', tip: '凑单：加一份青菜 ≈ 20元' },
    { dish: '肥肠粉+锅盔', reason: '成都经典搭配', tip: '凑单：肥肠粉+鲜肉锅盔+豆浆 ≈ 22元' },
    { dish: '冷锅串串', reason: '一个人也能撸串', tip: '凑单：荤素各8签 + 冰粉 ≈ 28元' },
    { dish: '豌杂面', reason: '豌豆软糯杂酱浓', tip: '凑单：加煎蛋 + 豆浆 ≈ 16元' },
  ],
  eatout: [
    { dish: '商场B1层·川味小碗菜', reason: '出餐快、价格亲民', tip: '推荐：回锅肉小碗 + 酸辣土豆丝 + 米饭 | 有吧台座' },
    { dish: '豆花饭店', reason: '最朴实的川渝一人食', tip: '推荐：豆花饭 + 烧白 | 翻台快不用等' },
    { dish: '街边面馆', reason: '一个人吃面最自在', tip: '推荐：素椒杂酱面 / 红油抄手 | 随便坐' },
    { dish: '冒菜馆', reason: '一人冒菜等于迷你火锅', tip: '推荐：自选冒菜 | 单人锅底不加价' },
    { dish: '串串香（非高峰）', reason: '下午2-5点不用排队', tip: '推荐：牛肉串+郡肝+土豆片 | 避开晚高峰' },
    { dish: '饺子馆·钟水饺', reason: '甜辣口一试难忘', tip: '推荐：钟水饺 + 赖汤圆 | 拼桌文化友好' },
    { dish: '跷脚牛肉', reason: '汤鲜肉嫩', tip: '推荐：小碗跷脚牛肉 + 血旺 | 一人一锅' },
    { dish: '烤鱼（小份）', reason: '单人小份比大份划算', tip: '推荐：麻辣烤鱼小份 + 米饭 | 提前问有无小份' },
  ],
};

// ---- 工具函数 ----
function getDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${WEEKDAYS[now.getDay()]}`;
}

function getApiDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${WEEKDAYS[now.getDay()]}`;
}

// ---- 主页面 ----
export default function Home() {
  // NextAuth session
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;

  // 偏好状态
  const [spicyLevel, setSpicyLevel] = React.useState(3);
  const [dislikes, setDislikes] = React.useState<string[]>([]);
  const [provider, setProvider] = React.useState<'deepseek' | 'openai'>('deepseek');
  const [apiKey, setApiKey] = React.useState('');
  const [city, setCity] = React.useState('成都');
  const [weatherDesc, setWeatherDesc] = React.useState('');
  const [ingredients, setIngredients] = React.useState<string[]>([]);
  const [history, setHistory] = React.useState<{ dish: string; date: number }[]>([]);
  const [mounted, setMounted] = React.useState(false);
  const shareRef = React.useRef<HTMLDivElement>(null);

  // 本地推荐状态
  const [localContent, setLocalContent] = React.useState('');
  const [localLoading, setLocalLoading] = React.useState(false);

  // 加载本地存储
  React.useEffect(() => {
    setMounted(true);
    try {
      const prefs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (prefs.spicyLevel) setSpicyLevel(prefs.spicyLevel);
      if (prefs.dislikes) setDislikes(prefs.dislikes);
      if (prefs.provider) setProvider(prefs.provider);
      if (prefs.apiKey) setApiKey(prefs.apiKey);
      if (prefs.city) setCity(prefs.city);
    } catch { /* ignore */ }

    try {
      const raw: { dish: string; date: number }[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const now = Date.now();
      const filtered = raw.filter((h) => now - h.date < HISTORY_TTL);
      setHistory(filtered);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    } catch { /* ignore */ }
  }, []);

  // 保存偏好
  const savePrefs = React.useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ spicyLevel, dislikes, provider, apiKey }));
  }, [spicyLevel, dislikes, provider, apiKey]);

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
    },
    onError: (err) => {
      console.error('AI completion error:', err);
    },
  });

  // ---- 本地推荐 ----
  const generateLocal = React.useCallback(() => {
    setLocalLoading(true);
    setLocalContent('');

    const pick = <T extends { dish: string }>(arr: T[]): T => {
      const filtered = arr.filter((d) => !blacklist.includes(d.dish));
      const pool = filtered.length > 0 ? filtered : arr;
      return pool[Math.floor(Math.random() * pool.length)];
    };

    setTimeout(() => {
      const cook = pick(DISH_DB.cook);
      const takeout = pick(DISH_DB.takeout);
      const eatout = pick(DISH_DB.eatout);

      const md = `## 👩‍🍳 今日做饭
- **推荐菜：**${cook.dish}
- **理由：**${cook.reason}
- **快手秘籍：**${cook.tip}
- **食材清单（单人份）：**${cook.ingredients}

## 🛵 今日外卖
- **推荐点：**${takeout.dish}
- **理由：**${takeout.reason}
- **凑单小贴士：**${takeout.tip}

## 🚶 出去吃
- **推荐餐厅类型：**${eatout.dish}
- **必点菜品：**${eatout.reason}
- **单人友好提示：**${eatout.tip}`;

      setLocalContent(md);
      addHistoryDish(cook.dish);
      addHistoryDish(takeout.dish);
      setLocalLoading(false);
    }, 600);
  }, [blacklist, addHistoryDish]);

  // ---- 生成入口 ----
  const generate = React.useCallback(() => {
    if (apiKey) {
      // AI 模式：通过 useCompletion 调用后端
      setLocalContent('');
      complete('请生成今日一人食川菜推荐。', {
        body: {
          date: getApiDateStr(),
          spicyLevel,
          dislikes,
          historyDishes: blacklist,
          provider,
          apiKey,
          userId,
          weather: weatherDesc || undefined,
          city,
          ingredients: ingredients.length > 0 ? ingredients : undefined,
        },
      });
    } else {
      // 本地模式
      generateLocal();
    }
  }, [apiKey, complete, spicyLevel, dislikes, blacklist, provider, generateLocal, userId, weatherDesc, city, ingredients]);

  // ---- 刷新 ----
  const refresh = React.useCallback(() => {
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
    setLocalContent('');
    // 稍后重新生成
    setTimeout(generate, 100);
  }, [aiLoading, stop, history, saveHistory, generate]);

  // ---- 设置保存 ----
  const handleSaveSettings = React.useCallback(
    (settings: { spicyLevel: number; dislikes: string[]; provider: 'deepseek' | 'openai'; apiKey: string; city: string }) => {
      setSpicyLevel(settings.spicyLevel);
      setDislikes(settings.dislikes);
      setProvider(settings.provider);
      setApiKey(settings.apiKey);
      setCity(settings.city);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(settings),
      );
    },
    [],
  );

  // ---- 清空历史 ----
  const clearHistory = React.useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, [saveHistory]);

  // ---- 当前展示内容 ----
  const displayContent = apiKey ? completion : localContent;
  const displayLoading = apiKey ? aiLoading : localLoading;
  const displayError = apiKey ? (aiError?.message || null) : null;

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
              provider={provider}
              apiKey={apiKey}
              city={city}
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
          <Badge variant="outline" className="text-xs">
            {apiKey ? `🤖 ${provider === 'deepseek' ? 'DeepSeek' : 'OpenAI'}` : '📦 本地模式'}
          </Badge>
        </div>

        {/* 拍冰箱识别食材 */}
        {apiKey && (
          <div className="mb-4">
            <PhotoRecognize
              apiKey={apiKey}
              onIngredientsReady={setIngredients}
            />
          </div>
        )}

        {/* 推荐内容（可截图区域） */}
        <div ref={shareRef}>
        <RecommendCard
          content={displayContent}
          isLoading={displayLoading}
          error={displayError}
          dateStr={getDateStr()}
        />

        </div>

        {/* 分享按钮 */}
        {displayContent && !displayLoading && (
          <div className="mt-3 flex justify-end">
            <ShareButton targetRef={shareRef as React.RefObject<HTMLElement>} dateStr={getDateStr()} />
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 mt-4">
          <Button
            onClick={generate}
            disabled={displayLoading}
            className="flex-1 h-12 text-base font-bold gradient-btn border-0 shadow-lg shadow-purple-500/20"
          >
            {displayLoading ? (
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
            size="icon"
            onClick={refresh}
            disabled={displayLoading}
            className="h-12 w-12 shrink-0"
            title="换一天"
          >
            <RefreshCw className={cn('h-5 w-5', displayLoading && 'animate-spin')} />
          </Button>
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

        {/* 快捷统计 */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Utensils className="h-5 w-5 mx-auto text-orange-500 mb-1" />
              <p className="text-xs text-muted-foreground">做饭</p>
              <p className="text-lg font-bold">{DISH_DB.cook.length}道</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Bike className="h-5 w-5 mx-auto text-blue-500 mb-1" />
              <p className="text-xs text-muted-foreground">外卖</p>
              <p className="text-lg font-bold">{DISH_DB.takeout.length}种</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MapPin className="h-5 w-5 mx-auto text-green-500 mb-1" />
              <p className="text-xs text-muted-foreground">出去吃</p>
              <p className="text-lg font-bold">{DISH_DB.eatout.length}处</p>
            </CardContent>
          </Card>
        </div>

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
    </div>
  );
}