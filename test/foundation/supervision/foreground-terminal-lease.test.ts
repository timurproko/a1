import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TransparentTerminalLaunchProfile } from "../../../src/foundation/lifecycle/index.js";
import type { MaterializedRelease } from "../../../src/foundation/release/index.js";
import { ControlStore } from "../../../src/foundation/storage/index.js";
import { SupervisorServer } from "../../../src/foundation/supervision/index.js";
import { SupervisorClient } from "../../../src/foundation/protocol/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("foreground terminal lease supervision", () => {
  it("acquires, activates, heartbeats, and releases one exclusive lease", async () => {
    const harness = await createHarness();
    const client = new SupervisorClient();
    await client.connect(harness.paths.endpoint);
    const profile = transparentProfile();

    await expect(client.command({ type: "acquire-foreground-terminal-lease", requestId: "acquire-1", leaseId: "lease-1", ownerId: "broker-1", profile }))
      .resolves.toMatchObject({ ok: true });
    await expect(client.command({ type: "acquire-foreground-terminal-lease", requestId: "acquire-2", leaseId: "lease-2", ownerId: "broker-2", profile }))
      .resolves.toMatchObject({ ok: false, error: { code: "driver-error", message: expect.stringMatching(/exclusive/) } });

    const processIdentity = { pid: 4001, startIdentity: "4001:start" };
    await expect(client.command({ type: "activate-foreground-terminal-lease", requestId: "activate", leaseId: "lease-1", generationId: "generation-1", processIdentity }))
      .resolves.toMatchObject({ ok: true });
    await expect(client.command({ type: "heartbeat-foreground-terminal-lease", requestId: "wrong-heartbeat", leaseId: "lease-1", processIdentity: { ...processIdentity, startIdentity: "reused" } }))
      .resolves.toMatchObject({ ok: false, error: { message: expect.stringMatching(/ownership mismatch/) } });
    await expect(client.command({ type: "heartbeat-foreground-terminal-lease", requestId: "heartbeat", leaseId: "lease-1", processIdentity }))
      .resolves.toMatchObject({ ok: true });

    const metadata = JSON.parse(await readFile(harness.paths.endpointMetadataPath, "utf8"));
    expect(metadata.ownership).toEqual({ state: "busy", liveGenerationIds: ["generation-1"], nonResumableGenerationIds: ["generation-1"] });

    await expect(client.command({ type: "release-foreground-terminal-lease", requestId: "release", leaseId: "lease-1", processIdentity, outcome: { kind: "exited", exitCode: 0 } }))
      .resolves.toMatchObject({ ok: true });
    expect(harness.store.loadLiveForegroundTerminalLease()).toBeNull();
    client.close();
    await harness.server.close();
  });

  it("reconciles stale prior-boot foreground ownership before endpoint publication", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "addone-stale-foreground-supervisor-"));
    roots.push(root);
    const databasePath = resolve(root, "control.sqlite3");
    const oldStore = new ControlStore(databasePath, "boot-old");
    oldStore.acquireForegroundTerminalLease({
      id: "lease-live", ownerId: "broker", profile: transparentProfile(), state: "requested", generationId: null, processIdentity: null,
      acquiredAt: new Date(0).toISOString(), heartbeatAt: null, releasedAt: null, outcome: null,
    });
    oldStore.close();
    const reopenedStore = new ControlStore(databasePath, "boot-reopened");
    expect(reopenedStore.loadLiveForegroundTerminalLease()).toBeNull();
    expect(reopenedStore.database.prepare("SELECT state FROM foreground_terminal_leases WHERE id = ?").get("lease-live")).toEqual({ state: "released" });
    reopenedStore.close();
  });
});

async function createHarness() {
  const root = await mkdtemp(resolve(tmpdir(), "addone-foreground-supervisor-"));
  roots.push(root);
  const runtimeDir = resolve(root, "runtime");
  const endpoint = process.platform === "win32" ? `\\\\.\\pipe\\addone-foreground-${process.pid}-${randomUUID()}` : resolve(runtimeDir, "supervisor.sock");
  const paths = {
    configDir: resolve(root, "config"), dataDir: root, runtimeDir, databasePath: resolve(root, "control.sqlite3"),
    endpoint,
    endpointMetadataPath: resolve(runtimeDir, "supervisor.json"), supervisorLogPath: resolve(runtimeDir, "supervisor.log"),
  };
  const store = new ControlStore(paths.databasePath, "boot-current");
  const server = new SupervisorServer(store, paths, release(), "boot-current", vi.fn());
  await server.listen();
  return { root, paths, store, server };
}

function transparentProfile(): TransparentTerminalLaunchProfile {
  return {
    id: "profile-transparent", terminalCapability: "transparent", executable: "pi", arguments: [], cwd: ".", environment: {},
    terminalType: "xterm-256color", dimensions: { columns: 80, rows: 24 }, ownerDisconnect: "stop", recovery: "none",
    surface: "none", visualReconnection: "none",
  };
}

function release(): MaterializedRelease {
  const digest = "f".repeat(64);
  return {
    packageName: "@timurproko/a1", packageVersion: "1.0.0", contentDigest: digest,
    releaseId: `1.0.0-${digest.slice(0, 20)}`, packageRoot: "/package", releaseRoot: "/release", files: [],
  };
}
