'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Users, Plus, LogIn } from 'lucide-react';

// ============================================================
// 聚餐房间首页
// 创建房间或加入房间
// ============================================================

const SPICY_LABELS = ['微辣 🌶', '中辣 🌶🌶', '重辣 🌶🌶🌶', '爆辣 🔥🔥', '变态辣 💀🔥'];

export default function GroupPage() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const userName = (session?.user as { name?: string })?.name || '';
  const router = useRouter();

  // 创建房间表单
  const [groupName, setGroupName] = React.useState('');
  const [nickname, setNickname] = React.useState(userName);
  const [spicyLevel, setSpicyLevel] = React.useState(3);
  const [dislikesText, setDislikesText] = React.useState('');
  const [city, setCity] = React.useState('成都');

  // 加入房间表单
  const [joinCode, setJoinCode] = React.useState('');
  const [joinNickname, setJoinNickname] = React.useState(userName);
  const [joinSpicyLevel, setJoinSpicyLevel] = React.useState(3);
  const [joinDislikesText, setJoinDislikesText] = React.useState('');

  // 状态
  const [creating, setCreating] = React.useState(false);
  const [joining, setJoining] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<'select' | 'create' | 'join'>('select');

  // 创建房间
  const handleCreate = async () => {
    if (!groupName || !nickname) {
      setError('请填写房间名和昵称');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const dislikes = dislikesText.split(/[,，、]/).map(s => s.trim()).filter(Boolean);

      const res = await fetch('/api/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName,
          userId,
          nickname,
          spicyLevel,
          dislikes,
          city,
        }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/group/${data.group.code}`);
      } else {
        setError(data.error || '创建失败');
      }
    } catch (err) {
      setError('创建房间失败');
    } finally {
      setCreating(false);
    }
  };

  // 加入房间
  const handleJoin = async () => {
    if (!joinCode || !joinNickname) {
      setError('请填写房间码和昵称');
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const dislikes = joinDislikesText.split(/[,，、]/).map(s => s.trim()).filter(Boolean);

      const res = await fetch('/api/group/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: joinCode,
          userId,
          nickname: joinNickname,
          spicyLevel: joinSpicyLevel,
          dislikes,
        }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/group/${joinCode.toUpperCase()}`);
      } else {
        setError(data.error || '加入失败');
      }
    } catch (err) {
      setError('加入房间失败');
    } finally {
      setJoining(false);
    }
  };

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
            <h1 className="text-2xl font-bold tracking-wide">👥 聚餐推荐</h1>
          </div>
          <p className="text-white/70 text-sm">多人聚餐，智能推荐</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 -mt-4 relative z-10 pb-8">
        {/* 模式选择 */}
        {mode === 'select' && (
          <div className="space-y-4">
            <Card
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => setMode('create')}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">创建房间</h3>
                  <p className="text-sm text-muted-foreground">发起聚餐，邀请朋友加入</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => setMode('join')}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <LogIn className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">加入房间</h3>
                  <p className="text-sm text-muted-foreground">输入房间码，加入朋友的聚餐</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 创建房间 */}
        {mode === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                创建聚餐房间
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">房间名称</label>
                <Input
                  placeholder="如：周五聚餐、生日派对"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">你的昵称</label>
                <Input
                  placeholder="其他成员会看到这个昵称"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">所在城市</label>
                <Input
                  placeholder="成都"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">🌶️ 辣度偏好</label>
                  <span className="text-sm text-muted-foreground">
                    {SPICY_LABELS[spicyLevel - 1]}
                  </span>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[spicyLevel]}
                  onValueChange={([v]) => setSpicyLevel(v)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">🚫 忌口食材</label>
                <Input
                  placeholder="用逗号分隔，如：香菜, 内脏"
                  value={dislikesText}
                  onChange={(e) => setDislikesText(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setMode('select');
                    setError(null);
                  }}
                >
                  返回
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={creating}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    '创建房间'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 加入房间 */}
        {mode === 'join' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                加入聚餐房间
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">房间码</label>
                <Input
                  placeholder="输入6位房间码"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">你的昵称</label>
                <Input
                  placeholder="其他成员会看到这个昵称"
                  value={joinNickname}
                  onChange={(e) => setJoinNickname(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">🌶️ 辣度偏好</label>
                  <span className="text-sm text-muted-foreground">
                    {SPICY_LABELS[joinSpicyLevel - 1]}
                  </span>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[joinSpicyLevel]}
                  onValueChange={([v]) => setJoinSpicyLevel(v)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">🚫 忌口食材</label>
                <Input
                  placeholder="用逗号分隔，如：香菜, 内脏"
                  value={joinDislikesText}
                  onChange={(e) => setJoinDislikesText(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setMode('select');
                    setError(null);
                  }}
                >
                  返回
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleJoin}
                  disabled={joining}
                >
                  {joining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    '加入房间'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
