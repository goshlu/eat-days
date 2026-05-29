'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ThumbsDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackDislikeClicked } from '@/lib/analytics';

interface DislikeButtonProps {
  dishName: string;
  className?: string;
  onDisliked?: (dishName: string) => void;
}

export function DislikeButton({ dishName, className, onDisliked }: DislikeButtonProps) {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status === 'done' || status === 'loading') return;

    setStatus('loading');
    // 埋点
    trackDislikeClicked({ dishName, userId });

    try {
      const res = await fetch('/api/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishName, userId }),
      });

      if (!res.ok) throw new Error('操作失败');

      setStatus('done');
      onDisliked?.(dishName);

      // 同时保存到 localStorage 黑名单
      try {
        const localBlacklist: string[] = JSON.parse(localStorage.getItem('sichuan_blacklist') || '[]');
        if (!localBlacklist.includes(dishName)) {
          localBlacklist.push(dishName);
          localStorage.setItem('sichuan_blacklist', JSON.stringify(localBlacklist));
        }
      } catch { /* ignore */ }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  if (status === 'done') {
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}>
        <Check className="h-3 w-3 text-green-500" />
        已避雷
      </span>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={status === 'loading'}
      className={cn(
        'h-6 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1',
        status === 'loading' && 'animate-pulse',
        className,
      )}
      title={`不再推荐「${dishName}」`}
    >
      <ThumbsDown className="h-3 w-3" />
      {status === 'loading' ? '处理中…' : '不再推荐'}
    </Button>
  );
}