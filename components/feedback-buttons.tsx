'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// 推荐评分按钮组件
// 👍 / 👎 点击后调用 /api/feedback
// ============================================================

interface FeedbackButtonsProps {
  cookDish: string;
  takeoutDish: string;
  eatOutDish: string;
  userId?: string;
  spicyLevel?: number;
  dislikes?: string[];
  className?: string;
}

export function FeedbackButtons({
  cookDish,
  takeoutDish,
  eatOutDish,
  userId,
  spicyLevel = 3,
  dislikes = [],
  className,
}: FeedbackButtonsProps) {
  const [selected, setSelected] = React.useState<'up' | 'down' | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleFeedback = async (rating: 1 | -1, type: 'up' | 'down') => {
    if (selected || loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          rating,
          cookDish,
          takeoutDish,
          eatOutDish,
          spicyLevel,
          dislikes,
        }),
      });

      if (res.ok) {
        setSelected(type);
      }
    } catch (err) {
      console.error('Feedback error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (selected) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Check className="h-4 w-4 text-green-500" />
        <span className="text-xs text-muted-foreground">
          感谢反馈！
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-xs text-muted-foreground mr-1">今日推荐如何？</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleFeedback(1, 'up')}
        disabled={loading}
        className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
        title="推荐不错"
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleFeedback(-1, 'down')}
        disabled={loading}
        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
        title="不太喜欢"
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
