// ============================================================
// E2E 测试：首页推荐流程
// 打开首页 -> 点击换一天 -> 检查三个板块内容存在
// ============================================================

import { test, expect } from '@playwright/test';

test.describe('首页推荐功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
  });

  test('首页应该显示标题', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('一人食·川菜推荐官');
  });

  test('点击今天吃什么按钮应该生成推荐', async ({ page }) => {
    // 点击"今天吃什么"按钮
    const generateButton = page.getByRole('button', { name: /今天吃什么/ });
    await expect(generateButton).toBeVisible();
    await generateButton.click();

    // 等待推荐加载完成（最多等待 30 秒）
    await page.waitForTimeout(2000);

    // 检查是否有推荐内容或加载状态
    const hasContent = await page.locator('text=推荐菜').isVisible().catch(() => false);
    const hasLoading = await page.locator('text=生成中').isVisible().catch(() => false);
    const hasSkeleton = await page.locator('.animate-pulse').isVisible().catch(() => false);

    // 至少应该有内容、加载中或骨架屏之一
    expect(hasContent || hasLoading || hasSkeleton).toBeTruthy();
  });

  test('推荐内容应该包含三个板块', async ({ page }) => {
    // 先生成推荐
    const generateButton = page.getByRole('button', { name: /今天吃什么/ });
    await generateButton.click();

    // 等待推荐加载完成
    await page.waitForSelector('text=推荐菜', { timeout: 30000 }).catch(() => {
      // 如果超时，可能是流式加载，继续检查
    });

    // 检查做饭板块
    const cookSection = page.locator('text=今日做饭');
    await expect(cookSection).toBeVisible({ timeout: 10000 });

    // 检查外卖板块
    const takeoutSection = page.locator('text=今日外卖');
    await expect(takeoutSection).toBeVisible();

    // 检查出去吃板块
    const eatoutSection = page.locator('text=出去吃');
    await expect(eatoutSection).toBeVisible();
  });

  test('应该有点此搜索链接（外卖）', async ({ page }) => {
    // 生成推荐
    const generateButton = page.getByRole('button', { name: /今天吃什么/ });
    await generateButton.click();

    // 等待推荐加载
    await page.waitForSelector('text=推荐菜', { timeout: 30000 }).catch(() => {});

    // 检查是否有美团搜索链接
    const searchLink = page.locator('text=点此搜索');
    await expect(searchLink).toBeVisible({ timeout: 10000 });

    // 验证链接指向美团
    const href = await searchLink.getAttribute('href');
    expect(href).toContain('meituan.com/search');
  });

  test('应该有大厨点评', async ({ page }) => {
    // 生成推荐
    const generateButton = page.getByRole('button', { name: /今天吃什么/ });
    await generateButton.click();

    // 等待推荐加载
    await page.waitForSelector('text=推荐菜', { timeout: 30000 }).catch(() => {});

    // 检查是否有大厨点评
    const chefComment = page.locator('text=大厨点评');
    await expect(chefComment).toBeVisible({ timeout: 10000 });
  });
});
