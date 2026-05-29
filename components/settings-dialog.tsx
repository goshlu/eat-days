'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings, Download, Trash2, Loader2 } from 'lucide-react';

const SPICY_LABELS = ['微辣 🌶', '中辣 🌶🌶', '重辣 🌶🌶🌶', '爆辣 🔥🔥', '变态辣 💀🔥'];

const CITIES = ['成都', '重庆', '北京', '上海', '广州', '深圳', '杭州', '武汉', '西安', '南京', '长沙', '昆明', '贵阳', '厦门', '青岛'];

interface SettingsDialogProps {
  spicyLevel: number;
  dislikes: string[];
  provider: 'deepseek' | 'openai';
  apiKey: string;
  city?: string;
  userId?: string;
  onSave: (settings: {
    spicyLevel: number;
    dislikes: string[];
    provider: 'deepseek' | 'openai';
    apiKey: string;
    city: string;
  }) => void;
}

export function SettingsDialog({
  spicyLevel: initialSpicy,
  dislikes: initialDislikes,
  provider: initialProvider,
  apiKey: initialApiKey,
  city: initialCity,
  userId,
  onSave,
}: SettingsDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [spicyLevel, setSpicyLevel] = React.useState(initialSpicy);
  const [dislikeText, setDislikeText] = React.useState(initialDislikes.join('、'));
  const [provider, setProvider] = React.useState(initialProvider);
  const [apiKey, setApiKey] = React.useState(initialApiKey);
  const [city, setCity] = React.useState(initialCity || '成都');

  // 删除账户确认弹窗
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);

  // 导出状态
  const [exporting, setExporting] = React.useState(false);

  // 同步外部状态变化
  React.useEffect(() => {
    setSpicyLevel(initialSpicy);
    setDislikeText(initialDislikes.join('、'));
    setProvider(initialProvider);
    setApiKey(initialApiKey);
  }, [initialSpicy, initialDislikes, initialProvider, initialApiKey]);

  React.useEffect(() => {
    if (initialCity) setCity(initialCity);
  }, [initialCity]);

  const handleSave = () => {
    const dislikes = dislikeText
      .split(/[,，、]/)
      .map((s) => s.trim())
      .filter(Boolean);
    onSave({ spicyLevel, dislikes, provider, apiKey, city });
    setOpen(false);
  };

  // 导出数据
  const handleExport = async () => {
    if (!userId) {
      alert('请先登录后再导出数据');
      return;
    }

    setExporting(true);
    try {
      const res = await fetch(`/api/export-data?userId=${userId}`);
      if (!res.ok) throw new Error('导出失败');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sichuan-solo-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  // 删除账户
  const handleDeleteAccount = async () => {
    if (!userId) return;
    if (deleteConfirmText !== '删除我的账户') return;

    setDeleting(true);
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          confirm: 'DELETE_MY_ACCOUNT',
        }),
      });

      if (!res.ok) throw new Error('删除失败');

      // 删除成功，清除本地存储并跳转
      localStorage.clear();
      window.location.href = '/';
    } catch (err) {
      alert('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0">
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>⚙️ 偏好设置</DialogTitle>
            <DialogDescription>调整你的口味偏好和 AI 配置</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* 辣度滑块 */}
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
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>微辣</span>
                <span>变态辣</span>
              </div>
            </div>

            {/* 忌口 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">🚫 忌口食材</label>
              <Input
                placeholder="用逗号分隔，如：香菜, 内脏, 折耳根"
                value={dislikeText}
                onChange={(e) => setDislikeText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                AI 生成推荐时会自动避开这些食材
              </p>
            </div>

            {/* AI 服务商 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">🤖 AI 服务商</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={provider === 'deepseek' ? 'default' : 'outline'}
                  onClick={() => setProvider('deepseek')}
                  className="w-full"
                >
                  DeepSeek
                </Button>
                <Button
                  variant={provider === 'openai' ? 'default' : 'outline'}
                  onClick={() => setProvider('openai')}
                  className="w-full"
                >
                  OpenAI
                </Button>
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                🔑 API Key{' '}
                <span className="text-muted-foreground font-normal">（可选）</span>
              </label>
              <Input
                type="password"
                placeholder="留空则使用服务端环境变量"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                填入后将在浏览器端直接调用 AI API
              </p>
            </div>

            {/* 城市选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">📍 所在城市</label>
              <div className="flex flex-wrap gap-2">
                {CITIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCity(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      city === c
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                天气信息会影响 AI 推荐（雨天推荐热汤，晴天推荐凉菜）
              </p>
            </div>

            {/* 分割线 */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-3">📦 数据管理</h3>

              {/* 导出数据 */}
              <Button
                variant="outline"
                className="w-full mb-3"
                onClick={handleExport}
                disabled={exporting || !userId}
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    导出中…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    导出我的数据
                  </>
                )}
              </Button>

              {/* 删除账户 */}
              <Button
                variant="outline"
                className="w-full text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={!userId}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除账户
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存设置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除账户确认弹窗 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">⚠️ 删除账户</DialogTitle>
            <DialogDescription>
              此操作不可撤销，将永久删除以下数据：
            </DialogDescription>
          </DialogHeader>

          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 my-4">
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>• 所有推荐记录</li>
              <li>• 忌口黑名单</li>
              <li>• 评分反馈</li>
              <li>• 账户信息和偏好设置</li>
            </ul>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              请输入 <span className="font-bold text-destructive">删除我的账户</span> 确认：
            </label>
            <Input
              placeholder="删除我的账户"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="border-destructive/50"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteConfirmText('');
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== '删除我的账户' || deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  删除中…
                </>
              ) : (
                '确认删除'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
