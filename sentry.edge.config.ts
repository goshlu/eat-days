// ============================================================
// Sentry Edge Runtime 配置
// ============================================================

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Edge 环境采样率较低
  tracesSampleRate: 0.1,

  // 环境标识
  environment: process.env.NODE_ENV,

  // 调试模式
  debug: false,

  // 发布版本
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
});