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

  it("copies the local contracts package into every image", () => {
    expect(read("frontend/Dockerfile")).toMatch(/COPY packages\/contracts/);
    expect(read("admin/Dockerfile")).toMatch(/COPY packages\/contracts/);
    expect(read("backend/Dockerfile")).toMatch(/COPY packages\/contracts/);
  });

  it("builds admin from the repository root in every Compose file", () => {
    expect(read("docker-compose.yml")).toMatch(/dockerfile: admin\/Dockerfile/);
    expect(read("docker-compose.prod.yml")).toMatch(/dockerfile: admin\/Dockerfile/);
    expect(read("docker-compose.yml")).not.toMatch(/context: \.\/admin/);
    expect(read("docker-compose.prod.yml")).not.toMatch(/context: \.\/admin/);
  });

  it("passes APP_BUILD_SHA into frontend and admin images", () => {
    expect(read("frontend/Dockerfile")).toMatch(/ARG APP_BUILD_SHA/);
    expect(read("admin/Dockerfile")).toMatch(/ARG APP_BUILD_SHA/);
  });
});
