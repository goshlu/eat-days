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
import { Settings } from 'lucide-react';

const SPICY_LABELS = ['微辣 🌶', '中辣 🌶🌶', '重辣 🌶🌶🌶', '爆辣 🔥🔥', '变态辣 💀🔥'];

const CITIES = ['成都', '重庆', '北京', '上海', '广州', '深圳', '杭州', '武汉', '西安', '南京', '长沙', '昆明', '贵阳', '厦门', '青岛'];

interface SettingsDialogProps {
  spicyLevel: number;
  dislikes: string[];
  provider: 'deepseek' | 'openai';
  apiKey: string;
  city?: string;
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
  onSave,
}: SettingsDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [spicyLevel, setSpicyLevel] = React.useState(initialSpicy);
  const [dislikeText, setDislikeText] = React.useState(initialDislikes.join('、'));
  const [provider, setProvider] = React.useState(initialProvider);
  const [apiKey, setApiKey] = React.useState(initialApiKey);
  const [city, setCity] = React.useState(initialCity || '成都');

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存设置</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}