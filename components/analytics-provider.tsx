'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { initAnalytics, trackPageView } from '@/lib/analytics';

// ============================================================
// PostHog Analytics Provider
// 在应用根部初始化 PostHog 并追踪页面浏览
// ============================================================

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 初始化
  React.useEffect(() => {
    initAnalytics();
  }, []);

  // 页面浏览追踪
  React.useEffect(() => {
    if (pathname) {
      trackPageView(pathname);
    }
  }, [pathname]);

  return <>{children}</>;
}
