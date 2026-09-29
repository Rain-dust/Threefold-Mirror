import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
test('browser completes the temporal loop and persists after reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('main')).toBeVisible();
  if (await page.getByRole('button', { name: '先体验示例人生' }).isVisible()) {
    await page.getByRole('button', { name: '先体验示例人生' }).click();
  }
  await expect(page.getByRole('heading', { name: '在此刻，照见自己。' })).toBeVisible();
  await page.screenshot({
    path: 'test-results/mirror-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.locator('.state-preview-grid .evidence-link').first().click();
  await expect(page.getByRole('dialog', { name: '为什么这样判断？' })).toBeVisible();
  await expect(page.locator('.source-card').first()).toContainText('第');
  await page.getByRole('button', { name: '关闭窗口' }).click();
  await page.getByRole('button', { name: '记录此刻', exact: true }).click();
  await page
    .getByLabel('今天，什么值得留下？')
    .fill('今天完成了最小版本，睡眠恢复，身体精力充足。开始只专注一个项目。');
  await page.getByRole('button', { name: '充足', exact: true }).first().click();
  await page.getByRole('button', { name: '保存此刻，更新三世镜' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('nav').getByRole('button', { name: '决策镜' }).click();
  if (await page.getByRole('button', { name: '新的决策' }).isVisible())
    await page.getByRole('button', { name: '新的决策' }).click();
  await page.getByLabel('你正在面对什么选择？').fill('本周如何推进可持续的作品？');
  await page.getByLabel('还有哪些重要的边界？').fill('每天最多一个小时，保持睡眠，周日回顾。');
  await page.getByRole('button', { name: '让三世一起看这个选择' }).click();
  await expect(page.locator('.branch-card')).toHaveCount(3);
  await page.getByRole('button', { name: '1 年', exact: true }).click();
  await expect(page.locator('.branch-horizon').first()).toContainText('一年后的可能');
  await page.getByRole('button', { name: '3 个月', exact: true }).click();
  await page.locator('.branch-card').nth(1).getByText('展开假设、变量与风险').click();
  await expect(page.locator('.branch-card').nth(1)).toContainText('主要变量');
  await page.locator('.branch-card').nth(1).getByRole('button', { name: '选择这个方向' }).click();
  await page
    .getByLabel('下一步做什么，何时回来检验？')
    .fill('每天一小时只开发一个小功能，周日对照用户反馈回顾。');
  await page.getByRole('button', { name: '记录行动', exact: true }).click();
  await expect(page.locator('.intervention-card')).toContainText('每天一小时');
  await page.getByLabel('真实结果').fill('完成了一个小功能并收到反馈，睡眠保持，精力充足。');
  await page.getByLabel('你的反思').fill('看见高投入的消耗风险后缩小了范围，项目得以持续。');
  await page.getByLabel('看到这些预测，改变了我的行动').check();
  await page.getByRole('button', { name: '保存复盘，更新三世镜' }).click();
  await expect(page.locator('.completed-reflection')).toContainText('这次推演改变了自己的行动');
  await page.screenshot({
    path: 'test-results/decision-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.reload();
  await page.locator('nav').getByRole('button', { name: '决策镜' }).click();
  await expect(page.locator('.completed-reflection')).toContainText('这次推演改变了自己的行动');
  await page.locator('nav').getByRole('button', { name: '现在的我' }).click();
  await expect(page.locator('.full-state-grid .state-card')).toHaveCount(8);
  await page.locator('nav').getByRole('button', { name: '过去的轨迹' }).click();
  await page.getByRole('button', { name: /记忆时间线/ }).click();
  await expect(page.locator('.timeline article').first()).toBeVisible();
  await page.locator('nav').getByRole('button', { name: '未来的回声' }).click();
  await expect(page.locator('.future-voice')).toBeVisible();
  await page.locator('nav').getByRole('button', { name: '三世镜', exact: true }).click();
  expect(errors).toEqual([]);
});
test('mobile navigation and layout fit a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '在此刻，照见自己。' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: 'test-results/mirror-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '打开导航' }).click();
  await page.locator('nav').getByRole('button', { name: '现在的我' }).click();
  await expect(page.locator('.full-state-grid .state-card')).toHaveCount(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('real vault preview, exclusions, source trace and HTTP origin protection', async ({
  page,
  request,
}) => {
  const vault = path.resolve('.local/browser-test/import-fixture');
  await fs.mkdir(path.join(vault, 'Private'), { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const original = `---\ndate: ${today}\ntitle: 导入验收记录\n---\n\n# 真实目录导入验收\n\n今天完成了项目原型，精力充足。\n`;
  await fs.writeFile(path.join(vault, 'record.md'), original);
  await fs.writeFile(path.join(vault, 'Private', 'excluded.md'), '# 不应读取\n我的私密项目资料。');
  try {
    await page.goto('/');
    await expect(page.locator('main')).toBeVisible();
    await page.locator('.vault-status').click();
    await page.getByLabel('Vault 文件夹的完整路径').fill(vault);
    await page.getByLabel('不希望读取的目录').fill('Private');
    await page.getByRole('button', { name: '只读预览' }).click();
    await expect(page.locator('.vault-preview')).toContainText('找到 1 篇 Markdown');
    await page.getByRole('button', { name: '连接并建立三世镜' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.demo-banner')).toHaveCount(0);
    await page.locator('.state-preview-grid .evidence-link').nth(1).click();
    await expect(page.locator('.source-card').first()).toContainText('导入验收记录');
    await page.getByRole('button', { name: '关闭窗口' }).click();
    expect(await fs.readFile(path.join(vault, 'record.md'), 'utf8')).toBe(original);
    const rejection = await request.post('/api/checkins', {
      headers: { Origin: 'https://untrusted.example' },
      data: { text: '不能写入这条记录' },
    });
    expect(rejection.status()).toBe(403);
    const badHost = await request.get('/api/state', {
      headers: { Host: 'untrusted.example:4318' },
    });
    expect(badHost.status()).toBe(403);
  } finally {
    await request.post('/api/vault/connect', { data: { demo: true } });
  }
});
