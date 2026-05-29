'use client';

import * as React from 'react';
import Calendar from 'react-calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Utensils, Bike, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'react-calendar/dist/Calendar.css';

// ============================================================
// 月历组件 — 展示历史推荐摘要
// ============================================================

type CalendarValue = Date | null;

interface HistoryEntry {
  id: string;
  date: string;
  cook: { dish: string; reason?: string; quickTip?: string; ingredients?: string };
  takeout: { dish: string; reason?: string; tip?: string };
  eatOut: { type?: string; dish: string; tip?: string };
}

interface HistoryCalendarProps {
  entries: HistoryEntry[];
}

// 格式化日期为 YYYY-MM-DD
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function HistoryCalendar({ entries }: HistoryCalendarProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

  // 构建日期 -> 推荐记录的映射
  const entryMap = React.useMemo(() => {
    const map = new Map<string, HistoryEntry>();
    for (const entry of entries) {
      const key = new Date(entry.date).toISOString().slice(0, 10);
      map.set(key, entry);
    }
    return map;
  }, [entries]);

  // 选中日期的推荐
  const selectedEntry = React.useMemo(() => {
    if (!selectedDate) return null;
    const key = formatDateKey(selectedDate);
    return entryMap.get(key) || null;
  }, [selectedDate, entryMap]);

  // 自定义日期内容
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    const key = formatDateKey(date);
    const hasEntry = entryMap.has(key);

    if (!hasEntry) return null;

    return (
      <div className="flex justify-center mt-0.5">
        <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
      </div>
    );
  };

  // 自定义日期样式
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return '';
    const key = formatDateKey(date);
    const hasEntry = entryMap.has(key);
    const isSelected = selectedDate && formatDateKey(selectedDate) === key;
    const isToday = formatDateKey(new Date()) === key;

    return cn(
      'rounded-lg transition-colors text-sm',
      hasEntry && 'cursor-pointer hover:bg-purple-50',
      isSelected && 'bg-purple-100 font-bold',
      isToday && !isSelected && 'ring-1 ring-purple-300',
    );
  };

  return (
    <div className="space-y-4">
      {/* 日历卡片 */}
      <Card>
        <CardContent className="p-4">
          <div className="calendar-wrapper">
            <Calendar
              onChange={(value) => {
                if (value instanceof Date) {
                  setSelectedDate(value);
                }
              }}
              value={selectedDate}
              tileContent={tileContent}
              tileClassName={tileClassName}
              locale="zh-CN"
              maxDetail="month"
              minDetail="month"
              prevLabel={<ChevronLeft className="h-4 w-4" />}
              nextLabel={<ChevronRight className="h-4 w-4" />}
              formatShortWeekday={(_locale, date) => {
                const days = ['日', '一', '二', '三', '四', '五', '六'];
                return days[date.getDay()];
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            紫色圆点表示有推荐记录，点击日期查看详情
          </p>
        </CardContent>
      </Card>

      {/* 选中日期的详情 */}
      {selectedDate && (
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CardContent className="p-4">
            {selectedEntry ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">
                    {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 推荐摘要
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {new Set([selectedEntry.cook.dish, selectedEntry.takeout.dish, selectedEntry.eatOut.dish]).size} 道菜
                  </Badge>
                </div>

                <div className="space-y-3">
                  {/* 做饭 */}
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-orange-50">
                    <Utensils className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-orange-600 font-medium">做饭</p>
                      <p className="text-sm text-gray-800">{selectedEntry.cook.dish}</p>
                    </div>
                  </div>

                  {/* 外卖 */}
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-50">
                    <Bike className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-blue-600 font-medium">外卖</p>
                      <p className="text-sm text-gray-800">{selectedEntry.takeout.dish}</p>
                    </div>
                  </div>

                  {/* 出去吃 */}
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-green-50">
                    <MapPin className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-green-600 font-medium">出去吃</p>
                      <p className="text-sm text-gray-800">{selectedEntry.eatOut.dish}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm">
                  {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日暂无推荐记录
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
