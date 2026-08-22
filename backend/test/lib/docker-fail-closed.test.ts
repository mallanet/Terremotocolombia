import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import "../helpers";

const repoRoot = join(import.meta.dirname, "../../..");

function read(relative: string): string {
  return readFileSync(join(repoRoot, relative), "utf8");
}

describe("Docker builds fail closed", () => {
  it("does not fall back from npm ci to npm install", () => {
    expect(read("frontend/Dockerfile")).not.toMatch(/npm ci[\s\S]*\|\|[\s\S]*npm install/);
    expect(read("admin/Dockerfile")).not.toMatch(/npm ci[\s\S]*\|\|[\s\S]*npm install/);
    expect(read("backend/Dockerfile")).not.toMatch(/npm ci[\s\S]*\|\|[\s\S]*npm install/);
  });

  it("does not ignore a failed backend typecheck build", () => {
    expect(read("backend/Dockerfile")).not.toMatch(/npm run build\s*\|\|/);
    expect(read("backend/Dockerfile")).toMatch(/RUN npm run build\s*$/m);
  });

  it("passes APP_BUILD_SHA into frontend and admin images", () => {
    expect(read("frontend/Dockerfile")).toMatch(/ARG APP_BUILD_SHA/);
    expect(read("admin/Dockerfile")).toMatch(/ARG APP_BUILD_SHA/);
  });
});
