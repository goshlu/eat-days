const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用 React Strict Mode
  reactStrictMode: true,

  // 实验性功能
  experimental: {
    // 启用 Server Actions
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },

  // 环境变量（客户端可访问）
  env: {
    NEXT_PUBLIC_APP_NAME: '一人食·川菜推荐官',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },

  // 图片域名白名单（如有需要）
  images: {
    remotePatterns: [],
  },

  // 输出模式：standalone 适合 Docker 部署
  // output: 'standalone',
};

// Sentry 配置
const sentryWebpackPluginOptions = {
  // 仅在 SENTRY_AUTH_TOKEN 存在时上传 source map
  silent: true,
  // 组织和项目（从环境变量读取）
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // 自动上传 source map
  widenClientFileUpload: true,
  // 隐藏源码中的 Sentry 代码
  hideSourceMaps: true,
  // 禁用 Sentry Webpack 插件的日志
  disableLogger: true,
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
