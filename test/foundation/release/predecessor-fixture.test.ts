import { access, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PredecessorFixture } from "../../support/predecessor-fixture.js";
import { PredecessorCommandError, type PredecessorCommand } from "../../support/predecessor-command.js";

function result(command: PredecessorCommand, stdout = "") {
  return { stdout, stderr: "", evidence: { phase: command.phase, version: command.version ?? null, executable: "npm" as const,
    durationMs: 0, stdoutBytes: Buffer.byteLength(stdout), stderrBytes: 0, exitCode: 0, signal: null, error: null, cleanupError: null } };
}
const exists = (path: string) => access(path).then(() => true, () => false);

describe("published predecessor fixture", () => {
  it("installs into a private prefix and finishes shipped synchronization before returning it", async () => {
    const execute = vi.fn(async (command: PredecessorCommand) => result(command));
    const fixture = new PredecessorFixture({ execute, report() {} });
    const packageRoot = await fixture.phase(5000, () => fixture.install("candidate with spaces.tgz"));
    const [install, sync] = execute.mock.calls.map(call => call[0]);
    expect(install!.phase).toBe("install-candidate");
    expect(install!.arguments).toEqual(["install", "--global", "--prefix", resolve(fixture.retainedRoots[0]!, "prefix"), "candidate with spaces.tgz", "--ignore-scripts", "--no-audit", "--no-fund"]);
    expect(sync!).toMatchObject({ executable: process.execPath, cwd: packageRoot, phase: "synchronize-candidate", arguments: [resolve(packageRoot, "bin", "sync-pi-tui-proxy.js")] });
    expect(install!.signal).toBe(sync!.signal);
    const roots = fixture.retainedRoots;
    await fixture.close(); await fixture.close();
    expect(await Promise.all(roots.map(exists))).toEqual([false]);
  });

  it.each(["install-predecessor", "synchronize-predecessor"])("stops dependent phases after failed %s", async failedPhase => {
    const execute = vi.fn(async (command: PredecessorCommand) => {
      if (command.phase === failedPhase) throw new PredecessorCommandError({ ...result(command).evidence, exitCode: 9, error: "EXIT" });
      return result(command);
    });
    const nextPhase = vi.fn();
    const fixture = new PredecessorFixture({ execute, report() {} });
    await expect(fixture.phase(5000, async () => { await fixture.install("@timurproko/a1@0.1.8-dev.390", "0.1.8-dev.390"); nextPhase(); }))
      .rejects.toMatchObject({ evidence: { phase: failedPhase, exitCode: 9 } });
    expect(nextPhase).not.toHaveBeenCalled();
    expect(execute.mock.calls.map(call => call[0].phase)).toEqual(failedPhase === "install-predecessor" ? [failedPhase] : ["install-predecessor", failedPhase]);
    await fixture.close();
  });

  it.each([false, true])("preserves publication-time ordering and candidate exclusion for array response %s", async array => {
    const first = { created: "2020-01-01", "0.1.8-dev.1": "2026-01-03" };
    const second = { modified: "2026-01-05", "0.1.8-dev.200": "2026-01-02", "0.1.8-dev.402": "2026-01-04" };
    const stdout = JSON.stringify(array ? [first, second] : { ...first, ...second });
    const fixture = new PredecessorFixture({ execute: async command => result(command, stdout), report() {} });
    expect(await fixture.phase(5000, () => fixture.publishedVersions("0.1.8-dev.402"))).toEqual(["0.1.8-dev.1", "0.1.8-dev.200"]);
    await fixture.close();
  });

  it.each(["PRIVATE_INVALID_JSON", "null", "42", '[[]]', '{"0.1":"not-a-date"}'])("fails closed on malformed registry metadata %s", async stdout => {
    const fixture = new PredecessorFixture({ execute: async command => result(command, stdout), report() {} });
    const error = await fixture.phase(5000, () => fixture.publishedVersions("0.1.8-dev.402")).catch(error => error);
    expect(error).toMatchObject({ evidence: { phase: "registry", error: "INVALID_REGISTRY_METADATA" } });
    expect(error.message).not.toContain("PRIVATE_INVALID_JSON");
    await fixture.close();
  });

  it("waits for cancellation and command closure before removing installation roots", async () => {
    const started = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    let commandClosed = false;
    const remove = vi.fn(async (root: string) => { expect(commandClosed).toBe(true); await rm(root, { recursive: true, force: true }); });
    const fixture = new PredecessorFixture({ remove, report() {}, execute: async command => {
      started.resolve(); await release.promise; commandClosed = true;
      expect(command.signal!.aborted).toBe(true);
      throw new PredecessorCommandError({ ...result(command).evidence, error: "ABORTED" });
    } });
    const pending = fixture.phase(5000, () => fixture.install("fixture.tgz")).catch(error => error);
    await started.promise;
    const roots = fixture.retainedRoots;
    const closing = fixture.close();
    expect(remove).not.toHaveBeenCalled();
    expect(await exists(roots[0]!)).toBe(true);
    release.resolve(); await closing;
    expect(await pending).toMatchObject({ evidence: { error: "ABORTED" } });
    expect(await exists(roots[0]!)).toBe(false);
  });

  it("retains roots on unverified child cleanup without losing the primary command failure", async () => {
    const fixture = new PredecessorFixture({ report() {}, execute: async command => {
      throw new PredecessorCommandError({ ...result(command).evidence, error: "OUTPUT_LIMIT", cleanupError: "CLEANUP_FAILED" });
    } });
    const primary = await fixture.phase(5000, () => fixture.install("fixture.tgz")).catch(error => error);
    const roots = fixture.retainedRoots;
    try {
      await expect(fixture.close()).rejects.toThrow("roots retained");
      expect(primary).toMatchObject({ evidence: { error: "OUTPUT_LIMIT", cleanupError: "CLEANUP_FAILED" } });
      expect(await exists(roots[0]!)).toBe(true);
    } finally { await Promise.all(roots.map(root => rm(root, { recursive: true, force: true }))); }
  });

  it("does not swallow root-removal errors or allow operations after closing", async () => {
    const fixture = new PredecessorFixture({ report() {}, remove: async () => { throw new Error("fixture remove failed"); } });
    const root = await fixture.phase(5000, () => fixture.temporaryRoot("predecessor-remove-control-"));
    try {
      await expect(fixture.close()).rejects.toThrow("failed to remove fixture roots");
      expect(await exists(root)).toBe(true);
      await expect(fixture.phase(5000, () => fixture.install("fixture.tgz"))).rejects.toThrow("closed fixture");
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("expires the shared phase budget while leaving cleanup responsive", async () => {
    const fixture = new PredecessorFixture({ report() {} });
    await expect(fixture.phase(0, signal => new Promise<never>((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("phase expired")), { once: true });
    }))).rejects.toThrow("phase expired");
    await fixture.close();
  });

  it("reports bounded predecessor phase timing without changing its outcome", async () => {
    const report = vi.fn();
    const fixture = new PredecessorFixture({ report });
    const primary = new Error("private-upstream-detail");
    await fixture.phase(5000, async () => {
      expect(await fixture.measure("materialize", "0.1.8-dev.390", async () => "unchanged-result")).toBe("unchanged-result");
      await expect(fixture.measure("warm", "0.1.8-dev.390", async () => { throw primary; })).rejects.toBe(primary);
    });
    expect(report.mock.calls.map(call => call[0].phase)).toEqual(["materialize-start", "materialize", "warm-start", "warm"]);
    expect(report.mock.calls.at(-1)![0].error).toBe("PHASE_FAILED");
    expect(JSON.stringify(report.mock.calls)).not.toContain("private-upstream-detail");
    await fixture.close();
  });

  it("propagates the enclosing cancellation signal without granting a new child deadline", async () => {
    const controller = new AbortController(); controller.abort();
    const execute = vi.fn();
    const fixture = new PredecessorFixture({ execute, report() {} });
    await expect(fixture.phase(5000, () => fixture.install("fixture.tgz"), controller.signal)).rejects.toThrow();
    expect(execute).not.toHaveBeenCalled();
    await fixture.close();
  });
});
