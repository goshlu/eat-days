'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Utensils, Bike, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DislikeButton } from '@/components/dislike-button';
import { RecommendSkeleton } from '@/components/recommend-skeleton';

interface RecommendCardProps {
  content: string;
  isLoading: boolean;
  error: string | null;
  dateStr: string;
  onDisliked?: (dishName: string) => void;
}

// 根据标题 emoji 选择配色
function getSectionStyle(title: string) {
  if (title.includes('做饭') || title.includes('👩‍🍳')) {
    return {
      border: 'border-l-orange-500',
      bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
      badge: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
      icon: <Utensils className="h-4 w-4" />,
      label: '≤30分钟',
    };
  }
  if (title.includes('外卖') || title.includes('🛵')) {
    return {
      border: 'border-l-blue-500',
      bg: 'bg-gradient-to-br from-blue-50 to-sky-50',
      badge: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
      icon: <Bike className="h-4 w-4" />,
      label: '单人餐',
    };
  }
  if (title.includes('出去吃') || title.includes('🚶')) {
    return {
      border: 'border-l-green-500',
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
      badge: 'bg-green-100 text-green-700 hover:bg-green-100',
      icon: <MapPin className="h-4 w-4" />,
      label: '单人友好',
    };
  }
  return null;
}

// 自定义 Markdown 渲染
function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        h2: ({ children, ...props }) => {
          const title = String(children);
          const style = getSectionStyle(title);
          if (style) {
            return (
              <div className="mb-4 mt-6 first:mt-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{title.split(' ')[0]}</span>
                  <h3 className="font-semibold text-gray-800 text-sm">
                    {title.replace(/^[^\s]+\s*/, '')}
                  </h3>
                  <Badge variant="secondary" className={cn('text-[10px] px-2', style.badge)}>
                    {style.icon}
                    <span className="ml-1">{style.label}</span>
                  </Badge>
                </div>
              </div>
            );
          }
          return <h2 {...props}>{children}</h2>;
        },
        ul: ({ children, ...props }) => {
          // 找到最近的 h2 来确定配色
          return (
            <div className="space-y-1.5 pl-1">
              <ul className="list-none space-y-1.5" {...props}>
                {children}
              </ul>
            </div>
          );
        },
        li: ({ children, ...props }) => {
          return (
            <li className="text-sm leading-relaxed" {...props}>
              {children}
            </li>
          );
        },
        strong: ({ children, ...props }) => {
          return (
            <strong className="text-gray-800 font-semibold" {...props}>
              {children}
            </strong>
          );
        },
        p: ({ children, ...props }) => {
          return (
            <p className="text-sm text-gray-600 leading-relaxed" {...props}>
              {children}
            </p>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function extractDishFromSection(section: string): string | null {
  // 匹配 **推荐菜：**xxx 或 **推荐点：**xxx
  const match = section.match(/\*\*推荐菜[：:]\*\*\s*(.+)/);
  if (match?.[1]) return match[1].trim();
  const match2 = section.match(/\*\*推荐点[：:]\*\*\s*(.+)/);
  if (match2?.[1]) return match2[1].trim();
  return null;
}

export function RecommendCard({ content, isLoading, error, dateStr, onDisliked }: RecommendCardProps) {
  // 空状态
  if (!isLoading && !content && !error) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-5xl mb-4">🍜</div>
          <p className="text-muted-foreground text-sm text-center">
            点击下方按钮，获取今日专属推荐
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            川菜为主，覆盖做饭 / 外卖 / 出去吃三种场景
          </p>
        </CardContent>
      </Card>
    );
  }

  // 加载状态 - 骨架屏
  if (isLoading && !content) {
    return <RecommendSkeleton />;
  }

  // 错误状态
  if (error && !content) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-4xl mb-4">😥</div>
          <p className="text-destructive text-sm font-medium mb-1">推荐生成失败</p>
          <p className="text-muted-foreground text-xs text-center max-w-xs">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // 结果展示（支持流式更新）
  // 解析 Markdown 内容，按 ## 分割板块
  const sections = content.split(/(?=## )/).filter(Boolean);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 日期头 */}
      <Card className="overflow-hidden gradient-header border-0">
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-white text-base font-bold flex items-center gap-2">
            <span>🗓</span>
            <span>{dateStr} 推荐</span>
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin ml-auto" />
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* 推荐内容 */}
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          {sections.length > 1 ? (
            // 完整渲染：按板块分组
            <div className="space-y-0">
              {sections.map((section, i) => {
                const lines = section.trim().split('\n');
                const titleLine = lines[0] || '';
                const bodyContent = lines.slice(1).join('\n').trim();
                const style = getSectionStyle(titleLine);

                return (
                  <div
                    key={i}
                    className={cn(
                      'rounded-xl p-4 mb-4 last:mb-0',
                      'animate-in fade-in slide-in-from-bottom-2 duration-300',
                      style?.bg || 'bg-gray-50',
                    )}
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <MarkdownContent content={section} />
                    {extractDishFromSection(section) && (
                      <div className="mt-2 pt-2 border-t border-gray-200/50 flex justify-end">
                        <DislikeButton
                          dishName={extractDishFromSection(section)!}
                          onDisliked={onDisliked}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // 流式渲染：内容还没分出板块时整体显示
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="prose prose-sm max-w-none">
                <MarkdownContent content={content} />
              </div>
              {isLoading && (
                <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5 mt-1" />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}