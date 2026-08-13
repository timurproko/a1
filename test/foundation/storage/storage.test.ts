import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ControlStore } from "../../../src/foundation/storage/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("control-store migration", () => {
  it("creates an isolated WAL database and default workspace", async () => {
    const root = await mkdtemp(join(tmpdir(), "addone-store-"));
    roots.push(root);
    const store = new ControlStore(join(root, "state", "control.sqlite3"));
    expect(store.database.prepare("PRAGMA user_version").get()).toMatchObject({ user_version: 2 });
    expect(store.database.prepare("PRAGMA journal_mode").get()).toMatchObject({ journal_mode: "wal" });
    expect(store.database.prepare("SELECT id, selected_agent_id FROM workspaces").get()).toEqual({ id: "workspace-default", selected_agent_id: null });
    store.close();
  });

  it("transactionally persists one exclusive foreground lease lifecycle", async () => {
    const root = await mkdtemp(join(tmpdir(), "addone-foreground-lease-"));
    roots.push(root);
    const store = new ControlStore(join(root, "control.sqlite3"), "boot-current");
    const profile = transparentProfile();
    store.acquireForegroundTerminalLease({
      id: "lease-1", ownerId: "broker-1", profile, state: "requested", generationId: null, processIdentity: null,
      acquiredAt: new Date(0).toISOString(), heartbeatAt: null, releasedAt: null, outcome: null,
    });
    expect(() => store.acquireForegroundTerminalLease({
      id: "lease-2", ownerId: "broker-2", profile, state: "requested", generationId: null, processIdentity: null,
      acquiredAt: new Date(0).toISOString(), heartbeatAt: null, releasedAt: null, outcome: null,
    })).toThrow(/exclusive foreground terminal lease is already live/);

    const identity = { pid: 1234, startIdentity: "1234:start" };
    expect(store.activateForegroundTerminalLease("lease-1", "generation-1", identity, new Date(1).toISOString())).toBe(true);
    expect(store.heartbeatForegroundTerminalLease("lease-1", identity, new Date(2).toISOString())).toBe(true);
    expect(store.heartbeatForegroundTerminalLease("lease-1", { ...identity, startIdentity: "reused" }, new Date(2).toISOString())).toBe(false);
    expect(store.releaseForegroundTerminalLease("lease-1", identity, { kind: "exited", exitCode: 0 }, new Date(3).toISOString())).toBe(true);
    expect(store.loadLiveForegroundTerminalLease()).toBeNull();
    store.close();
  });

  it("reconciles foreground leases from a prior supervisor boot as non-live", async () => {
    const root = await mkdtemp(join(tmpdir(), "addone-stale-foreground-lease-"));
    roots.push(root);
    const path = join(root, "control.sqlite3");
    const first = new ControlStore(path, "boot-old");
    first.acquireForegroundTerminalLease({
      id: "lease-stale", ownerId: "broker-old", profile: transparentProfile(), state: "requested", generationId: null, processIdentity: null,
      acquiredAt: new Date(0).toISOString(), heartbeatAt: null, releasedAt: null, outcome: null,
    });
    first.close();
    const second = new ControlStore(path, "boot-new");
    expect(second.loadLiveForegroundTerminalLease()).toBeNull();
    expect(second.database.prepare("SELECT state, outcome_json FROM foreground_terminal_leases WHERE id = ?").get("lease-stale")).toMatchObject({ state: "released" });
    second.close();
  });

  it("transactionally interrupts nonterminal generations from prior supervisor boots", async () => {
    const root = await mkdtemp(join(tmpdir(), "addone-store-reconcile-"));
    roots.push(root);
    const path = join(root, "control.sqlite3");
    const first = new ControlStore(path, "boot-old");
    const now = new Date(0).toISOString();
    const profile = { id: "profile", kind: "native-pi", executable: "pi", arguments: [], cwd: ".", environment: {}, terminalType: "xterm-256color", dimensions: { columns: 80, rows: 24 }, resume: "none" };
    first.database.prepare("INSERT INTO driver_profiles (id, kind, profile_json, created_at) VALUES (?, ?, ?, ?)").run(profile.id, profile.kind, JSON.stringify(profile), now);
    first.database.prepare("INSERT INTO terminal_agents (id, workspace_id, name, profile_id, profile_json, surface_json, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)")
      .run("agent", "workspace-default", "stale", profile.id, JSON.stringify(profile), now);
    first.database.prepare("INSERT INTO process_generations (id, agent_id, sequence, profile_id, state, capabilities_json, started_at, owner_boot_nonce) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run("generation", "agent", 1, profile.id, "ready", "[]", now, "boot-old");
    first.close();

    const second = new ControlStore(path, "boot-new");
    expect(second.database.prepare("SELECT state, owner_boot_nonce FROM process_generations WHERE id = ?").get("generation"))
      .toEqual({ state: "interrupted", owner_boot_nonce: "boot-old" });
    second.close();
  });
});

function transparentProfile() {
  return {
    id: "profile-transparent", terminalCapability: "transparent" as const, executable: "pi", arguments: [], cwd: ".", environment: {},
    terminalType: "xterm-256color", dimensions: { columns: 80, rows: 24 }, ownerDisconnect: "stop" as const,
    recovery: "none" as const, surface: "none" as const, visualReconnection: "none" as const,
  };
}
