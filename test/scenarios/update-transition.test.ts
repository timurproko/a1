import { spawn } from "node:child_process";
import { chmod, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { selectCohortLaunch } from "../../src/cohort-selection.js";
import { CohortStateStore, type SupervisorEndpointMetadata } from "../../src/cohort-state.js";
import { cleanupProvenIdleOwner } from "../../src/process-cleanup.js";
import { materializeRelease, verifyMaterializedRelease, type MaterializedRelease } from "../../src/release-store.js";
import { runSelfUpdate, type UpdateLifecycleCoordinator, type UpdateTransactionJournal } from "../../src/update.js";

const cleanupRoots: string[] = [];
afterEach(async () => Promise.all(cleanupRoots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("release-gating N-1 update transitions", () => {
  it("handles idle, busy, stale, failed, rollback, and blocker-exit transitions without duplicate ownership", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "addone-update-transition-"));
    cleanupRoots.push(root);
    const dataDir = resolve(root, "data");
    const artifacts = resolve(root, "artifacts");
    await mkdir(artifacts, { recursive: true });
    const old = await materializeRelease(await fixturePackage(root, "0.1.3", "old"), dataDir);
    const candidate = await materializeRelease(await fixturePackage(root, "0.1.4", "candidate"), dataDir);
    const store = new CohortStateStore(dataDir);
    const assertions: { id: string; passed: boolean }[] = [];

    try {
      await store.recordCandidate(old);
      await store.approve(old.releaseId, "old-certification.json");
      await store.activate(old.releaseId);
      await store.recordCandidate(candidate);

      const busy = metadata(old, process.pid, ["non-resumable-pty"]);
      const busyDecision = selectCohortLaunch(candidate, await store.read(), busy, "live-verified");
      expect(busyDecision).toMatchObject({ action: "launch-retained-ui", releaseId: old.releaseId, recordPending: true });
      expect(busyDecision.reason).not.toMatch(/invalid client message|malformed-message|manual|taskkill|kill -9/i);
      await store.blockPending("busy non-resumable PTY", busy.ownership.liveGenerationIds);
      assertions.push({ id: "busy-pty-defers-with-retained-ui", passed: true });

      const idle = metadata(old, process.pid, []);
      expect(selectCohortLaunch(candidate, await store.read(), idle, "live-verified")).toMatchObject({ action: "replace-idle-cohort" });
      await store.approve(candidate.releaseId, "candidate-certification.json");
      const activated = await store.activate(candidate.releaseId);
      expect(activated.references.active).toBe(candidate.releaseId);
      expect(Object.values(activated.releases).filter(release => release.releaseId === activated.references.active)).toHaveLength(1);
      assertions.push({ id: "blocker-exit-activates-with-single-owner", passed: true });

      expect(selectCohortLaunch(candidate, activated, metadata(old, 2_000_000_000, []), "dead")).toMatchObject({ action: "activate-candidate" });
      assertions.push({ id: "dead-metadata-owner-reconciled", passed: true });

      const sleeper = spawn(process.execPath, ["-e", "setInterval(()=>{},1000)"], { detached: true, stdio: "ignore", windowsHide: true });
      await new Promise<void>((resolvePromise, rejectPromise) => { sleeper.once("spawn", resolvePromise); sleeper.once("error", rejectPromise); });
      sleeper.unref();
      const staleIdle = metadata(old, sleeper.pid!, []);
      const staleDecision = selectCohortLaunch(candidate, activated, staleIdle, "unresponsive");
      expect(staleDecision).toMatchObject({ action: "clean-stale-owner" });
      expect((await cleanupProvenIdleOwner(staleIdle, 500)).terminated).toBe(true);
      assertions.push({ id: "unresponsive-idle-owner-cleaned", passed: true });

      const failedCandidate = await materializeRelease(await fixturePackage(root, "0.1.5", "uncertified"), dataDir);
      await store.recordCandidate(failedCandidate);
      const candidateEntry = resolve(failedCandidate.releaseRoot, "dist/app.js");
      await chmod(candidateEntry, 0o600);
      await writeFile(candidateEntry, "failed candidate");
      await expect(verifyMaterializedRelease(failedCandidate.releaseRoot)).rejects.toThrow(/mismatch/);
      expect((await store.read()).references.active).toBe(candidate.releaseId);
      assertions.push({ id: "failed-candidate-never-selected", passed: true });

      const rolledBack = await store.rollback(true);
      expect(rolledBack.references).toMatchObject({ active: old.releaseId, rollback: candidate.releaseId });
      assertions.push({ id: "rollback-preserves-one-active-release", passed: true });

      await writeFile(resolve(artifacts, "verdict.json"), JSON.stringify({ scenario: "UPDATE-N-1-001", passed: true, assertions, state: rolledBack }, null, 2));
    } catch (error) {
      await writeFile(resolve(artifacts, "verdict.json"), JSON.stringify({ scenario: "UPDATE-N-1-001", passed: false, assertions, error: error instanceof Error ? error.message : String(error), state: await store.read() }, null, 2));
      throw error;
    }
  }, 30_000);

  it.each([
    ["stable", "latest"],
    ["next", "next"],
  ] as const)("uses identical immediate replacement semantics for %s", async (channel, tag) => {
    const root = await mkdtemp(resolve(tmpdir(), `addone-update-${channel}-`));
    cleanupRoots.push(root);
    const packageRoot = resolve(root, "global", "@timurproko", "addone");
    const dataDir = resolve(root, "data");
    await mkdir(packageRoot, { recursive: true });
    await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/addone", version: "1.0.0" }));
    const calls: string[] = [];
    const lifecycle: UpdateLifecycleCoordinator = {
      targetIsActive: async () => false,
      shutdownVerifiedOwners: async target => { calls.push(`shutdown:${target}:owned-ui,supervisor,pty,pi`); return { priorActiveVersion: "1.0.0" }; },
      verifyPackageUnlocked: async () => { calls.push("unlock:conpty.node"); },
      activateInstalled: async (_path, target, phase) => {
        for (const value of ["materialized", "certified", "active-reference-committed"] as const) await phase(value);
        calls.push(`activate:${target}:no-intro`);
      },
    };
    const transaction = memoryTransaction(root);
    const result = await runSelfUpdate({
      packageRoot,
      channel,
      environment: { ADDONE_DATA_DIR: dataDir, ADDONE_RUNTIME_DIR: resolve(root, "runtime") },
      fileSystem: { readFile: async path => await import("node:fs/promises").then(fs => fs.readFile(path, "utf8")), realpath: async path => resolve(path) },
      lifecycle,
      transactionStore: transaction,
      runner: async (_command, arguments_) => {
        calls.push(`npm:${arguments_.join(" ")}`);
        if (arguments_[0] === "view") return { code: 0, stdout: "1.1.0\n" };
        if (arguments_[0] === "root") return { code: 0, stdout: resolve(root, "global") + "\n" };
        return { code: 0, stdout: "installed" };
      },
      output: { stdout: () => {}, stderr: () => {} },
    });

    expect(result).toBe(0);
    expect(calls).toEqual([
      `npm:view @timurproko/addone@${tag} version`,
      "npm:root --global",
      "shutdown:1.1.0:owned-ui,supervisor,pty,pi",
      "unlock:conpty.node",
      "npm:install --global @timurproko/addone@1.1.0",
      "activate:1.1.0:no-intro",
    ]);
    expect(JSON.stringify(calls)).not.toMatch(/taskkill|Remove-Item|release-state deletion|database deletion/i);
  });
});

async function fixturePackage(root: string, version: string, payload: string): Promise<string> {
  const packageRoot = resolve(root, `package-${version}`);
  await mkdir(resolve(packageRoot, "dist"), { recursive: true });
  await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/addone", version, files: ["dist"] }));
  await writeFile(resolve(packageRoot, "dist/app.js"), payload);
  return packageRoot;
}
function memoryTransaction(root: string): UpdateTransactionJournal {
  let value: Awaited<ReturnType<UpdateTransactionJournal["read"]>> = null;
  return {
    path: resolve(root, "update-transaction.json"),
    read: async () => value,
    begin: async input => value ??= { schemaVersion: 1, transactionId: "scenario", ...input, phase: "shutdown-intent", status: "active", error: null, startedAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() },
    advance: async phase => { if (!value) throw new Error("missing transaction"); return value = { ...value, phase }; },
    finish: async (status, error = null) => { if (!value) throw new Error("missing transaction"); return value = { ...value, status, error }; },
    clearCompleted: async () => { if (value?.status !== "active") value = null; },
  };
}

function metadata(release: MaterializedRelease, pid: number, generations: readonly string[]): SupervisorEndpointMetadata {
  return {
    supervisorId: "n-minus-one", endpoint: "isolated-endpoint", pid, pidStartIdentity: `${pid}:fixture`, bootNonce: "fixture-boot", startedAt: new Date(0).toISOString(),
    releaseId: release.releaseId, releaseRoot: release.releaseRoot, contentDigest: release.contentDigest,
    ownership: { state: generations.length ? "busy" : "idle", liveGenerationIds: generations, nonResumableGenerationIds: generations },
    envelope: "addone-control-envelope", envelopeRevision: 1, requiredFeatures: [], optionalFeatures: [], contractDigest: "fixture-contract",
  };
}
