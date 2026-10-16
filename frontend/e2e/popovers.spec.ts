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

  const scrollHeight = await locator.evaluate((element) => element.scrollHeight);
  const clientHeight = await locator.evaluate((element) => element.clientHeight);
  if (scrollHeight > clientHeight) {
    const beforeScroll = await locator.evaluate((element) => element.scrollTop);
    const beforePageY = await page.evaluate(() => window.scrollY);
    const centerX = box!.x + box!.width / 2;
    const centerY = box!.y + box!.height / 2;

    await page.mouse.move(centerX, centerY);
    await page.mouse.wheel(0, 80);

    await expect(page.evaluate(() => window.scrollY)).resolves.toBe(beforePageY);
    await expect(locator.evaluate((element) => element.scrollTop)).resolves.toBeGreaterThanOrEqual(beforeScroll);
  }
}

async function assertWheelDoesNotScrollPage(page: Parameters<typeof test>[0]['page'], locator: ReturnType<Parameters<typeof test>[0]['page']['locator']>) {
  const beforePageY = await page.evaluate(() => window.scrollY);
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.wheel(0, 120);

  await expect(page.evaluate(() => window.scrollY)).resolves.toBe(beforePageY);
}

test.describe('popover scrolling regressions', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 600 });
    await page.goto('/');
  });

  test('add filter popover stays in viewport and blocks page scrolling', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add filter' }).click();
    const menu = page.locator('[aria-label="Add filter menu"]');
    await expect(menu).toBeVisible();

    const style = await menu.evaluate((element) => {
      const comp = getComputedStyle(element);
      return {
        position: comp.position,
        width: Number.parseFloat(comp.width),
        overflowY: comp.overflowY,
        overscrollBehavior: comp.overscrollBehavior,
        zIndex: comp.zIndex,
      };
    });

    expect(style.position).toBe('fixed');
    expect(style.width).toBe(300);
    expect(style.overflowY).toBe('auto');
    expect(style.overscrollBehavior).toBe('contain');
    expect(Number(style.zIndex)).toBeGreaterThan(0);

    await assertPopoverInsideViewport(page, menu);
    await assertWheelDoesNotScrollPage(page, menu);

    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
    await expect(menu).toBeHidden();
  });

  test('see more popover stays in viewport and blocks page scrolling', async ({ page }) => {
    await page.getByRole('button', { name: 'See more' }).first().click();
    const menu = page.locator('[aria-label="See more options"]');
    await expect(menu).toBeVisible();

    await assertPopoverInsideViewport(page, menu);
    await assertWheelDoesNotScrollPage(page, menu);
  });

  test('view settings menu stays in viewport and blocks page scrolling', async ({ page }) => {
    await page.getByRole('button', { name: 'View settings' }).click();
    const menu = page.getByRole('menu').first();
    await expect(menu).toBeVisible();

    await assertPopoverInsideViewport(page, menu);
    await assertWheelDoesNotScrollPage(page, menu);
  });

  test('export menu stays in viewport and blocks page scrolling', async ({ page }) => {
    await page.getByRole('button', { name: 'Export' }).click();
    const menu = page.getByRole('menu').first();
    await expect(menu).toBeVisible();

    await assertPopoverInsideViewport(page, menu);
    await assertWheelDoesNotScrollPage(page, menu);
  });

  test('column picker stays in viewport and blocks page scrolling', async ({ page }) => {
    await page.getByRole('button', { name: 'View settings' }).click();
    await page.getByText('Show/hide columns').click();

    const picker = page.locator('div[style*="position: fixed"]').filter({ hasText: 'Reset to default' }).first();
    await expect(picker).toBeVisible();

    await assertPopoverInsideViewport(page, picker);
    await assertWheelDoesNotScrollPage(page, picker);
  });
});
