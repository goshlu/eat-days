'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Download, Mail, ThumbsUp, ThumbsDown, Utensils, Bike, MapPin } from 'lucide-react';
import { FlavorRadarChart } from '@/components/flavor-radar-chart';
import { FlavorProfile, calculateAverageFlavor, getFlavorProfile, FLAVOR_LABELS } from '@/lib/flavors';

// ============================================================
// 月度饮食报告页面
// 展示最近30天的推荐及评分，风味雷达图，PDF导出，邮件发送
// ============================================================

interface ReportData {
  recommendations: Array<{
    date: string;
    cook: { dish: string; reason?: string };
    takeout: { dish: string; reason?: string };
    eatOut: { dish: string; type?: string };
  }>;
  feedbacks: Array<{
    rating: number;
    cookDish: string;
    takeoutDish: string;
    createdAt: string;
  }>;
  statistics: {
    totalDays: number;
    totalDishes: number;
    positiveCount: number;
    negativeCount: number;
    topDishes: Array<{ name: string; count: number }>;
  };
  flavorProfile: FlavorProfile;
}

export default function ReportPage() {
  const { data: session, status } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const userName = (session?.user as { name?: string })?.name || '美食家';
  const userEmail = (session?.user as { email?: string })?.email;
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [reportData, setReportData] = React.useState<ReportData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // 邮件发送状态
  const [sendingEmail, setSendingEmail] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);
  const [emailInput, setEmailInput] = React.useState('');

  // 加载报告数据
  React.useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchReport = async () => {
      try {
        // 获取推荐记录
        const recRes = await fetch(`/api/history?userId=${userId}&days=30`);
        const recData = await recRes.json();

        // 获取反馈记录
        const fbRes = await fetch(`/api/feedback?days=30`);
        const fbData = await fbRes.json();

        const recommendations = recData.data || [];
        const feedbacks = fbData.success ? [] : []; // 简化处理

        // 收集所有菜品
        const allDishes: string[] = [];
        const dishCount: Record<string, number> = {};

        for (const rec of recommendations) {
          if (rec.cook?.dish) {
            allDishes.push(rec.cook.dish);
            dishCount[rec.cook.dish] = (dishCount[rec.cook.dish] || 0) + 1;
          }
          if (rec.takeout?.dish) {
            allDishes.push(rec.takeout.dish);
            dishCount[rec.takeout.dish] = (dishCount[rec.takeout.dish] || 0) + 1;
          }
        }

        // 计算风味雷达
        const flavorProfile = calculateAverageFlavor(allDishes);

        // 统计热门菜品
        const topDishes = Object.entries(dishCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setReportData({
          recommendations,
          feedbacks,
          statistics: {
            totalDays: recommendations.length,
            totalDishes: allDishes.length,
            positiveCount: fbData.summary?.positive || 0,
            negativeCount: fbData.summary?.negative || 0,
            topDishes,
          },
          flavorProfile,
        });
      } catch (err) {
        setError('加载报告失败');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [userId]);

  // 导出 PDF
  const handleExportPDF = React.useCallback(async () => {
    // 动态加载 html2pdf
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.getElementById('report-content');

    if (element) {
      const opt = {
        margin: 10,
        filename: `一人食月度报告-${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      html2pdf().set(opt).from(element).save();
    }
  }, []);

  // 发送邮件
  const handleSendEmail = React.useCallback(async () => {
    const email = emailInput || userEmail;
    if (!email) {
      alert('请输入邮箱地址');
      return;
    }

    setSendingEmail(true);

    try {
      // 生成邮件 HTML
      const emailHtml = `
        <h1>🍜 ${userName}的月度饮食报告</h1>
        <p>最近30天，您共享用了 ${reportData?.statistics.totalDays} 天的美食推荐。</p>
        <h2>📊 风味偏好</h2>
        <ul>
          ${Object.entries(FLAVOR_LABELS).map(([key, label]) =>
            `<li>${label}: ${reportData?.flavorProfile[key as keyof FlavorProfile] || 0}/10</li>`
          ).join('')}
        </ul>
        <h2>🏆 热门菜品</h2>
        <ul>
          ${reportData?.statistics.topDishes.map(d =>
            `<li>${d.name} (${d.count}次)</li>`
          ).join('') || '<li>暂无数据</li>'}
        </ul>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          由「一人食·川菜推荐官」生成
        </p>
      `;

      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `${userName}的月度饮食报告`,
          html: emailHtml,
          userName,
        }),
      });

      if (res.ok) {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
      } else {
        alert('发送失败，请重试');
      }
    } catch (err) {
      alert('发送失败，请重试');
    } finally {
      setSendingEmail(false);
    }
  }, [emailInput, userEmail, userName, reportData]);

  // 加载中
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 未登录
  if (!userId) {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <header className="gradient-header text-white pt-12 pb-8 px-5">
          <div className="relative z-10 max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/')}
                className="h-8 w-8 text-white hover:bg-white/20 -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold tracking-wide">📊 月度报告</h1>
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 -mt-4 relative z-10 pb-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-sm">请先登录查看报告</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/')}>
                返回首页
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="gradient-header text-white pt-12 pb-8 px-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
              className="h-8 w-8 text-white hover:bg-white/20 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-wide">📊 月度饮食报告</h1>
          </div>
          <p className="text-white/70 text-sm">最近30天的美食足迹</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 -mt-4 relative z-10 pb-8">
        <div id="report-content">
          {/* 概览卡片 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">推荐天数</p>
                <p className="text-2xl font-bold">{reportData?.statistics.totalDays || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">菜品总数</p>
                <p className="text-2xl font-bold">{reportData?.statistics.totalDishes || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <ThumbsUp className="h-3 w-3 text-green-500" /> 好评
                </p>
                <p className="text-2xl font-bold text-green-600">{reportData?.statistics.positiveCount || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <ThumbsDown className="h-3 w-3 text-red-500" /> 差评
                </p>
                <p className="text-2xl font-bold text-red-600">{reportData?.statistics.negativeCount || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* 风味雷达图 */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-center">🎯 您的风味偏好</CardTitle>
            </CardHeader>
            <CardContent>
              <FlavorRadarChart
                flavorProfile={reportData?.flavorProfile || { spicy: 0, numbing: 0, sour: 0, sweet: 0, salty: 0, savory: 0, fragrant: 0 }}
              />
            </CardContent>
          </Card>

          {/* 热门菜品 */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">🏆 热门菜品 Top 10</CardTitle>
            </CardHeader>
            <CardContent>
              {reportData?.statistics.topDishes && reportData.statistics.topDishes.length > 0 ? (
                <div className="space-y-2">
                  {reportData.statistics.topDishes.map((dish, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground w-5">{i + 1}</span>
                        <span className="text-sm">{dish.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {dish.count}次
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">暂无数据</p>
              )}
            </CardContent>
          </Card>

          {/* 最近推荐 */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">📅 最近推荐</CardTitle>
            </CardHeader>
            <CardContent>
              {reportData?.recommendations && reportData.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {reportData.recommendations.slice(0, 7).map((rec, i) => (
                    <div key={i} className="border-b pb-3 last:border-0 last:pb-0">
                      <p className="text-xs text-muted-foreground mb-2">
                        {new Date(rec.date).toLocaleDateString('zh-CN')}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {rec.cook?.dish && (
                          <Badge variant="outline" className="text-xs">
                            <Utensils className="h-3 w-3 mr-1 text-orange-500" />
                            {rec.cook.dish}
                          </Badge>
                        )}
                        {rec.takeout?.dish && (
                          <Badge variant="outline" className="text-xs">
                            <Bike className="h-3 w-3 mr-1 text-blue-500" />
                            {rec.takeout.dish}
                          </Badge>
                        )}
                        {rec.eatOut?.dish && (
                          <Badge variant="outline" className="text-xs">
                            <MapPin className="h-3 w-3 mr-1 text-green-500" />
                            {rec.eatOut.dish}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">暂无推荐记录</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 mb-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleExportPDF}
          >
            <Download className="h-4 w-4 mr-2" />
            导出 PDF
          </Button>
        </div>

        {/* 邮件发送 */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              发送到邮箱
            </h3>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder={userEmail || '输入邮箱地址'}
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSendEmail}
                disabled={sendingEmail}
              >
                {sendingEmail ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : emailSent ? (
                  '已发送 ✓'
                ) : (
                  '发送'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground py-6">
          <Button
            variant="link"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => router.push('/')}
          >
            ← 返回首页
          </Button>
        </footer>
      </main>
    </div>
  );
}
