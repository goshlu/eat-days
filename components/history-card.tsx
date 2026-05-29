'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Utensils, Bike, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoryEntry {
  id: string;
  date: string;
  cook: {
    dish: string;
    reason: string;
    quickTip: string;
    ingredients: string;
  };
  takeout: {
    dish: string;
    reason: string;
    tip: string;
  };
  eatOut: {
    type: string;
    dish: string;
    tip: string;
  };
}

interface HistoryCardProps {
  entry: HistoryEntry;
  defaultOpen?: boolean;
}

export function HistoryCard({ entry, defaultOpen = false }: HistoryCardProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  const dateObj = new Date(entry.date);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const dateStr = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日 星期${weekdays[dateObj.getDay()]}`;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader
        className="cursor-pointer py-4 px-5"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🗓</div>
            <div>
              <CardTitle className="text-sm font-bold">{dateStr}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                🍽 {entry.cook.dish} · 🛵 {entry.takeout.dish}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            {open ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="px-5 pb-5 pt-0 space-y-4">
          {/* 做饭 */}
          <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Utensils className="h-4 w-4 text-orange-500" />
              <h4 className="font-semibold text-sm text-orange-800">今日做饭</h4>
              <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-700 hover:bg-orange-100">
                ≤30分钟
              </Badge>
            </div>
            <div className="font-bold text-orange-800 text-base">🍽 {entry.cook.dish}</div>
            <div className="text-sm text-gray-600">{entry.cook.reason}</div>
            {entry.cook.quickTip && (
              <div className="text-sm text-orange-700 font-medium">💡 {entry.cook.quickTip}</div>
            )}
            {entry.cook.ingredients && (
              <div className="text-xs text-gray-500 bg-white/60 rounded-lg px-3 py-2">
                🛒 {entry.cook.ingredients}
              </div>
            )}
          </div>

          {/* 外卖 */}
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Bike className="h-4 w-4 text-blue-500" />
              <h4 className="font-semibold text-sm text-blue-800">今日外卖</h4>
              <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100">
                单人餐
              </Badge>
            </div>
            <div className="font-bold text-blue-800 text-base">🍜 {entry.takeout.dish}</div>
            <div className="text-sm text-gray-600">{entry.takeout.reason}</div>
            {entry.takeout.tip && (
              <div className="text-sm text-blue-700 font-medium">💰 {entry.takeout.tip}</div>
            )}
          </div>

          {/* 出去吃 */}
          <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-green-500" />
              <h4 className="font-semibold text-sm text-green-800">出去吃</h4>
              <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100">
                单人友好
              </Badge>
            </div>
            <div className="font-bold text-green-800 text-sm">🏪 {entry.eatOut.type}</div>
            <div className="text-sm text-gray-600">{entry.eatOut.dish}</div>
            {entry.eatOut.tip && (
              <div className="text-sm text-green-700 font-medium">📍 {entry.eatOut.tip}</div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}