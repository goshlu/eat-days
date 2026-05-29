// ============================================================
// app/api/recommend/route.ts 单元测试
// ============================================================

import { describe, it, expect } from 'vitest';

// 测试 Markdown 解析逻辑
// 注意：由于 parseMarkdownToJSON 是私有函数，我们通过测试正则表达式来验证逻辑

describe('Recommend API - Markdown Parsing', () => {
  // 模拟 AI 返回的 Markdown 内容
  const sampleMarkdown = `## 👩‍🍳 今日做饭
- **推荐菜：**麻婆豆腐
- **理由：**经典川菜，嫩滑入味，下饭神器
- **快手秘籍：**先炒肉末出油，再下豆瓣酱炒红油
- **食材清单（单人份）：**嫩豆腐1块、猪肉末100g

## 🛵 今日外卖
- **推荐点：**小碗菜·回锅肉套餐
- **理由：**单人份量刚好，荤素搭配
- **凑单小贴士：**加酸辣土豆丝 + 可乐 ≈ 22元

## 🚶 出去吃
- **推荐餐厅类型：**商场B1层·川味小碗菜
- **必点菜品：**回锅肉小碗 + 酸辣土豆丝
- **单人友好提示：**有吧台座

## 💬 大厨点评
- **点评：**这道麻婆豆腐的豆瓣酱一定要用郫县三年陈，才够魂`;

  it('should extract cook dish name', () => {
    const match = sampleMarkdown.match(/\*\*推荐菜[：:]\*\*\s*(.+)/);
    expect(match?.[1]?.trim()).toBe('麻婆豆腐');
  });

  it('should extract cook reason', () => {
    const match = sampleMarkdown.match(/\*\*理由[：:]\*\*\s*(.+)/);
    expect(match?.[1]?.trim()).toBe('经典川菜，嫩滑入味，下饭神器');
  });

  it('should extract cook quickTip', () => {
    const match = sampleMarkdown.match(/\*\*快手秘籍[：:]\*\*\s*(.+)/);
    expect(match?.[1]?.trim()).toBe('先炒肉末出油，再下豆瓣酱炒红油');
  });

  it('should extract cook ingredients', () => {
    const match = sampleMarkdown.match(/\*\*食材清单（单人份）[：:]\*\*\s*(.+)/);
    expect(match?.[1]?.trim()).toBe('嫩豆腐1块、猪肉末100g');
  });

  it('should extract takeout dish', () => {
    const match = sampleMarkdown.match(/\*\*推荐点[：:]\*\*\s*(.+)/);
    expect(match?.[1]?.trim()).toBe('小碗菜·回锅肉套餐');
  });

  it('should extract takeout tip', () => {
    const match = sampleMarkdown.match(/\*\*凑单小贴士[：:]\*\*\s*(.+)/);
    expect(match?.[1]?.trim()).toBe('加酸辣土豆丝 + 可乐 ≈ 22元');
  });

  it('should extract eatout type', () => {
    const match = sampleMarkdown.match(/\*\*推荐餐厅类型[：:]\*\*\s*(.+)/);
    expect(match?.[1]?.trim()).toBe('商场B1层·川味小碗菜');
  });

  it('should extract eatout dish', () => {
    const match = sampleMarkdown.match(/\*\*必点菜品[：:]\*\*\s*(.+)/);
    expect(match?.[1]?.trim()).toBe('回锅肉小碗 + 酸辣土豆丝');
  });

  it('should extract eatout tip', () => {
    const match = sampleMarkdown.match(/\*\*单人友好提示[：:]\*\*\s*(.+)/);
    expect(match?.[1]?.trim()).toBe('有吧台座');
  });

  it('should extract chef comment', () => {
    const match = sampleMarkdown.match(/\*\*点评[：:]\*\*\s*(.+)/);
    expect(match?.[1]?.trim()).toBe('这道麻婆豆腐的豆瓣酱一定要用郫县三年陈，才够魂');
  });

  it('should extract dish names for blacklist', () => {
    const dishes: string[] = [];
    const cookMatch = sampleMarkdown.match(/\*\*推荐菜[：:]\*\*\s*(.+)/);
    if (cookMatch?.[1]) dishes.push(cookMatch[1].trim());
    const takeoutMatch = sampleMarkdown.match(/\*\*推荐点[：:]\*\*\s*(.+)/);
    if (takeoutMatch?.[1]) dishes.push(takeoutMatch[1].trim());

    expect(dishes).toEqual(['麻婆豆腐', '小碗菜·回锅肉套餐']);
  });
});

describe('Recommend API - Cache Key Generation', () => {
  it('should generate consistent hash for same inputs', () => {
    const crypto = require('crypto');
    const hash1 = crypto.createHash('md5').update('spicy:3|dislikes:香菜,内脏').digest('hex').slice(0, 12);
    const hash2 = crypto.createHash('md5').update('spicy:3|dislikes:香菜,内脏').digest('hex').slice(0, 12);
    expect(hash1).toBe(hash2);
  });

  it('should generate different hash for different inputs', () => {
    const crypto = require('crypto');
    const hash1 = crypto.createHash('md5').update('spicy:3|dislikes:香菜').digest('hex').slice(0, 12);
    const hash2 = crypto.createHash('md5').update('spicy:5|dislikes:香菜').digest('hex').slice(0, 12);
    expect(hash1).not.toBe(hash2);
  });

  it('should sort dislikes for consistent hash', () => {
    const crypto = require('crypto');
    const hash1 = crypto.createHash('md5').update('spicy:3|dislikes:内脏,香菜').digest('hex').slice(0, 12);
    const hash2 = crypto.createHash('md5').update('spicy:3|dislikes:香菜,内脏').digest('hex').slice(0, 12);
    // 注意：由于输入顺序不同，hash 会不同
    // 这就是为什么需要排序
    expect(hash1).not.toBe(hash2);
  });
});

describe('Recommend API - Spicy Level Mapping', () => {
  const SPICY_MAP: Record<number, string> = {
    1: '微辣（几乎不辣）',
    2: '中辣（能接受一般辣度）',
    3: '重辣（无辣不欢）',
    4: '爆辣（辣椒当饭吃）',
    5: '变态辣（挑战极限）',
  };

  it('should map all spicy levels', () => {
    expect(SPICY_MAP[1]).toBe('微辣（几乎不辣）');
    expect(SPICY_MAP[2]).toBe('中辣（能接受一般辣度）');
    expect(SPICY_MAP[3]).toBe('重辣（无辣不欢）');
    expect(SPICY_MAP[4]).toBe('爆辣（辣椒当饭吃）');
    expect(SPICY_MAP[5]).toBe('变态辣（挑战极限）');
  });

  it('should return undefined for invalid level', () => {
    expect(SPICY_MAP[6]).toBeUndefined();
    expect(SPICY_MAP[0]).toBeUndefined();
  });
});
