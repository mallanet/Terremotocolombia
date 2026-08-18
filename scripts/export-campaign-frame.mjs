#!/usr/bin/env node
/**
 * Export campaign frame HTML to PNG (1920x1080).
 * Requires: pnpm install in open-design/e2e (playwright).
 *
 * Usage:
 *   cd open-design/e2e && node ../../terremotocolombia/scripts/export-campaign-frame.mjs <html> <png>
 */
import { chromium } from '@playwright/test';
import path from 'node:path';

const [htmlPath, pngPath] = process.argv.slice(2);
if (!htmlPath || !pngPath) {
  console.error('Usage: node export-campaign-frame.mjs <html> <png>');
  process.exit(1);
}

const absHtml = path.resolve(htmlPath);
const absPng = path.resolve(pngPath);
const fileUrl = `file://${absHtml}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(fileUrl, { waitUntil: 'networkidle' });
const target = page.locator('#export-target');
await target.screenshot({ path: absPng, type: 'png' });
await browser.close();
console.log(`Exported ${absPng}`);
