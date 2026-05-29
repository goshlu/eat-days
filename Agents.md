一人食·川菜推荐官 — Codex Agents.md
一份可执行的 AI Agent 规范 + 全栈技术实现文档
版本：1.0.0 | 最后更新：2026-05-28

📖 项目介绍
项目定位
「一人食·川菜推荐官」是一个以川菜为主、覆盖做饭/外卖/外出三种场景的每日饮食推荐 Agent。它专为独居、一人食用户设计，解决“每天吃什么”的核心痛点，保证每日推荐不重复、辣度可调、忌口可避，且每个选项均贴合单人实际消费场景（分量控制、起送价、单人桌友好度）。

核心价值
每日不重复：基于历史黑名单 + AI 生成，菜品至少一周内不重样。

场景全覆盖：同一日同时给出「自己做」「点外卖」「出去吃」三条建议，用户可任意选择。

川菜为主轴：菜系以经典川菜、江湖菜、新派川菜为主，适时融入云贵湘风味，但不偏离麻辣鲜香核心。

一人食优化：做饭菜品主料≤3种、成本≤20元；外卖优先推荐有单人餐的店铺；外出就餐推荐小份菜或拼桌友好的餐厅。

目标用户
独居青年、大学生、初入职场的单身人士

对川菜有兴趣，但不知道每天吃什么的人群

希望兼顾做饭、外卖、外出三种选择的忙碌用户

🤖 Agent 定义（Codex 规范）
Agent 名称
SichuanSoloDiningAgent

角色 Prompt（系统指令）
text
你是一位精通川菜美食、深谙一人食场景的AI推荐官。  
你的使命是帮助用户解决“每天吃什么”的终极难题，每日生成一份独一无二的饮食方案，兼顾做饭、外卖、外出三种场景，且以川菜为核心风味。
输入变量
变量名	类型	说明
date	string	当前日期（自动获取，用于输出标题）
spicy_level	int (1-5)	用户辣度偏好，1=微辣，5=变态辣
dislikes	array[string]	忌口清单，如 ["香菜","内脏"]
history_dishes	array[string]	最近 7 天推荐过的菜品名称（黑名单）
weather	string (可选)	天气描述，用于推荐热/凉菜
输出格式（严格 Markdown）
markdown
## 🗓 YYYY年MM月DD日 星期X 推荐

### 👩‍🍳 今日做饭
- 推荐菜：xxx
- 理由：xxx
- 快手秘籍：xxx
- 食材清单（单人份）：xxx

### 🛵 今日外卖
- 推荐点：xxx
- 理由：xxx
- 凑单小贴士：xxx

### 🚶 出去吃
- 推荐餐厅类型：xxx
- 必点菜品：xxx
- 单人友好提示：xxx
行为约束
❌ 不推荐需要复杂刀工或稀缺调料的菜品（如开水白菜）

❌ 外卖不推荐必须现场吃才好吃的菜（如锅巴肉片、炸酥肉）

❌ 外出就餐不推荐需要排队 1 小时以上的网红店

✅ 做饭菜品操作时间应 ≤ 30 分钟（新手友好）

✅ 若用户忌口清单非空，生成时必须避开相关食材

示例输出
参见上方示例（已在 agents.md 中给出）

🛠 技术方案（全栈主流实现）
技术选型总览
层级	技术	用途
前端框架	Next.js 14 (App Router)	全栈一体化、SSR/ISR、API Routes
语言	TypeScript	类型安全
样式	Tailwind CSS + shadcn/ui	原子化 CSS，快速构建 H5 移动界面
AI 交互	Vercel AI SDK	流式文本生成，支持 LLM 函数调用
LLM 服务	DeepSeek API / OpenAI GPT-4o-mini	生成每日推荐内容
数据库	PostgreSQL + Prisma	用户偏好、历史推荐、菜品库持久化
缓存	Upstash Redis	缓存当日推荐结果，降低 API 调用成本
部署	Vercel	边缘函数、自动 CI/CD、高并发友好
监控	Sentry + Vercel Analytics	错误追踪与性能分析
核心实现路径
1. 数据模型（Prisma Schema）
prisma
model User {
  id         String   @id @default(cuid())
  createdAt  DateTime @default(now())
  spicyLevel Int
  dislikes   String[] // 存储忌口数组
  history    Recommendation[]
}

model Recommendation {
  id         String   @id @default(cuid())
  date       DateTime @unique
  userId     String
  cook       Json     // {dish, reason, quickTip, ingredients}
  takeout    Json
  eatOut     Json
  createdAt  DateTime @default(now())
}

model BlacklistItem {
  id        String   @id @default(cuid())
  dishName  String   // 菜品名（用于去重）
  createdAt DateTime @default(now())
  // 可设置 TTL 自动清理 7 天前记录
}
2. AI 调用流程（流式生成 + 黑名单注入）
typescript
// app/api/recommend/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { date, spicyLevel, dislikes, historyDishes } = await req.json();
  
  const systemPrompt = `
    你是川菜推荐官。今天是${date}，用户辣度${spicyLevel}/5。
    忌口：${dislikes.join('、') || '无'}。
    最近一周推荐过的菜品（禁止重复）：${historyDishes.join('、') || '无'}。
    请严格按照输出格式生成三个板块：今日做饭、今日外卖、出去吃。
    强调一人食分量合理，川菜为主。
  `;
  
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    prompt: '请生成今日推荐。',
    temperature: 0.85,
  });
  
  return result.toAIStreamResponse();
}
3. 前端 H5 页面（参考实现）
已提供完整的单文件 index.html，使用原生 JavaScript + Tailwind CSS，支持：

本地存储用户偏好（辣度、忌口、API Key）

无 API Key 时降级为本地模拟推荐（内置菜品库）

历史菜品黑名单持久化（localStorage）

一键“换一天”重新生成并自动避免重复

如需扩展为 Next.js 全栈项目，可将该 H5 重构为 React Server Components，并保留相同的 UI/UX 交互逻辑。

4. 防重复机制（核心算法）
每次生成后，从推荐内容中提取菜品名（正则匹配 推荐菜：(.+)）

将菜品名存入 Redis Set（TTL = 7 天）或 PostgreSQL 表

下次请求时，将最近 7 天的菜品名作为黑名单传入 System Prompt

LLM 通过指令明确禁止重复

5. 一人食专属优化策略
做饭：在 System Prompt 中明确“主料不超过 3 种，单人份成本 ≤ 20 元，烹饪时间 ≤ 30 分钟”

外卖：优先推荐“小碗菜”“单人套餐”“卤肉饭”等品类，并提示“起送价 ≈ 20-30 元”

出去吃：推荐“商场 B1 层小吃档口”“豆花饭店”“面馆”等，标注“是否支持小份菜”

部署与运维
开发环境：pnpm create next-app + 本地 PostgreSQL（Docker）

生产环境：Vercel + Neon（PostgreSQL Serverless）+ Upstash Redis

环境变量：DEEPSEEK_API_KEY、DATABASE_URL、REDIS_URL

CI/CD：GitHub Actions 自动化测试 + Vercel 预览部署

📦 交付物清单
文件	说明
agents.md	本文件（项目介绍 + 技术说明 + Agent 规范）
index.html	完整的独立 H5 程序（可直接运行）
schema.prisma	数据库模型定义（如需全栈版）
api/recommend/route.ts	Next.js AI 流式接口示例
page.tsx	React 前端组件示例（可选）
🔮 扩展方向（Roadmap）
食材拍照识别：集成 Google Vision / GPT-4V，用户拍冰箱可反推推荐菜。

LBS 真实餐厅推荐：接入高德/美团 API，根据用户位置推荐周边川菜馆。

社区共享菜谱：允许用户上传自己的“一人食川菜改造方案”，形成 UGC 库。

卡路里与营养标签：调用菜谱 API 或 LLM 估算每道菜的蛋白质/碳水/脂肪比例。

语音交互：接入 Web Speech API，用户可说“今天吃什么”，Agent 语音回复。

📄 License
MIT © 2026 一人食·川菜推荐官

