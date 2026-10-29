import { expect, test } from '@playwright/test';

test.describe('Table selection column layout', () => {
  const prototypeHeaderRowHeight = 39.9;

  for (const tabName of ['Devices', 'Accounts', 'Sites']) {
    test(`${tabName} keeps the fixed-width selection column aligned and row heights matching the prototype`, async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: tabName }).click();

      const table = page.locator('table').first();
      const tableCount = await table.count();

      if (tabName === 'Sites' && tableCount === 0) {
        await expect(page.getByText('NAS Sites table would go here')).toBeVisible();
        return;
      }

      const headerRow = table.locator('thead tr').first();
      const firstBodyRow = table.locator('tbody tr').first();
      const headerCheckboxCell = table.locator('thead th').first();
      const rowCheckboxCell = firstBodyRow.locator('td').first();
      const headerCheckboxInput = headerCheckboxCell.locator('input[type="checkbox"]').first();
      const rowCheckboxInput = rowCheckboxCell.locator('input[type="checkbox"]').first();
      const firstDataHeader = table.locator('thead th').nth(1);

      const tableBox = await table.boundingBox();
      const headerRowBox = await headerRow.boundingBox();
      const firstBodyRowBox = await firstBodyRow.boundingBox();
      const headerCheckboxBox = await headerCheckboxCell.boundingBox();
      const rowCheckboxBox = await rowCheckboxCell.boundingBox();
      const headerCheckboxInputBox = await headerCheckboxInput.boundingBox();
      const rowCheckboxInputBox = await rowCheckboxInput.boundingBox();
      const firstDataHeaderBox = await firstDataHeader.boundingBox();

      expect(tableBox).not.toBeNull();
      expect(headerRowBox).not.toBeNull();
      expect(firstBodyRowBox).not.toBeNull();
      expect(headerCheckboxBox).not.toBeNull();
      expect(rowCheckboxBox).not.toBeNull();
      expect(headerCheckboxInputBox).not.toBeNull();
      expect(rowCheckboxInputBox).not.toBeNull();
      expect(firstDataHeaderBox).not.toBeNull();

      if (!tableBox || !headerRowBox || !firstBodyRowBox || !headerCheckboxBox || !rowCheckboxBox || !headerCheckboxInputBox || !rowCheckboxInputBox || !firstDataHeaderBox) {
        throw new Error(`Missing measurements for ${tabName}`);
      }

      const headerRowHeight = headerRowBox.height;
      const firstBodyRowHeight = firstBodyRowBox.height;
      const headerCheckboxWidth = headerCheckboxBox.width;
      const rowCheckboxWidth = rowCheckboxBox.width;
      const firstColumnOffset = firstDataHeaderBox.x - tableBox.x;
      const headerCheckboxOffsetFromTable = headerCheckboxInputBox.x - tableBox.x;
      const rowCheckboxOffsetFromTable = rowCheckboxInputBox.x - tableBox.x;

      console.log(`${tabName}: headerRow=${headerRowHeight.toFixed(2)} firstBodyRow=${firstBodyRowHeight.toFixed(2)} headerCheckbox=${headerCheckboxWidth.toFixed(2)} rowCheckbox=${rowCheckboxWidth.toFixed(2)} firstColumnOffset=${firstColumnOffset.toFixed(2)} headerCheckboxOffset=${headerCheckboxOffsetFromTable.toFixed(2)} rowCheckboxOffset=${rowCheckboxOffsetFromTable.toFixed(2)}`);

      expect(Math.abs(headerRowHeight - prototypeHeaderRowHeight)).toBeLessThanOrEqual(0.2);
      expect(Math.abs(firstBodyRowHeight - 40.4)).toBeLessThanOrEqual(0.2);
      expect(Math.abs(headerCheckboxWidth - 44)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(rowCheckboxWidth - 44)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(firstColumnOffset - 44)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(headerCheckboxOffsetFromTable - 12)).toBeLessThanOrEqual(1);
      expect(Math.abs(rowCheckboxOffsetFromTable - 12)).toBeLessThanOrEqual(1);
    });
  }
});
