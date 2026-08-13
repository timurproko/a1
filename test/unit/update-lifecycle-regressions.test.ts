import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { selectCohortLaunch } from "../../src/cohort-selection.js";
import { CohortStateStore, emptyState, type CohortState } from "../../src/cohort-state.js";
import type { MaterializedRelease } from "../../src/release-store.js";
import { ControlStore } from "../../src/storage/control-store.js";
import { runSelfUpdate, type UpdateOutput, type UpdateProcessRunner } from "../../src/update.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("observed immediate-update lifecycle regressions", () => {
  it("releases generic owned package resources before npm replacement", async () => {
    const capture = captureOutput();
    let unlocked = false;
    const runner: UpdateProcessRunner = async (_command, arguments_) => {
      if (arguments_[0] === "view") return { code: 0, stdout: "1.1.0\n" };
      if (arguments_[0] === "root") return { code: 0, stdout: resolve("fixtures", "global") + "\n" };
      return unlocked ? { code: 0, stdout: "installed" } : { code: 32, stdout: "EBUSY: resource busy or locked, copyfile 'runtime-resource'" };
    };

    const code = await runSelfUpdate({
      packageRoot: resolve("fixtures", "global", "@timurproko", "addone"),
      fileSystem: {
        readFile: async () => JSON.stringify({ version: "1.0.0" }),
        realpath: async path => resolve(path),
      },
      lifecycle: {
        targetIsActive: async () => false,
        shutdownVerifiedOwners: async () => ({ priorActiveVersion: "1.0.0" }),
        verifyPackageUnlocked: async () => { unlocked = true; },
        activateInstalled: async () => {},
      },
      output: capture.output,
      runner,
    });

    expect(code).toBe(0);
    expect(capture.stderr.join("")).not.toMatch(/EBUSY|manual fallback/i);
  });

  it("reconciles prior-boot nonterminal generations before they can become live blockers", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "addone-stale-generation-regression-"));
    roots.push(root);
    const path = resolve(root, "control.sqlite3");
    seedReadyGeneration(path);

    const reopened = new ControlStore(path, "boot-new");
    const generation = reopened.database.prepare("SELECT state, owner_boot_nonce FROM process_generations WHERE id = ?").get("generation-stale");
    reopened.close();

    expect(generation).toEqual({ state: "interrupted", owner_boot_nonce: null });
  });

  it.fails("does not restart an old cohort solely because its dead owner left generation rows", () => {
    const old = release("1.0.0", "a");
    const candidate = release("1.1.0", "b");
    const decision = selectCohortLaunch(candidate, pendingState(old, candidate), null, "dead");

    expect(decision).toMatchObject({ action: "activate-candidate", releaseId: candidate.releaseId });
  });

  it.fails("does not leave an installed maintenance-mode candidate pending until state-directory deletion", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "addone-pending-candidate-regression-"));
    roots.push(root);
    const old = release("1.0.0", "c");
    const candidate = release("1.1.0", "d");
    const store = new CohortStateStore(root);
    await store.recordCandidate(old);
    await store.approve(old.releaseId, "old.json");
    await store.activate(old.releaseId);
    await store.recordCandidate(candidate);

    expect((await store.read()).references.active).toBe(candidate.releaseId);
  });
});

function seedReadyGeneration(path: string): void {
  const store = new ControlStore(path);
  const now = new Date(0).toISOString();
  const profile = {
    id: "profile-stale", kind: "native-pi", executable: "pi", arguments: [], cwd: ".", environment: {}, terminalType: "xterm-256color",
    dimensions: { columns: 80, rows: 24 }, resume: "none",
  };
  store.database.prepare("INSERT INTO driver_profiles (id, kind, profile_json, created_at) VALUES (?, ?, ?, ?)").run(profile.id, profile.kind, JSON.stringify(profile), now);
  store.database.prepare("INSERT INTO terminal_agents (id, workspace_id, name, profile_id, profile_json, surface_json, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)")
    .run("agent-stale", "workspace-default", "stale", profile.id, JSON.stringify(profile), now);
  store.database.prepare("INSERT INTO process_generations (id, agent_id, sequence, profile_id, state, capabilities_json, started_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run("generation-stale", "agent-stale", 1, profile.id, "ready", JSON.stringify(["process-stop"]), now);
  store.database.prepare("UPDATE workspaces SET selected_agent_id = ? WHERE id = ?").run("agent-stale", "workspace-default");
  store.close();
}

function pendingState(old: MaterializedRelease, candidate: MaterializedRelease): CohortState {
  const record = (value: MaterializedRelease, approval: "candidate" | "approved") => ({
    releaseId: value.releaseId, releaseRoot: value.releaseRoot, packageVersion: value.packageVersion, contentDigest: value.contentDigest,
    approval, materializedAt: new Date(0).toISOString(), certifiedAt: approval === "approved" ? new Date(0).toISOString() : null, diagnosticsPath: null,
  } as const);
  return {
    ...emptyState(),
    releases: { [old.releaseId]: record(old, "approved"), [candidate.releaseId]: record(candidate, "candidate") },
    references: { active: old.releaseId, pending: candidate.releaseId, approved: old.releaseId, rollback: null, retention: [old.releaseId, candidate.releaseId] },
  };
}

function release(version: string, seed: string): MaterializedRelease {
  const digest = seed.repeat(64);
  return {
    packageName: "@timurproko/addone", packageVersion: version, contentDigest: digest, releaseId: `${version}-${digest.slice(0, 20)}`,
    packageRoot: `/package/${version}`, releaseRoot: `/data/releases/${version}`,
    files: [{ path: "bin/addone-ui.js", bytes: 1, sha256: "0".repeat(64), executable: true }],
  };
}

function captureOutput(): { output: UpdateOutput; stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    output: { stdout: message => stdout.push(message), stderr: message => stderr.push(message) },
    stdout,
    stderr,
  };
}
