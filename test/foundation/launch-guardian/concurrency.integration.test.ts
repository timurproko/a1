import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LaunchInstanceOutcome, LaunchProfileId, NativeProcessIdentity } from "../../../src/foundation/lifecycle/index.js";
import { runLaunchGuardian } from "../../../src/foundation/launch-guardian/index.js";
import type { MaterializedRelease } from "../../../src/foundation/release/index.js";
import type { NativeProcessInspector, ProcessContainment } from "../../../src/foundation/process-containment/index.js";
import { ControlStore } from "../../../src/foundation/storage/index.js";
import { SupervisorServer } from "../../../src/foundation/supervision/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("concurrent launch guardians", () => {
  it("runs same-profile and mixed-profile instances and completes them independently", async () => {
    const harness = await createHarness();
    const first = launch(harness, "a1", 9101);
    const second = launch(harness, "sandbox", 9102);
    const third = launch(harness, "sandbox", 9103);
    await vi.waitFor(() => expect(harness.store.loadActiveLaunchInstances()).toHaveLength(3));
    expect(harness.store.loadActiveLaunchInstances().map(instance => instance.profileId).sort()).toEqual(["a1", "sandbox", "sandbox"]);

    second.finish({ kind: "exited", exitCode: 2 });
    await expect(second.result).resolves.toBe(2);
    expect(harness.store.loadActiveLaunchInstances()).toHaveLength(2);

    first.finish({ kind: "exited", exitCode: 0 });
    await expect(first.result).resolves.toBe(0);
    expect(harness.store.loadActiveLaunchInstances()).toHaveLength(1);

    third.finish({ kind: "exited", exitCode: 3 });
    await expect(third.result).resolves.toBe(3);
    expect(harness.store.loadActiveLaunchInstances()).toEqual([]);
    await harness.server.close();
  });

  it("launches sandbox normally after migrating a stale exclusive lease", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-stale-sandbox-launch-"));
    roots.push(root);
    const databasePath = resolve(root, "control.sqlite3");
    const initial = new ControlStore(databasePath);
    initial.database.prepare(`INSERT INTO foreground_terminal_leases
      (id, owner_id, profile_json, state, generation_id, process_identity_json, acquired_at, heartbeat_at, released_at, outcome_json, owner_boot_nonce)
      VALUES ('stale-lease', 'dead-broker', '{}', 'active', 'old-generation', '{"pid":27708,"startIdentity":"old"}', ?, ?, NULL, NULL, 'old-boot')`)
      .run(new Date(0).toISOString(), new Date(0).toISOString());
    initial.close();
    const legacy = new DatabaseSync(databasePath);
    legacy.exec(`DROP TABLE launch_instances; CREATE UNIQUE INDEX idx_one_live_foreground_lease ON foreground_terminal_leases((1)) WHERE state IN ('requested', 'active'); PRAGMA user_version = 4;`);
    legacy.close();

    const harness = await createHarness(root, databasePath);
    const sandbox = launch(harness, "sandbox", 9201);
    await vi.waitFor(() => expect(harness.store.loadActiveLaunchInstances()).toHaveLength(1));
    expect(harness.store.database.prepare("SELECT state FROM foreground_terminal_leases WHERE id = 'stale-lease'").get()).toEqual({ state: "interrupted" });
    sandbox.finish({ kind: "exited", exitCode: 0 });
    await expect(sandbox.result).resolves.toBe(0);
    await harness.server.close();
  });
});

function launch(harness: Awaited<ReturnType<typeof createHarness>>, profileId: LaunchProfileId, pid: number) {
  let finish!: (outcome: LaunchInstanceOutcome) => void;
  const outcome = new Promise<LaunchInstanceOutcome>(resolvePromise => { finish = resolvePromise; });
  const rootIdentity = { pid, startIdentity: `${pid}:root` };
  const containment: ProcessContainment = {
    identity: { provider: "test", token: `scope-${pid}` },
    spawn: vi.fn(async () => ({ identity: rootIdentity, outcome })),
    contains: vi.fn(async identity => identity.startIdentity === rootIdentity.startIdentity),
    stop: vi.fn(async () => undefined),
    waitForEmpty: vi.fn(async () => true),
    close: vi.fn(async () => undefined),
  };
  const inspector: NativeProcessInspector = {
    observe: vi.fn(async observedPid => ({ pid: observedPid, startIdentity: `${observedPid}:guardian` })),
    matches: vi.fn(async () => true),
  };
  const result = runLaunchGuardian({
    profileId,
    releaseRoot: "/release",
    uiEntry: "/release/bin/ui.js",
    environment: { A1_ENDPOINT: harness.paths.endpoint, A1_RELEASE_ID: "release-1" },
    helperPath: "fixture-helper",
    containment,
    inspector,
    ensureHelper: async () => undefined,
  });
  return { result, finish };
}

async function createHarness(existingRoot?: string, existingDatabasePath?: string) {
  const root = existingRoot ?? await mkdtemp(resolve(tmpdir(), "a1-concurrent-guardian-"));
  if (!existingRoot) roots.push(root);
  const runtimeDir = resolve(root, "runtime");
  const endpoint = process.platform === "win32" ? `\\\\.\\pipe\\a1-concurrent-${process.pid}-${randomUUID()}` : resolve(runtimeDir, "supervisor.sock");
  const paths = {
    configDir: resolve(root, "config"), dataDir: root, runtimeDir, databasePath: existingDatabasePath ?? resolve(root, "control.sqlite3"),
    endpoint, endpointMetadataPath: resolve(runtimeDir, "supervisor.json"), supervisorLogPath: resolve(runtimeDir, "supervisor.log"),
  };
  const store = new ControlStore(paths.databasePath, "boot-current");
  const server = new SupervisorServer(store, paths, release(), "boot-current", vi.fn(), 25, 100);
  await server.listen();
  return { root, paths, store, server };
}

function release(): MaterializedRelease {
  const digest = "f".repeat(64);
  return {
    packageName: "@timurproko/a1", packageVersion: "1.0.0", contentDigest: digest,
    releaseId: `1.0.0-${digest.slice(0, 20)}`, packageRoot: "/package", releaseRoot: "/release", files: [],
  };
}
