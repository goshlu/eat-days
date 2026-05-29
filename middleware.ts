// ============================================================
// Next.js Middleware
// 为每个请求添加 requestId
// ============================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

export function middleware(request: NextRequest) {
  // 生成 requestId
  const requestId = request.headers.get('x-request-id') || randomUUID();

  // 克隆请求头并添加 requestId
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  // 创建响应并添加 requestId 到响应头
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('x-request-id', requestId);

  return response;
}

// 配置匹配路径
export const config = {
  matcher: [
    // 匹配所有 API 路由
    '/api/:path*',
  ],
};
