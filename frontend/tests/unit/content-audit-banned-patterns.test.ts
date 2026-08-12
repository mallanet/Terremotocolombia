import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// CA-1: Mallanet community WhatsApp invite must not hard-fail content-audit.
// Active (non-comment) lines are hard-banned by scripts/content-audit/run.sh.

const BANNED_PATTERNS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "scripts",
  "content-audit",
  "banned-patterns.txt",
);

function activeHardBanLines(source: string): string[] {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !line.startsWith("#") &&
        !line.startsWith("CONTEXT:") &&
        !line.startsWith("CASESENSITIVE:"),
    );
}

describe("content-audit banned-patterns (CA-1)", () => {
  it("does not hard-ban chat.whatsapp.com (Mallanet community exception)", () => {
    const source = readFileSync(BANNED_PATTERNS_PATH, "utf8");
    const active = activeHardBanLines(source);
    // File stores POSIX ERE escapes literally (chat\.whatsapp\.com).
    expect(active.some((line) => /chat\\.whatsapp\\.com/.test(line))).toBe(
      false,
    );
    expect(source).toMatch(/\(retirado\)\s*chat\\.whatsapp\\.com/);
    expect(source).toMatch(/Mallanet|mallanet/i);
  });

  it("still lists unrelated messaging/payment hard-bans", () => {
    const source = readFileSync(BANNED_PATTERNS_PATH, "utf8");
    const active = activeHardBanLines(source);
    expect(active.some((line) => line.includes("gofund\\.me/"))).toBe(true);
    expect(active.some((line) => line.includes("wa\\.me/"))).toBe(true);
  });
});
