import { expect, test } from '@playwright/test';

test('add filter popover uses fixed positioning and closes on scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto('/');

  await page.getByRole('button', { name: '+ Add filter' }).click();

  const menu = page.locator('[aria-label="Add filter menu"]');
  await expect(menu).toBeVisible();

  const style = await menu.evaluate((element) => {
    const comp = getComputedStyle(element);
    return {
      position: comp.position,
      width: Number.parseFloat(comp.width),
      maxHeight: comp.maxHeight,
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

  const box = await menu.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);

  await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
  await expect(menu).toBeHidden();
});
