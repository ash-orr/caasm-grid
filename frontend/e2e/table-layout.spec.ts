import { expect, test } from '@playwright/test';

test.describe('Table selection column layout', () => {
  for (const tabName of ['Devices', 'Accounts', 'Sites']) {
    test(`${tabName} keeps the fixed-width selection column aligned to the prototype`, async ({ page }) => {
      await page.goto('/');

      await page.getByRole('button', { name: tabName }).click();

      const table = page.locator('table').first();
      const tableCount = await table.count();
      if (tabName === 'Sites' && tableCount === 0) {
        test.skip();
      }

      const headerCheckboxCell = table.locator('thead th').first();
      const rowCheckboxCell = table.locator('tbody tr').first().locator('td').first();
      const headerCheckboxInput = headerCheckboxCell.locator('input[type="checkbox"]').first();
      const rowCheckboxInput = rowCheckboxCell.locator('input[type="checkbox"]').first();
      const firstDataHeader = table.locator('thead th').nth(1);

      const tableBox = await table.boundingBox();
      const headerCheckboxBox = await headerCheckboxCell.boundingBox();
      const rowCheckboxBox = await rowCheckboxCell.boundingBox();
      const headerCheckboxInputBox = await headerCheckboxInput.boundingBox();
      const rowCheckboxInputBox = await rowCheckboxInput.boundingBox();
      const firstDataHeaderBox = await firstDataHeader.boundingBox();

      expect(tableBox).not.toBeNull();
      expect(headerCheckboxBox).not.toBeNull();
      expect(rowCheckboxBox).not.toBeNull();
      expect(headerCheckboxInputBox).not.toBeNull();
      expect(rowCheckboxInputBox).not.toBeNull();
      expect(firstDataHeaderBox).not.toBeNull();

      if (!tableBox || !headerCheckboxBox || !rowCheckboxBox || !headerCheckboxInputBox || !rowCheckboxInputBox || !firstDataHeaderBox) {
        throw new Error(`Missing measurements for ${tabName}`);
      }

      const headerCheckboxWidth = headerCheckboxBox.width;
      const rowCheckboxWidth = rowCheckboxBox.width;
      const firstColumnOffset = firstDataHeaderBox.x - tableBox.x;
      const headerCheckboxOffsetFromTable = headerCheckboxInputBox.x - tableBox.x;
      const rowCheckboxOffsetFromTable = rowCheckboxInputBox.x - tableBox.x;

      console.log(`${tabName}: headerCheckbox=${headerCheckboxWidth.toFixed(2)} rowCheckbox=${rowCheckboxWidth.toFixed(2)} firstColumnOffset=${firstColumnOffset.toFixed(2)} headerCheckboxOffset=${headerCheckboxOffsetFromTable.toFixed(2)} rowCheckboxOffset=${rowCheckboxOffsetFromTable.toFixed(2)}`);

      expect(Math.abs(headerCheckboxWidth - 44)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(rowCheckboxWidth - 44)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(firstColumnOffset - 44)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(headerCheckboxOffsetFromTable - 12)).toBeLessThanOrEqual(1);
      expect(Math.abs(rowCheckboxOffsetFromTable - 12)).toBeLessThanOrEqual(1);
    });
  }
});
