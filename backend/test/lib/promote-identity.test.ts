import { afterEach, describe, expect, it } from "vitest";
import "../helpers";
import {
  PromoteIdentityError,
  assertPromoteIdentity,
  evaluateDomainSmoke,
  parseWorkerVersionId,
} from "@/lib/promote-identity";
import { getAppBuildSha } from "@/lib/build-identity";

describe("promote identity", () => {
  it("parses a Worker Version ID from wrangler upload output", () => {
    const stdout = [
      "Uploaded terremotocolombia-web (1.23 sec)",
      "  Worker Version ID: 51d512cd-b31c-4d03-a046-fc850780f428",
    ].join("\n");
    expect(parseWorkerVersionId(stdout)).toBe(
      "51d512cd-b31c-4d03-a046-fc850780f428",
    );
  });

  it("refuses to promote SHA B under an approval for SHA A", () => {
    const shaA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const shaB = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    expect(() =>
      assertPromoteIdentity({ approvedSha: shaA, artifactSha: shaB }),
    ).toThrow(PromoteIdentityError);
    expect(() =>
      assertPromoteIdentity({ approvedSha: shaA, artifactSha: shaB }),
    ).toThrow(/refusing to promote/);
  });

  it("accepts matching full SHAs and matching version IDs", () => {
    const sha = "c".repeat(40);
    const versionId = "01234567-89ab-cdef-0123-456789abcdef";
    expect(
      assertPromoteIdentity({
        approvedSha: sha,
        artifactSha: sha,
        requestedVersionId: versionId,
        recordedVersionId: versionId,
      }),
    ).toEqual({ sha, versionId });
  });

  it("rejects a malformed SHA", () => {
    expect(() =>
      assertPromoteIdentity({ approvedSha: "abc", artifactSha: "abc" }),
    ).toThrow(/40-character/);
  });
});

describe("domain smoke verdict", () => {
  it("fails when a domain check fails even if readyz is healthy", () => {
    const result = evaluateDomainSmoke({
      readyzOk: true,
      domainChecks: [
        { name: "reports", ok: false },
        { name: "earthquakes", ok: true },
      ],
    });
    expect(result.verdict).toBe("domain-fail-while-ready");
    expect(result.failed).toEqual(["reports"]);
  });

  it("fails on SHA mismatch even when HTTP checks pass", () => {
    const result = evaluateDomainSmoke({
      readyzOk: true,
      domainChecks: [{ name: "reports", ok: true }],
      expectedSha: "a".repeat(40),
      servedShas: [{ name: "frontend", sha: "b".repeat(40) }],
    });
    expect(result.verdict).toBe("sha-mismatch");
  });

  it("passes when readyz, domain checks, and SHA agree", () => {
    const sha = "d".repeat(40);
    const result = evaluateDomainSmoke({
      readyzOk: true,
      domainChecks: [{ name: "reports", ok: true }],
      expectedSha: sha,
      servedShas: [
        { name: "frontend", sha },
        { name: "api", sha },
      ],
    });
    expect(result.verdict).toBe("ok");
    expect(result.failed).toEqual([]);
  });
});

describe("build identity", () => {
  const previous = process.env.APP_BUILD_SHA;

  afterEach(() => {
    if (previous === undefined) delete process.env.APP_BUILD_SHA;
    else process.env.APP_BUILD_SHA = previous;
  });

  it("falls back to dev when APP_BUILD_SHA is unset", () => {
    delete process.env.APP_BUILD_SHA;
    expect(getAppBuildSha()).toBe("dev");
  });

  it("returns the configured SHA", () => {
    process.env.APP_BUILD_SHA = "e".repeat(40);
    expect(getAppBuildSha()).toBe("e".repeat(40));
  });
});
