import { expect, test } from '@playwright/test';

async function assertPopoverInsideViewport(page: Parameters<typeof test>[0]['page'], locator: ReturnType<Parameters<typeof test>[0]['page']['locator']>) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
}

async function assertScrollInsideMenuKeepsItOpen(page: Parameters<typeof test>[0]['page'], locator: ReturnType<Parameters<typeof test>[0]['page']['locator']>) {
  const before = await locator.evaluate((element) => ({
    visible: !!element,
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));

  if (before.scrollHeight <= before.clientHeight) {
    return;
  }

  await locator.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  await expect(locator).toBeVisible();
  await expect(locator.evaluate((element) => element.scrollTop)).resolves.toBeGreaterThan(before.scrollTop);
}

async function assertPageScrollKeepsMenuAttached(page: Parameters<typeof test>[0]['page'], locator: ReturnType<Parameters<typeof test>[0]['page']['locator']>) {
  const before = await locator.evaluate((element) => ({
    x: element.getBoundingClientRect().x,
    y: element.getBoundingClientRect().y,
  }));

  await page.evaluate(() => window.scrollTo({ top: 160, behavior: 'instant' }));
  await expect(locator).toBeVisible();

  const after = await locator.evaluate((element) => ({
    x: element.getBoundingClientRect().x,
    y: element.getBoundingClientRect().y,
  }));

  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(2);
  expect(after.y).toBeGreaterThanOrEqual(0);
}

async function assertWheelDoesNotScrollPage(page: Parameters<typeof test>[0]['page'], locator: ReturnType<Parameters<typeof test>[0]['page']['locator']>) {
  const beforePageY = await page.evaluate(() => window.scrollY);
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  const mouseX = box!.x + box!.width / 2;
  const mouseY = box!.y + box!.height / 2;
  await page.mouse.move(mouseX, mouseY);
  await page.mouse.wheel(0, 120);

  await expect(page.evaluate(() => window.scrollY)).resolves.toBe(beforePageY);
}

test.describe('popover scrolling regressions', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 600 });
    await page.goto('/');
  });

  test('see more popover stays in viewport and blocks page scrolling', async ({ page }) => {
    await page.locator('summary').filter({ hasText: 'Location' }).click();
    await page.getByRole('button', { name: 'See more' }).click();
    const menu = page.locator('[aria-label="See more options"]');
    await expect(menu).toBeVisible();

    await assertPopoverInsideViewport(page, menu);
    await assertScrollInsideMenuKeepsItOpen(page, menu);
    await assertPageScrollKeepsMenuAttached(page, menu);
    await assertWheelDoesNotScrollPage(page, menu);
  });

  test('views menu stays in viewport and blocks page scrolling', async ({ page }) => {
    await page.getByRole('button', { name: 'Views' }).click();
    const menu = page.getByRole('menu').first();
    await expect(menu).toBeVisible();

    await assertPopoverInsideViewport(page, menu);
    await assertScrollInsideMenuKeepsItOpen(page, menu);
    await assertPageScrollKeepsMenuAttached(page, menu);
    await assertWheelDoesNotScrollPage(page, menu);
  });

  test('export menu stays in viewport and blocks page scrolling', async ({ page }) => {
    await page.getByRole('button', { name: 'Export' }).click();
    const menu = page.getByRole('menu').first();
    await expect(menu).toBeVisible();

    await assertPopoverInsideViewport(page, menu);
    await assertScrollInsideMenuKeepsItOpen(page, menu);
    await assertPageScrollKeepsMenuAttached(page, menu);
    await assertWheelDoesNotScrollPage(page, menu);
  });

  test('column picker stays in viewport and blocks page scrolling', async ({ page }) => {
    await page.getByRole('button', { name: 'Show/hide columns' }).click();

    const picker = page.locator('div[style*="position: fixed"]').filter({ hasText: 'Reset to default' }).first();
    await expect(picker).toBeVisible();

    await assertPopoverInsideViewport(page, picker);
    await assertScrollInsideMenuKeepsItOpen(page, picker);
    await assertPageScrollKeepsMenuAttached(page, picker);
    await assertWheelDoesNotScrollPage(page, picker);
  });

  test('toolbar icon buttons show Radix tooltips on hover and focus', async ({ page }) => {
    await page.goto('/');

    const filterButton = page.getByRole('button', { name: /hide filters/i }).first();
    await expect(filterButton).toBeVisible();
    await filterButton.hover();
    await expect(page.getByText('Hide filters')).toBeVisible();
    await filterButton.focus();
    await expect(page.getByText('Hide filters')).toBeVisible();

    const columnsButton = page.getByRole('button', { name: 'Show/hide columns' }).first();
    await columnsButton.hover();
    await expect(page.getByText('Show/hide columns')).toBeVisible();
    await columnsButton.focus();
    await expect(page.getByText('Show/hide columns')).toBeVisible();
  });

  test('devices and accounts include blocked and risk-state pills', async ({ page }) => {
    await page.goto('/');

    const filterButton = page.getByRole('button', { name: /hide filters/i }).first();
    await expect(filterButton).toHaveCSS('background-color', 'rgb(226, 241, 245)');
    await expect(filterButton).toHaveCSS('border-color', 'rgb(11, 110, 138)');

    const columnsButton = page.getByRole('button', { name: 'Show/hide columns' }).first();
    await expect(columnsButton).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(columnsButton).toHaveCSS('border-color', 'rgb(220, 226, 232)');

    await expect(page.locator('[data-testid="status-pill"]').filter({ hasText: 'Blocked' }).first()).toBeVisible();
    await expect(page.locator('tbody span[aria-label$=" Blocked"]:visible').first()).toBeVisible();
    await expect(page.locator('tbody span[aria-label$=" Alert"]:visible').first()).toBeVisible();
    await expect(page.locator('tbody span[aria-label$=" Access"]:visible').first()).toBeVisible();

    await page.getByRole('button', { name: 'Accounts' }).click();
    await expect(page.locator('[data-testid="status-pill"]').filter({ hasText: 'Blocked' }).first()).toBeVisible();
  });
});
