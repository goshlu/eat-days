'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Users, Copy, Check, MapPin, Utensils } from 'lucide-react';

// ============================================================
// 聚餐房间详情页
// 显示成员列表、生成推荐、显示附近餐厅
// ============================================================

interface Member {
  id: string;
  nickname: string;
  spicyLevel: number;
  dislikes: string[];
  preferences?: string | null;
  isCreator: boolean;
}

interface GroupData {
  id: string;
  code: string;
  name: string;
  status: string;
  city?: string;
  aiResult?: {
    dishes: Array<{
      name: string;
      servings: number;
      spicyLevel: string;
      description: string;
      reason: string;
    }>;
    summary: string;
  };
  members: Member[];
}

export default function GroupRoomPage() {
  const params = useParams();
  const code = params.code as string;
  const router = useRouter();
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;

  const [group, setGroup] = React.useState<GroupData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // 加载房间信息
  React.useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await fetch(`/api/group?code=${code}`);
        const data = await res.json();

        if (data.success) {
          setGroup(data.group);
        } else {
          setError(data.error || '房间不存在');
        }
      } catch (err) {
        setError('加载房间信息失败');
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [code]);

  // 轮询房间状态
  React.useEffect(() => {
    if (!group || group.status === 'completed') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/group?code=${code}`);
        const data = await res.json();
        if (data.success) {
          setGroup(data.group);
        }
      } catch (err) {
        // 静默失败
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [group, code]);

  // 复制房间码
  const handleCopy = React.useCallback(() => {
    const url = `${window.location.origin}/group/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  // 生成推荐
  const handleGenerate = React.useCallback(async () => {
    if (!group) return;

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/group/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.id }),
      });

      const data = await res.json();

      if (data.success) {
        setGroup(prev => prev ? {
          ...prev,
          status: 'completed',
          aiResult: data.recommendation,
        } : null);
      } else {
        setError(data.error || '生成推荐失败');
      }
    } catch (err) {
      setError('生成推荐失败');
    } finally {
      setGenerating(false);
    }
  }, [group]);

  // 打开地图搜索
  const handleOpenMap = React.useCallback(() => {
    if (!group?.city) return;
    const dishNames = group.aiResult?.dishes.map(d => d.name).join(' ') || '川菜';
    window.open(`https://www.amap.com/search?query=${encodeURIComponent(dishNames + ' ' + group.city)}`, '_blank');
  }, [group]);

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 错误
  if (error && !group) {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <header className="gradient-header text-white pt-12 pb-8 px-5">
          <div className="relative z-10 max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/group')}
                className="h-8 w-8 text-white hover:bg-white/20 -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold tracking-wide">👥 聚餐房间</h1>
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 -mt-4 relative z-10 pb-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-sm mb-4">{error}</p>
              <Button variant="outline" onClick={() => router.push('/group')}>
                返回
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!group) return null;

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/group/${code}`;

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
              onClick={() => router.push('/group')}
              className="h-8 w-8 text-white hover:bg-white/20 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-wide">{group.name}</h1>
              <p className="text-white/70 text-xs">{group.city || '成都'}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 -mt-4 relative z-10 pb-8">
        {/* 房间码 */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">房间码</p>
                <p className="text-2xl font-bold tracking-widest">{group.code}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    复制链接
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              分享链接给朋友，加入房间
            </p>
          </CardContent>
        </Card>

        {/* 成员列表 */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              成员 ({group.members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {group.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                      {member.nickname[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.nickname}
                        {member.isCreator && (
                          <Badge variant="secondary" className="ml-1 text-[10px]">
                            创建者
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        辣度 {member.spicyLevel}/5
                        {member.dislikes.length > 0 && ` · 忌口：${member.dislikes.join('、')}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 推荐结果 */}
        {group.status === 'completed' && group.aiResult ? (
          <>
            {/* 搭配建议 */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <p className="text-sm text-gray-700">{group.aiResult.summary}</p>
              </CardContent>
            </Card>

            {/* 推荐菜品 */}
            <div className="space-y-3 mb-4">
              {group.aiResult.dishes.map((dish, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-orange-500" />
                        <h3 className="font-semibold">{dish.name}</h3>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {dish.servings}人份
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{dish.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          dish.spicyLevel === '重辣' ? 'bg-red-100 text-red-700' :
                          dish.spicyLevel === '中辣' ? 'bg-orange-100 text-orange-700' :
                          'bg-green-100 text-green-700'
                        }`}
                      >
                        {dish.spicyLevel}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{dish.reason}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 查找附近餐厅 */}
            <Button
              variant="outline"
              className="w-full mb-4"
              onClick={handleOpenMap}
            >
              <MapPin className="h-4 w-4 mr-2" />
              查找附近餐厅
            </Button>
          </>
        ) : (
          /* 等待中/生成中 */
          <Card className="mb-4">
            <CardContent className="p-6 text-center">
              {group.status === 'recommending' ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">AI 正在为您搭配菜品...</p>
                </>
              ) : (
                <>
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    等待成员加入，至少需要2人
                  </p>
                  <Button
                    onClick={handleGenerate}
                    disabled={group.members.length < 2 || generating}
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Utensils className="h-4 w-4 mr-2" />
                    )}
                    生成聚餐推荐
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {error && (
          <p className="text-sm text-destructive text-center mb-4">{error}</p>
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
