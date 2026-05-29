'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, Loader2, X, ChefHat } from 'lucide-react';

interface RecognizeResult {
  ingredients: string[];
  summary: string;
  suggestions: string;
}

interface PhotoRecognizeProps {
  apiKey?: string;
  onIngredientsReady?: (ingredients: string[]) => void;
}

export function PhotoRecognize({ apiKey, onIngredientsReady }: PhotoRecognizeProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<RecognizeResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 限制文件大小 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过 10MB');
      return;
    }

    // 转为 base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPreview(base64);
      setResult(null);
      setError(null);

      // 调用识别 API
      setLoading(true);
      try {
        const res = await fetch('/api/recognize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, apiKey }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || '识别失败');
        }

        const data = await res.json();
        if (data.success && data.data) {
          setResult(data.data);
          if (data.data.ingredients.length > 0) {
            onIngredientsReady?.(data.data.ingredients);
          }
        } else {
          throw new Error(data.error || '识别失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '识别失败，请重试');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);

    // 清空 input 以便重复选择同一文件
    e.target.value = '';
  };

  const clear = () => {
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        {/* 无图片时显示上传区 */}
        {!preview && !loading && (
          <div
            className="flex flex-col items-center justify-center py-6 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">📸 拍冰箱</p>
            <p className="text-xs text-muted-foreground text-center">
              拍摄或上传冰箱/食材照片
              <br />
              AI 自动识别食材并推荐菜谱
            </p>
            <Button variant="outline" size="sm" className="mt-3">
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              选择图片
            </Button>
          </div>
        )}

        {/* 加载中 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-6">
            {preview && (
              <img
                src={preview}
                alt="预览"
                className="w-24 h-24 object-cover rounded-lg mb-3 opacity-60"
              />
            )}
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">AI 正在识别食材…</p>
          </div>
        )}

        {/* 识别结果 */}
        {result && preview && !loading && (
          <div>
            <div className="flex items-start gap-3 mb-3">
              <img
                src={preview}
                alt="食材照片"
                className="w-16 h-16 object-cover rounded-lg"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 mb-1">{result.summary}</p>
                <div className="flex flex-wrap gap-1">
                  {result.ingredients.map((ing) => (
                    <Badge key={ing} variant="secondary" className="text-xs">
                      {ing}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={clear}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {result.suggestions && (
              <div className="bg-orange-50 rounded-lg p-3 flex items-start gap-2">
                <ChefHat className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                <p className="text-xs text-orange-800">{result.suggestions}</p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-3.5 w-3.5 mr-1.5" />
              重新拍照
            </Button>
          </div>
        )}

        {/* 错误状态 */}
        {error && !loading && (
          <div className="text-center py-4">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={clear}>
              重试
            </Button>
          </div>
        )}

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
      </CardContent>
    </Card>
  );
}