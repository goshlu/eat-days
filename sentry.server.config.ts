// ============================================================
// Sentry 服务端配置（Node.js 端）
// ============================================================

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // 采样率：100% 捕获错误，10% 性能追踪
  tracesSampleRate: 0.1,

  // 环境标识
  environment: process.env.NODE_ENV,

  // 调试模式
  debug: false,

  // 发布版本
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

  // 服务端采样配置
  profilesSampleRate: 0.1,
});