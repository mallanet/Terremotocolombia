#!/usr/bin/env node
/**
 * Export Ola 0 X frames from frames-export.html → PNG in this folder.
 * Uses Playwright Chromium (install: npm i playwright && npx playwright install chromium).
 */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, "frames-export.html");
const ids = [
  "x-ancla-utilidad-16x9",
  "x-telefonos-16x9",
  "x-antirumor-16x9",
  "x-hilo-portada-16x9",
  "x-header-16x9",
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1600, height: 2200 },
  deviceScaleFactor: 2,
});
await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

for (const id of ids) {
  const dest = path.join(__dirname, `${id}.png`);
  const el = page.locator(`#${id}`);
  await el.screenshot({ path: dest, type: "png" });
  console.log("saved", dest);
}

await browser.close();
