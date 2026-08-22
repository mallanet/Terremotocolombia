#!/usr/bin/env node
/**
 * Mixed-version fixture gate: required keys present, no token-like fields.
 * Domain Zod schemas live in `@mallanet/contracts` (reports landed in U2).
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "fixtures", "stable");
const bannedKey = /(token|password|secret|authorization|contact|phone|email|document)/i;

let failed = 0;
for (const name of readdirSync(fixturesDir).filter((file) => file.endsWith(".json"))) {
  const path = join(fixturesDir, name);
  const doc = JSON.parse(readFileSync(path, "utf8"));
  const required = doc.requiredKeys;
  const example = doc.example;
  if (!Array.isArray(required) || typeof example !== "object" || example === null) {
    console.error(`${name}: missing requiredKeys or example`);
    failed += 1;
    continue;
  }
  for (const key of required) {
    if (!(key in example)) {
      console.error(`${name}: example missing required key ${key}`);
      failed += 1;
    }
  }
  for (const key of Object.keys(example)) {
    if (bannedKey.test(key)) {
      console.error(`${name}: example contains banned key ${key}`);
      failed += 1;
    }
  }
}

if (failed) {
  console.error(`check-fixtures: ${failed} problem(s)`);
  process.exit(1);
}
console.log("check-fixtures: OK");
