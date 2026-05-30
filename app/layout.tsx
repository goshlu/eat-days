import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import AuthProvider from '@/components/auth-provider';
import { AnalyticsProvider } from '@/components/analytics-provider';
// @ts-ignore: CSS module declarations may be missing in this environment
import './globals.css';

export const metadata: Metadata = {
  title: '一人食·川菜推荐官',
  description: '专为独居青年打造的川味每日推荐 Agent，解决"每天吃什么"的终极难题',
  keywords: ['川菜', '一人食', '推荐', '外卖', '做饭', '美食'],
  authors: [{ name: 'SichuanSoloDiningAgent' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#667eea',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-[#f5f5f7] antialiased" suppressHydrationWarning>
        <AnalyticsProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AnalyticsProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
