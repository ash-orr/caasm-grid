import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const prototypePath = path.resolve(rootDir, 'design', 'prototype', 'caasm-console.html');
const outDir = path.resolve(__dirname, 'prototype');
const portDir = path.resolve(__dirname, 'port');

const screens = [
  { name: 'devices-default', file: 'devices-default.png', url: 'file://' + prototypePath + '#/devices/default' },
  { name: 'devices-caasm', file: 'devices-caasm.png', url: 'file://' + prototypePath + '#/devices/caasm' },
  { name: 'accounts', file: 'accounts.png', url: 'file://' + prototypePath + '#/accounts' },
  { name: 'device-overview', file: 'device-overview.png', url: 'file://' + prototypePath + '#/device/115/overview' },
  { name: 'device-source-data', file: 'device-source-data.png', url: 'file://' + prototypePath + '#/device/115/source-data' },
  { name: 'account-detail', file: 'account-detail.png', url: 'file://' + prototypePath + '#/account/14' },
  { name: 'manage-filters', file: 'manage-filters.png', url: 'file://' + prototypePath + '#/manage-filters' },
  { name: 'see-more', file: 'see-more.png', url: 'file://' + prototypePath + '#/see-more' },
  { name: 'column-picker', file: 'column-picker.png', url: 'file://' + prototypePath + '#/column-picker' },
  { name: 'view-settings', file: 'view-settings.png', url: 'file://' + prototypePath + '#/view-settings' },
  { name: 'export-menu', file: 'export-menu.png', url: 'file://' + prototypePath + '#/export-menu' },
];

async function capture(url: string, file: string, width: number, height: number, theme: 'light' | 'dark') {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height }, colorScheme: theme });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.screenshot({ path: file, fullPage: true });
  await browser.close();
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await mkdir(portDir, { recursive: true });

  for (const theme of ['light', 'dark'] as const) {
    for (const screen of screens) {
      const target = path.join(theme === 'light' ? outDir : portDir, `${theme}-${screen.file}`);
      await capture(screen.url, target, 1440, 900, theme);
    }
  }

  await writeFile(path.join(outDir, 'README.txt'), 'Prototype screenshots generated from the design prototype.\n');
}

void main();
