// ============================================================
// Sentry 客户端配置（浏览器端）
// ============================================================

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 采样率：100% 捕获错误，20% 性能追踪
  tracesSampleRate: 0.2,

  // 环境标识
  environment: process.env.NODE_ENV,

  // 调试模式（开发时可开启）
  debug: false,

  // 发布版本（用于关联 source map）
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

  // 会话回放（可选，仅在需要时开启）
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // 集成配置
  integrations: [
    // 如需启用 Session Replay，取消注释：
    // Sentry.replayIntegration(),
  ],
});