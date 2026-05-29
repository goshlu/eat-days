# 🚀 部署指南

## 一、Vercel 部署（推荐）

### 1. 前置准备

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login
```

### 2. 配置环境变量

在 Vercel 项目设置中添加以下环境变量（Settings → Environment Variables）：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 连接地址，如 Neon: `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require` |
| `DEEPSEEK_API_KEY` | ✅ | DeepSeek API Key（推荐，性价比高） |
| `OPENAI_API_KEY` | 可选 | OpenAI API Key（备选） |
| `UPSTASH_REDIS_REST_URL` | 可选 | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | 可选 | Upstash Redis REST Token |
| `SENTRY_DSN` | 可选 | Sentry 错误追踪 DSN |
| `SENTRY_ORG` | 可选 | Sentry 组织名 |
| `SENTRY_PROJECT` | 可选 | Sentry 项目名 |
| `SENTRY_AUTH_TOKEN` | 可选 | Sentry 认证令牌（用于 source map 上传） |
| `NEXT_PUBLIC_SENTRY_DSN` | 可选 | 客户端 Sentry DSN |

### 3. 部署

```bash
# 方式一：CLI 部署
vercel --prod

# 方式二：Git 推送自动部署（推荐）
git add .
git commit -m "feat: ready for deployment"
git push origin main
# Vercel 会自动触发部署
```

### 4. 初始化数据库

部署完成后，需要初始化 PostgreSQL 数据库表结构：

```bash
# 方式一：本地执行（需要 DATABASE_URL）
npx prisma migrate deploy

# 方式二：Vercel 部署后通过 CLI 执行
vercel env pull .env.production.local  # 拉取生产环境变量
npx prisma migrate deploy --schema=./schema.prisma
```

**使用 Neon（推荐的 Serverless PostgreSQL）：**

1. 访问 [neon.tech](https://neon.tech) 创建免费数据库
2. 复制连接字符串，设置为 `DATABASE_URL`
3. 执行 `npx prisma migrate deploy` 创建表结构

### 5. 验证部署

```bash
# 访问生产地址
open https://your-project.vercel.app

# 测试 API
curl -X POST https://your-project.vercel.app/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"date":"2026年5月28日 星期四","spicyLevel":3,"dislikes":[],"historyDishes":[]}'
```

---

## 二、本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入实际值

# 3. 初始化数据库（需要 PostgreSQL）
npx prisma migrate dev --name init

# 4. 启动开发服务器
pnpm dev

# 5. 访问 http://localhost:3000
```

---

## 三、Docker 本地数据库（可选）

如果不想使用云数据库，可以用 Docker 运行本地 PostgreSQL：

```bash
# 启动 PostgreSQL
docker run -d \
  --name sichuan-food-db \
  -e POSTGRES_USER=sichuan \
  -e POSTGRES_PASSWORD=food123 \
  -e POSTGRES_DB=sichuan_food_agent \
  -p 5432:5432 \
  postgres:16-alpine

# .env.local 中设置
DATABASE_URL=postgresql://sichuan:food123@localhost:5432/sichuan_food_agent

# 执行迁移
npx prisma migrate dev --name init
```

---

## 四、架构总览

```
┌─────────────────────────────────────────────┐
│                  Vercel                      │
│  ┌─────────────────────────────────────┐    │
│  │  Next.js 14 (App Router)            │    │
│  │  ├─ app/page.tsx (客户端)            │    │
│  │  ├─ app/api/recommend/route.ts      │    │
│  │  ├─ app/api/cleanup/route.ts        │    │
│  │  └─ instrumentation.ts (Sentry)     │    │
│  └──────────────┬──────────────────────┘    │
│                 │                            │
│  ┌──────────────▼──────────────────────┐    │
│  │  Edge / Serverless Functions        │    │
│  │  ├─ Vercel AI SDK (流式生成)         │    │
│  │  ├─ Prisma (ORM)                    │    │
│  │  └─ Upstash Redis (缓存)            │    │
│  └──────────────┬──────────────────────┘    │
└─────────────────┼───────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
┌────────┐  ┌──────────┐  ┌──────────┐
│ Neon   │  │ Upstash  │  │ DeepSeek │
│ PG DB  │  │ Redis    │  │ / OpenAI │
└────────┘  └──────────┘  └──────────┘
```

---

## 五、环境变量速查

```bash
# 必填
DATABASE_URL=postgresql://...
DEEPSEEK_API_KEY=sk-...

# 可选
OPENAI_API_KEY=sk-...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
SENTRY_DSN=https://...
SENTRY_ORG=...
SENTRY_PROJECT=...
SENTRY_AUTH_TOKEN=sntrys_...
NEXT_PUBLIC_SENTRY_DSN=https://...