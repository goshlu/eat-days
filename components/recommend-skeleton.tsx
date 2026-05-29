'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================================
// 推荐卡片骨架屏
// 匹配做饭 / 外卖 / 出去吃三个板块的布局
// ============================================================

// 单行骨架条
function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-3.5 rounded-md bg-gray-200/80 animate-pulse',
        className,
      )}
    />
  );
}

// 小标签骨架
function SkeletonBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-5 w-16 rounded-full bg-gray-200/80 animate-pulse',
        className,
      )}
    />
  );
}

// 单个推荐板块骨架
function SectionSkeleton({
  variant,
}: {
  variant: 'cook' | 'takeout' | 'eatout';
}) {
  const styles = {
    cook: {
      bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
      iconBg: 'bg-orange-100',
    },
    takeout: {
      bg: 'bg-gradient-to-br from-blue-50 to-sky-50',
      iconBg: 'bg-blue-100',
    },
    eatout: {
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
      iconBg: 'bg-green-100',
    },
  };

  const style = styles[variant];

  return (
    <div className={cn('rounded-xl p-4 mb-4 last:mb-0', style.bg)}>
      {/* 标题行 */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('h-6 w-6 rounded-lg animate-pulse', style.iconBg)} />
        <SkeletonLine className="w-20" />
        <SkeletonBadge />
      </div>

      {/* 内容行 */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <SkeletonLine className="w-14 shrink-0" />
          <SkeletonLine className="w-3/4" />
        </div>
        <div className="flex items-start gap-2">
          <SkeletonLine className="w-14 shrink-0" />
          <SkeletonLine className="w-5/6" />
        </div>
        <div className="flex items-start gap-2">
          <SkeletonLine className="w-14 shrink-0" />
          <SkeletonLine className="w-2/3" />
        </div>
        <div className="flex items-start gap-2">
          <SkeletonLine className="w-14 shrink-0" />
          <SkeletonLine className="w-4/5" />
        </div>
      </div>
    </div>
  );
}

// 日期头骨架
function DateHeaderSkeleton() {
  return (
    <Card className="overflow-hidden gradient-header border-0">
      <CardHeader className="py-3 px-5">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-white/30 animate-pulse" />
          <div className="h-4 w-48 rounded-md bg-white/30 animate-pulse" />
        </div>
      </CardHeader>
    </Card>
  );
}

// 完整骨架屏组件
export function RecommendSkeleton() {
  return (
    <div className="space-y-4">
      <DateHeaderSkeleton />
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <SectionSkeleton variant="cook" />
          <SectionSkeleton variant="takeout" />
          <SectionSkeleton variant="eatout" />
        </CardContent>
      </Card>
    </div>
  );
}

export default RecommendSkeleton;
