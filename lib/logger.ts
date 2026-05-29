// ============================================================
// Pino Logger 配置
// JSON 格式，支持 requestId 追踪
// ============================================================

import pino from 'pino';

// 创建基础 logger 实例
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // 生产环境使用 JSON 格式，开发环境使用 pretty 格式
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  // 添加基础字段
  base: {
    env: process.env.NODE_ENV,
    service: 'sichuan-food-agent',
  },
  // 时间戳格式
  timestamp: pino.stdTimeFunctions.isoTime,
});

// 创建带 requestId 的子 logger
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}

// 导出基础 logger
export { logger };

// 便捷方法
export default logger;
