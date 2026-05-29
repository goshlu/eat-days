// ============================================================
// PostHog Analytics 工具
// 客户端埋点：推荐展示、忌口点击、设置更新
// ============================================================

import posthog from 'posthog-js';

// ---- 初始化 ----
export function initAnalytics() {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      capture_pageview: false, // 手动控制页面浏览
      capture_pageleave: false,
      persistence: 'localStorage',
    });
  }
}

// ---- 事件追踪 ----

// 推荐展示
export function trackRecommendationShown(data: {
  cook: string;
  takeout: string;
  eatOut: string;
  source: 'ai' | 'local' | 'cache' | 'random';
  spicyLevel: number;
  userId?: string;
}) {
  if (typeof window === 'undefined') return;
  posthog.capture('recommendation_shown', {
    cook_dish: data.cook,
    takeout_dish: data.takeout,
    eatout_dish: data.eatOut,
    source: data.source,
    spicy_level: data.spicyLevel,
    user_id: data.userId,
  });
}

// 忌口点击
export function trackDislikeClicked(data: {
  dishName: string;
  userId?: string;
}) {
  if (typeof window === 'undefined') return;
  posthog.capture('dislike_clicked', {
    dish_name: data.dishName,
    user_id: data.userId,
  });
}

// 设置更新
export function trackSettingsUpdated(data: {
  spicyLevel: number;
  dislikes: string[];
  provider: string;
  userId?: string;
}) {
  if (typeof window === 'undefined') return;
  posthog.capture('settings_updated', {
    spicy_level: data.spicyLevel,
    dislikes: data.dislikes,
    provider: data.provider,
    user_id: data.userId,
  });
}

// 页面浏览
export function trackPageView(pageName: string) {
  if (typeof window === 'undefined') return;
  posthog.capture('$pageview', { page: pageName });
}

// ---- 用户标识 ----
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  posthog.identify(userId, properties);
}

export function resetUser() {
  if (typeof window === 'undefined') return;
  posthog.reset();
}

// ---- 导出 posthog 实例（高级用法） ----
export { posthog };
