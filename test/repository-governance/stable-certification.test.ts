import { gzipSync } from "node:zlib";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createCertifiedStableEvidence, createPhysicalVerdict, createPlatformVerdict, verifyStableVerdicts, type StableExpectedIdentity } from "../../scripts/stable-certification.mjs";

const expected: StableExpectedIdentity = {
  commit: "a".repeat(40),
  tree: "b".repeat(40),
  packageName: "@timurproko/a1",
  version: "1.2.0",
  integrity: "sha512-fixture",
  shasum: "c".repeat(40),
};
const platforms = ["win32", "linux", "darwin"] as const;
const roots: string[] = [];

function automated() {
  return platforms.map(platform => createPlatformVerdict({ ...expected, platform, outcomes: [{ id: `automated-${platform}`, exitCode: 0, durationMs: 1 }] }));
}
function physical() {
  return platforms.map(platform => createPhysicalVerdict({ ...expected, platform, isolatedWorker: true, outcomes: [{ id: `physical-${platform}`, exitCode: 0, durationMs: 1 }] }));
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe("stable platform certification aggregation", () => {
  it("accepts exactly three passing automated and isolated physical verdicts", () => {
    expect(verifyStableVerdicts({ automated: automated(), physical: physical(), expected })).toMatchObject({
      automated: [{ platform: "win32" }, { platform: "linux" }, { platform: "darwin" }],
      physical: [{ platform: "win32" }, { platform: "linux" }, { platform: "darwin" }],
    });
  });

  it("fails closed for missing, failed, non-isolated, or mismatched verdicts", () => {
    expect(() => verifyStableVerdicts({ automated: automated().slice(0, 2), physical: physical(), expected })).toThrow("automated platform verdicts are missing");
    expect(() => verifyStableVerdicts({ automated: automated(), physical: physical().map((verdict, index) => index === 0 ? { ...verdict, passed: false } : verdict), expected })).toThrow("physical verdict failed");
    expect(() => verifyStableVerdicts({ automated: automated(), physical: physical().map((verdict, index) => index === 0 ? { ...verdict, isolatedWorker: false } : verdict), expected })).toThrow("not isolated");
    expect(() => verifyStableVerdicts({ automated: automated().map((verdict, index) => index === 0 ? { ...verdict, package: { ...verdict.package, integrity: "wrong" } } : verdict), physical: physical(), expected })).toThrow("integrity differs");
  });

  it("marks evidence stable-eligible only after complete aggregation", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "stable-certification-"));
    roots.push(root);
    const tarballPath = resolve(root, "candidate.tgz");
    const bytes = createTarball({ name: expected.packageName, version: expected.version, bin: { "a1": "bin/cli.js" } });
    await writeFile(tarballPath, bytes);
    const crypto = await import("node:crypto");
    const exact = {
      ...expected,
      integrity: `sha512-${crypto.createHash("sha512").update(bytes).digest("base64")}`,
      shasum: crypto.createHash("sha1").update(bytes).digest("hex"),
    };
    const evidence = await createCertifiedStableEvidence({
      automated: platforms.map(platform => createPlatformVerdict({ ...exact, platform, outcomes: [{ id: `automated-${platform}`, exitCode: 0, durationMs: 1 }] })),
      physical: platforms.map(platform => createPhysicalVerdict({ ...exact, platform, isolatedWorker: true, outcomes: [{ id: `physical-${platform}`, exitCode: 0, durationMs: 1 }] })),
      expected: exact,
      tarballPath,
      runner: { workflow: "fixture", runId: "1", attempt: 1, label: "fixture" },
    });
    expect(evidence).toMatchObject({
      channel: "latest",
      package: { version: "1.2.0", integrity: exact.integrity },
      certification: { physical: "certified", crossPlatform: "certified", stableEligible: true },
    });
  });
});

function createTarball(manifest: Record<string, unknown>): Buffer {
  const content = Buffer.from(JSON.stringify(manifest));
  const header = Buffer.alloc(512);
  header.write("package/package.json", 0, "utf8");
  header.write(`${content.length.toString(8).padStart(11, "0")}\0`, 124, "ascii");
  header[156] = "0".charCodeAt(0);
  return gzipSync(Buffer.concat([header, content, Buffer.alloc(Math.ceil(content.length / 512) * 512 - content.length), Buffer.alloc(1024)]));
}
