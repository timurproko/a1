import { gzipSync } from "node:zlib";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupExactPackagePreparation,
  exactPackagePreparationEnvironment,
  EXACT_PACKAGE_INSTALL_POLICY,
  EXACT_PACKAGE_PREPARATION_ENV,
  installArguments,
  prepareExactPackageInstallation,
  verifyExactPackagePreparation,
} from "../../scripts/release/exact-package-preparation.mjs";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe("lane-scoped exact-package preparation", () => {
  it("installs and synchronizes once while binding candidate, lane, policy, paths, and consumers", async () => {
    const fixture = await prepareFixture();
    expect(fixture.calls).toHaveLength(2);
    expect(fixture.calls[0]!.arguments).toEqual(installArguments(fixture.preparation.prefix, fixture.candidate));
    expect(fixture.preparation.receipt).toMatchObject({
      authority: "validation-runner",
      candidate: { name: "@fixture/app", version: "1.2.3", sha256: expect.stringMatching(/^[0-9a-f]{64}$/) },
      lane: { platform: process.platform, architecture: process.arch, nodeVersion: process.version, runId: "123", runAttempt: "4" },
      install: { policy: EXACT_PACKAGE_INSTALL_POLICY, root: fixture.preparation.root, prefix: fixture.preparation.prefix },
      preparation: { count: 1, proxySynchronizations: 1 },
      consumers: ["package-startup", "package-contracts"],
      receiptId: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    const environment = { ...fixture.environment, [EXACT_PACKAGE_PREPARATION_ENV.consumer]: "package-startup" };
    await expect(verifyExactPackagePreparation({ environment })).resolves.toMatchObject({ prefix: fixture.preparation.prefix });
  });

  it("rejects stale bytes, malformed receipts, cross-lane use, unauthorized consumers, and escaping handoffs", async () => {
    const stale = await prepareFixture();
    await writeFile(stale.candidate, tarball({ name: "@fixture/app", version: "1.2.4" }));
    await expect(verifyExactPackagePreparation({ environment: { ...stale.environment, [EXACT_PACKAGE_PREPARATION_ENV.consumer]: "package-startup" } }))
      .rejects.toThrow(/candidate identity/);

    const malformed = await prepareFixture();
    await writeFile(malformed.preparation.receiptPath, "{}\n");
    await expect(verifyExactPackagePreparation({ environment: { ...malformed.environment, [EXACT_PACKAGE_PREPARATION_ENV.consumer]: "package-startup" } }))
      .rejects.toThrow(/malformed/);

    const lane = await prepareFixture();
    await expect(verifyExactPackagePreparation({
      environment: { ...lane.environment, [EXACT_PACKAGE_PREPARATION_ENV.consumer]: "package-startup" },
      identity: { runAttempt: "5" },
    })).rejects.toThrow(/another validation lane/);
    await expect(verifyExactPackagePreparation({ environment: { ...lane.environment, [EXACT_PACKAGE_PREPARATION_ENV.consumer]: "package-smoke" } }))
      .rejects.toThrow(/not authorized/);
    await expect(verifyExactPackagePreparation({ environment: {
      ...lane.environment,
      [EXACT_PACKAGE_PREPARATION_ENV.consumer]: "package-startup",
      [EXACT_PACKAGE_PREPARATION_ENV.prefix]: resolve(lane.preparation.root, "..", "escaped"),
    } })).rejects.toThrow(/escape/);
  });

  it("detects installed-package mutation before a later owner can consume it", async () => {
    const fixture = await prepareFixture();
    await writeFile(resolve(fixture.preparation.packageRoot, "dist", "identity.js"), "mutated");
    await expect(verifyExactPackagePreparation({ environment: {
      ...fixture.environment,
      [EXACT_PACKAGE_PREPARATION_ENV.consumer]: "package-contracts",
    } })).rejects.toThrow(/installed bytes changed/);
  });

  it("cleans a failed install without replacing its primary error", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-preparation-failure-")); roots.push(root);
    const candidate = join(root, "candidate.tgz");
    await writeFile(candidate, tarball({ name: "@fixture/app", version: "1.2.3" }));
    const removed: string[] = [];
    let captured: any;
    try {
      await prepareExactPackageInstallation({
        candidatePath: candidate,
        consumers: ["package-startup"],
        rootParent: root,
        runCommand: async () => ({ status: 17, stdout: "", stderr: "primary install failure" }),
        removeRoot: async path => { removed.push(path); return "deferred"; },
      });
    } catch (error) { captured = error; }
    expect(captured).toMatchObject({ message: expect.stringContaining("primary install failure"), cleanup: { status: "deferred", error: null } });
    expect(removed).toHaveLength(1);
  });

  it.each([
    ["passed", async () => "passed" as const],
    ["deferred", async () => "deferred" as const],
    ["failed", async () => { throw new Error("locked"); }],
  ])("reports %s bounded cleanup", async (status, removeRoot) => {
    const result = await cleanupExactPackagePreparation({ root: tmpdir() }, { removeRoot });
    expect(result).toMatchObject({ status, durationMs: expect.any(Number) });
    if (status === "failed") expect(result.error).toContain("locked");
  });
});

async function prepareFixture() {
  const root = await mkdtemp(join(tmpdir(), "a1-preparation-test-")); roots.push(root);
  const candidate = join(root, "candidate.tgz");
  await writeFile(candidate, tarball({ name: "@fixture/app", version: "1.2.3" }));
  const calls: Array<{ command: string; arguments: string[] }> = [];
  const preparation = await prepareExactPackageInstallation({
    candidatePath: candidate,
    consumers: ["package-startup", "package-contracts"],
    environment: { GITHUB_RUN_ID: "123", GITHUB_RUN_ATTEMPT: "4", VALIDATION_CANDIDATE_TARBALL: candidate },
    rootParent: root,
    runCommand: async (command, arguments_) => {
      calls.push({ command, arguments: arguments_ });
      if (calls.length === 1) {
        const prefix = arguments_[arguments_.indexOf("--prefix") + 1]!;
        const packageRoot = resolve(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", "@fixture", "app");
        await mkdir(resolve(packageRoot, "bin"), { recursive: true });
        await mkdir(resolve(packageRoot, "dist"), { recursive: true });
        await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@fixture/app", version: "1.2.3" }));
        await writeFile(resolve(packageRoot, "bin", "sync-pi-tui-proxy.js"), "// fixture");
        await writeFile(resolve(packageRoot, "dist", "identity.js"), "export const identity = true;");
      }
      return { status: 0, stdout: "", stderr: "" };
    },
  });
  return {
    root, candidate, calls, preparation,
    environment: {
      GITHUB_RUN_ID: "123",
      GITHUB_RUN_ATTEMPT: "4",
      VALIDATION_CANDIDATE_TARBALL: candidate,
      ...exactPackagePreparationEnvironment(preparation),
    },
  };
}

function tarball(manifest: Record<string, unknown>): Buffer {
  const content = Buffer.from(JSON.stringify({ bin: { app: "bin/cli.js" }, ...manifest }));
  const header = Buffer.alloc(512);
  header.write("package/package.json", 0, "utf8");
  header.write(`${content.length.toString(8).padStart(11, "0")}\0`, 124, "ascii");
  header[156] = "0".charCodeAt(0);
  return gzipSync(Buffer.concat([header, content, Buffer.alloc(Math.ceil(content.length / 512) * 512 - content.length), Buffer.alloc(1024)]));
}
