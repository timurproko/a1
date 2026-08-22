import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LaunchInstance, LaunchProfileId } from "../../../src/foundation/lifecycle/index.js";
import type { MaterializedRelease } from "../../../src/foundation/release/index.js";
import { ControlStore } from "../../../src/foundation/storage/index.js";
import { SupervisorServer } from "../../../src/foundation/supervision/index.js";
import { SupervisorClient } from "../../../src/foundation/protocol/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("plural launch-instance supervision", () => {
  it("tracks several authenticated owners and completes them independently", async () => {
    const harness = await createHarness();
    const first = new SupervisorClient();
    const second = new SupervisorClient();
    await first.connect(harness.paths.endpoint);
    await second.connect(harness.paths.endpoint);

    await expect(first.command(createCommand("create-1", "instance-1", "a1"))).resolves.toMatchObject({ ok: true });
    await expect(second.command(createCommand("create-2", "instance-2", "sandbox"))).resolves.toMatchObject({ ok: true });
    await expect(first.command(createCommand("create-1-repeat", "instance-1", "a1"))).resolves.toMatchObject({ ok: true });
    await expect(second.command({
      type: "activate-launch-instance", requestId: "wrong-owner", instanceId: "instance-1",
      rootIdentity: { pid: 4001, startIdentity: "4001:start" }, containmentIdentity: { provider: "test", token: "scope-1" },
    })).resolves.toMatchObject({ ok: false, error: { code: "ownership-error" } });

    await expect(first.command({
      type: "activate-launch-instance", requestId: "activate-1", instanceId: "instance-1",
      rootIdentity: { pid: 4001, startIdentity: "4001:start" }, containmentIdentity: { provider: "test", token: "scope-1" },
    })).resolves.toMatchObject({ ok: true });
    await expect(second.command({
      type: "activate-launch-instance", requestId: "activate-2", instanceId: "instance-2",
      rootIdentity: { pid: 4002, startIdentity: "4002:start" }, containmentIdentity: { provider: "test", token: "scope-2" },
    })).resolves.toMatchObject({ ok: true });

    await vi.waitFor(async () => {
      const metadata = JSON.parse(await readFile(harness.paths.endpointMetadataPath, "utf8"));
      expect(metadata.ownership).toMatchObject({
        state: "busy",
        liveInstanceIds: ["instance-1", "instance-2"],
        nonResumableInstanceIds: ["instance-1", "instance-2"],
      });
    });

    await expect(first.command({
      type: "complete-launch-instance", requestId: "complete-1", instanceId: "instance-1",
      terminalState: "completed", outcome: { kind: "exited", exitCode: 0 },
    })).resolves.toMatchObject({ ok: true });
    expect(harness.store.loadActiveLaunchInstances().map(instance => instance.id)).toEqual(["instance-2"]);

    first.close();
    second.close();
    await harness.server.close();
  });

  it("reconciles only instances owned by a disconnected socket", async () => {
    const harness = await createHarness();
    const owner = new SupervisorClient();
    const other = new SupervisorClient();
    await owner.connect(harness.paths.endpoint);
    await other.connect(harness.paths.endpoint);
    await owner.command(createCommand("create-owner", "instance-owner", "pi"));
    await other.command(createCommand("create-other", "instance-other", "sandbox"));

    owner.close();
    await vi.waitFor(() => expect(harness.store.loadLaunchInstance("instance-owner")?.state).toBe("interrupted"));
    expect(harness.store.loadLaunchInstance("instance-other")?.state).toBe("requested");

    other.close();
    await harness.server.close();
  });

  it("reconciles each disconnected instance single-flight without globally serializing siblings", async () => {
    const harness = await createHarness();
    const owner = new SupervisorClient();
    await owner.connect(harness.paths.endpoint);
    await owner.command(createCommand("create-live-race", "instance-live-race", "pi"));
    await owner.command({
      type: "activate-launch-instance", requestId: "activate-live-race", instanceId: "instance-live-race",
      rootIdentity: { pid: process.pid, startIdentity: `${process.pid}:test-live-race` },
      containmentIdentity: { provider: "test", token: "scope-live-race" },
    });
    await owner.command(createCommand("create-fast-race", "instance-fast-race", "sandbox"));
    owner.close();

    await vi.waitFor(() => expect(harness.store.loadLaunchInstance("instance-fast-race")?.state).toBe("interrupted"));
    await vi.waitFor(() => expect(harness.store.loadLaunchInstance("instance-live-race")?.state).toBe("active"));
    await vi.waitFor(async () => {
      const metadata = JSON.parse(await readFile(harness.paths.endpointMetadataPath, "utf8"));
      expect(metadata.ownership.uncertainInstanceIds).toEqual(["instance-live-race"]);
    });
    await harness.server.close();
  });

  it("preserves a live uncertain process without blocking another launch", async () => {
    const harness = await createHarness();
    const owner = new SupervisorClient();
    const next = new SupervisorClient();
    await owner.connect(harness.paths.endpoint);
    await next.connect(harness.paths.endpoint);
    await owner.command(createCommand("create-live", "instance-live", "pi"));
    await owner.command({
      type: "activate-launch-instance", requestId: "activate-live", instanceId: "instance-live",
      rootIdentity: { pid: process.pid, startIdentity: `${process.pid}:test-live` },
      containmentIdentity: { provider: "test", token: "scope-live" },
    });
    owner.close();
    await vi.waitFor(async () => {
      const metadata = JSON.parse(await readFile(harness.paths.endpointMetadataPath, "utf8"));
      expect(metadata.ownership).toMatchObject({ state: "blocked", uncertainInstanceIds: ["instance-live"] });
    });

    await expect(next.command(createCommand("create-next", "instance-next", "a1"))).resolves.toMatchObject({ ok: true });
    expect(harness.store.loadLaunchInstance("instance-live")?.state).toBe("active");
    expect(harness.store.loadLaunchInstance("instance-next")?.state).toBe("requested");

    next.close();
    await harness.server.close();
  });

  it("fans update shutdown out and waits for every active instance outcome", async () => {
    const harness = await createHarness();
    const first = new SupervisorClient();
    const second = new SupervisorClient();
    await first.connect(harness.paths.endpoint);
    await second.connect(harness.paths.endpoint);
    await first.command(createCommand("create-update-1", "instance-update-1", "a1"));
    await second.command(createCommand("create-update-2", "instance-update-2", "sandbox"));
    await first.command({
      type: "activate-launch-instance", requestId: "activate-update-1", instanceId: "instance-update-1",
      rootIdentity: { pid: 5001, startIdentity: "5001:start" }, containmentIdentity: { provider: "test", token: "scope-update-1" },
    });
    await second.command({
      type: "activate-launch-instance", requestId: "activate-update-2", instanceId: "instance-update-2",
      rootIdentity: { pid: 5002, startIdentity: "5002:start" }, containmentIdentity: { provider: "test", token: "scope-update-2" },
    });
    const stopped: string[] = [];
    for (const client of [first, second]) {
      client.on("stopIntent", intent => {
        stopped.push(intent.instanceId);
        void client.command({
          type: "begin-launch-instance-stop", requestId: `begin-${intent.instanceId}`, instanceId: intent.instanceId, reason: "update",
        }).then(async () => await client.command({
          type: "complete-launch-instance", requestId: `complete-${intent.instanceId}`, instanceId: intent.instanceId,
          terminalState: "completed", outcome: { kind: "stopped", reason: "update" },
        }));
      });
    }

    await expect(harness.server.close(true)).resolves.toBeUndefined();
    expect(stopped.sort()).toEqual(["instance-update-1", "instance-update-2"]);
  });

  it("reconciles stale prior-boot instance ownership before endpoint publication", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-stale-launch-supervisor-"));
    roots.push(root);
    const databasePath = resolve(root, "control.sqlite3");
    const oldStore = new ControlStore(databasePath, "boot-old");
    oldStore.createLaunchInstance(launchInstance("instance-live", "client-old", "pi"));
    oldStore.close();
    const reopenedStore = new ControlStore(databasePath, "boot-reopened");
    expect(reopenedStore.loadActiveLaunchInstances()).toEqual([]);
    expect(reopenedStore.loadLaunchInstance("instance-live")).toMatchObject({ state: "interrupted" });
    reopenedStore.close();
  });
});

function createCommand(requestId: string, instanceId: string, profileId: LaunchProfileId) {
  return {
    type: "create-launch-instance" as const,
    requestId,
    instanceId,
    profileId,
    shutdownPolicy: "terminate-tree-on-close" as const,
    guardianIdentity: { pid: instanceId === "instance-2" ? 3002 : 3001, startIdentity: `${instanceId}:guardian` },
  };
}

function launchInstance(id: string, ownerClientId: string, profileId: LaunchProfileId): LaunchInstance {
  return {
    id,
    ownerClientId,
    profileId,
    state: "requested",
    shutdownPolicy: "terminate-tree-on-close",
    guardianIdentity: { pid: 3001, startIdentity: "3001:guardian" },
    rootIdentity: null,
    containmentIdentity: null,
    createdAt: "2026-08-21T20:00:00.000Z",
    activatedAt: null,
    stoppingAt: null,
    completedAt: null,
    outcome: null,
  };
}

async function createHarness() {
  const root = await mkdtemp(resolve(tmpdir(), "a1-launch-supervisor-"));
  roots.push(root);
  const runtimeDir = resolve(root, "runtime");
  const endpoint = process.platform === "win32" ? `\\\\.\\pipe\\a1-launch-${process.pid}-${randomUUID()}` : resolve(runtimeDir, "supervisor.sock");
  const paths = {
    configDir: resolve(root, "config"), dataDir: root, runtimeDir, databasePath: resolve(root, "control.sqlite3"),
    endpoint,
    endpointMetadataPath: resolve(runtimeDir, "supervisor.json"), supervisorLogPath: resolve(runtimeDir, "supervisor.log"),
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
