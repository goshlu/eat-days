'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Download, Copy, Check } from 'lucide-react';

interface ShareButtonProps {
  targetRef: React.RefObject<HTMLElement>;
  dateStr?: string;
}

export function ShareButton({ targetRef, dateStr }: ShareButtonProps) {
  const [status, setStatus] = React.useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [copied, setCopied] = React.useState(false);

  const generateImage = async (): Promise<Blob | null> => {
    if (!targetRef.current) return null;
    setStatus('generating');

    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: '#f5f5f7',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
      });
    } catch (err) {
      console.error('生成图片失败:', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
      return null;
    }
  };

  const handleShare = async () => {
    const blob = await generateImage();
    if (!blob) return;

    const fileName = `一人食推荐_${dateStr || '今日'}.png`;

    // 尝试 Web Share API（移动端优先）
    if (navigator.share && typeof navigator.canShare === 'function' && navigator.canShare()) {
      const file = new File([blob], fileName, { type: 'image/png' });
      try {
        await navigator.share({
          title: '一人食·川菜推荐官',
          text: `${dateStr || '今日'}的川菜推荐`,
          files: [file],
        });
        setStatus('done');
        setTimeout(() => setStatus('idle'), 2000);
        return;
      } catch (err) {
        // 用户取消或不支持文件分享，降级到下载
        if ((err as Error).name === 'AbortError') {
          setStatus('idle');
          return;
        }
      }
    }

    // 降级：下载图片
    handleDownload(blob);
  };

  const handleDownload = async (blob?: Blob) => {
    const imgBlob = blob || await generateImage();
    if (!imgBlob) return;

    const url = URL.createObjectURL(imgBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `一人食推荐_${dateStr || '今日'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatus('done');
    setTimeout(() => setStatus('idle'), 2000);
  };

  const handleCopyText = () => {
    if (!targetRef.current) return;
    const text = targetRef.current.innerText || '';
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (status === 'generating') {
    return (
      <Button variant="outline" size="sm" disabled className="text-xs">
        <Share2 className="h-3.5 w-3.5 mr-1.5 animate-pulse" />
        生成中…
      </Button>
    );
  }

  if (status === 'error') {
    return (
      <Button variant="outline" size="sm" disabled className="text-xs text-destructive">
        生成失败
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        className="text-xs"
      >
        {status === 'done' ? (
          <>
            <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" />
            已保存
          </>
        ) : (
          <>
            <Share2 className="h-3.5 w-3.5 mr-1.5" />
            📤 分享图片
          </>
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopyText}
        className="text-xs text-muted-foreground"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
            已复制
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5 mr-1" />
            复制文字
          </>
        )}
      </Button>
    </div>
  );
}