// ============================================================
// Sentry 客户端 Instrumentation（Next.js 14+）
// ============================================================

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 采样率
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // 环境
  environment: process.env.NODE_ENV,
  debug: false,

  // 发布版本
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

  integrations: [],
});

// 导航追踪钩子
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
