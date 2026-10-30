import { expect, test } from '@playwright/test';

test('device detail risk card and agent version match the prototype', async ({ page }) => {
  await page.goto('/');

  const search = page.getByPlaceholder('Search devices, accounts, OS, location');
  await search.fill('IOT-1049');
  const deviceRow = page.locator('tbody tr').filter({ hasText: 'IOT-1049' }).first();
  await expect(deviceRow).toBeVisible();
  await deviceRow.click();

  const riskCard = page.getByRole('heading', { name: 'Current risk score' }).locator('xpath=following-sibling::dl');
  const riskLabels = await riskCard.locator('dt').allTextContents();
  expect(riskLabels).toEqual(['Risk score', 'Risk policy', 'Violations', 'Access policy']);

  const scoreRow = riskCard.locator('dt', { hasText: 'Risk score' }).locator('xpath=following-sibling::dd[1]');
  await expect(scoreRow).toContainText('55');
  await expect(scoreRow).toContainText('(Restrict)');
  await expect(scoreRow.locator('[data-testid="risk-pill"]')).toHaveText('55');

  const riskPolicyRow = riskCard.locator('dt', { hasText: 'Risk policy' }).locator('xpath=following-sibling::dd[1]');
  await expect(riskPolicyRow.locator('i')).toHaveText('Server_Policy');

  const violationsRow = riskCard.locator('dt', { hasText: 'Violations' }).locator('xpath=following-sibling::dd[1]');
  await expect(violationsRow.locator('li')).toHaveCount(2);
  await expect(violationsRow).toContainText('Applications');
  await expect(violationsRow).toContainText('Administrator privileges');

  const accessPolicyRow = riskCard.locator('dt', { hasText: 'Access policy' }).locator('xpath=following-sibling::dd[1]');
  await expect(accessPolicyRow).toContainText('Remediation_VLAN_Policy');

  const detailCard = page.getByRole('heading', { name: 'Device details' }).locator('xpath=following-sibling::dl');
  const agentVersionRow = detailCard.locator('dt', { hasText: 'Agent version' }).locator('xpath=following-sibling::dd[1]');
  await expect(agentVersionRow).toHaveText(/1\.1\.\d+ — enrolled [A-Za-z]{3} \d{1,2}, \d{4}/);
});
