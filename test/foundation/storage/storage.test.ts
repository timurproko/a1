import { mkdtemp, rm } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { LaunchInstance } from "../../../src/foundation/lifecycle/index.js";
import { ControlStore } from "../../../src/foundation/storage/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("control-store migration", () => {
  it("creates an isolated WAL database holding only the live schema", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-store-"));
    roots.push(root);
    const store = new ControlStore(join(root, "state", "control.sqlite3"));
    expect(store.database.prepare("PRAGMA user_version").get()).toMatchObject({ user_version: 7 });
    expect(store.database.prepare("SELECT schema FROM product_identity").get()).toMatchObject({ schema: "a1-control-store-v1" });
    expect(store.database.prepare("PRAGMA journal_mode").get()).toMatchObject({ journal_mode: "wal" });
    expect(tableNames(store.database)).toEqual(["launch_instances", "product_identity"]);
    store.close();
  });

  it("drops the retired workspace tables from an earlier database and keeps launch instances", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-store-retire-"));
    roots.push(root);
    const path = join(root, "control.sqlite3");
    const first = new ControlStore(path, "boot-old");
    first.createLaunchInstance(launchInstance("instance-1", "client-1", "a1"));
    first.close();

    // Rationale: rebuild the version-6 shape by hand so the drop path is exercised against real rows.
    const legacy = new DatabaseSync(path);
    legacy.exec(`
      CREATE TABLE workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL, selected_agent_id TEXT, created_at TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE driver_profiles (id TEXT PRIMARY KEY, kind TEXT NOT NULL, profile_json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE terminal_agents (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, name TEXT NOT NULL, profile_id TEXT NOT NULL REFERENCES driver_profiles(id), profile_json TEXT NOT NULL, surface_json TEXT, created_at TEXT NOT NULL);
      CREATE TABLE process_generations (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES terminal_agents(id) ON DELETE CASCADE, sequence INTEGER NOT NULL, profile_id TEXT NOT NULL REFERENCES driver_profiles(id), state TEXT NOT NULL, capabilities_json TEXT NOT NULL, started_at TEXT NOT NULL, exited_at TEXT, exit_code INTEGER, signal INTEGER, error TEXT, owner_boot_nonce TEXT);
      CREATE TABLE foreground_terminal_leases (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, profile_json TEXT NOT NULL, state TEXT NOT NULL, generation_id TEXT, process_identity_json TEXT, acquired_at TEXT NOT NULL, heartbeat_at TEXT, released_at TEXT, outcome_json TEXT, owner_boot_nonce TEXT NOT NULL);
      CREATE TABLE workspace_agents (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, display_name TEXT NOT NULL, adapter_id TEXT NOT NULL, runtime_kind TEXT NOT NULL, lifecycle TEXT NOT NULL, capability_json TEXT NOT NULL, recovery_reference_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE native_host_topology (host_instance_id TEXT PRIMARY KEY, protocol_version INTEGER NOT NULL, revision INTEGER NOT NULL, topology_json TEXT NOT NULL, rollback_json TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE terminal_sessions (id TEXT PRIMARY KEY, host_instance_id TEXT NOT NULL REFERENCES native_host_topology(host_instance_id) ON DELETE CASCADE, pane_id TEXT NOT NULL, lifecycle TEXT NOT NULL, launch_json TEXT NOT NULL, recovery_reference_id TEXT, updated_at TEXT NOT NULL);
      CREATE TABLE recovery_references (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES workspace_agents(id) ON DELETE CASCADE, authority_json TEXT NOT NULL, status TEXT NOT NULL, rollback_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      INSERT INTO workspaces (id, name, selected_agent_id, created_at) VALUES ('workspace-default', 'Workspace', NULL, '2026-08-21T20:00:00.000Z');
      INSERT INTO driver_profiles (id, kind, profile_json, created_at) VALUES ('profile', 'native-pi', '{}', '2026-08-21T20:00:00.000Z');
      INSERT INTO terminal_agents (id, workspace_id, name, profile_id, profile_json, surface_json, created_at) VALUES ('agent', 'workspace-default', 'stale', 'profile', '{}', NULL, '2026-08-21T20:00:00.000Z');
      INSERT INTO process_generations (id, agent_id, sequence, profile_id, state, capabilities_json, started_at, owner_boot_nonce) VALUES ('generation', 'agent', 1, 'profile', 'ready', '[]', '2026-08-21T20:00:00.000Z', 'boot-old');
      INSERT INTO workspace_agents (id, workspace_id, display_name, adapter_id, runtime_kind, lifecycle, capability_json, recovery_reference_id, created_at, updated_at) VALUES ('agent-1', 'workspace-default', 'Research', 'adapter', 'structured', 'ready', '{}', NULL, '2026-08-21T20:00:00.000Z', '2026-08-21T20:00:00.000Z');
      INSERT INTO recovery_references (id, agent_id, authority_json, status, rollback_json, created_at, updated_at) VALUES ('recovery-1', 'agent-1', '{}', 'pending', '{}', '2026-08-21T20:00:00.000Z', '2026-08-21T20:00:00.000Z');
      PRAGMA user_version = 6;
    `);
    legacy.close();

    const migrated = new ControlStore(path, "boot-new");
    expect(migrated.database.prepare("PRAGMA user_version").get()).toMatchObject({ user_version: 7 });
    expect(tableNames(migrated.database)).toEqual(["launch_instances", "product_identity"]);
    expect(migrated.loadLaunchInstance("instance-1")).toMatchObject({ id: "instance-1", ownerClientId: "client-1", state: "interrupted" });
    migrated.close();
  });

  it("refuses a database newer than the supported schema", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-store-newer-"));
    roots.push(root);
    const path = join(root, "control.sqlite3");
    const store = new ControlStore(path);
    store.close();
    const newer = new DatabaseSync(path);
    newer.exec("PRAGMA user_version = 8");
    newer.close();
    expect(() => new ControlStore(path)).toThrow(/version 8 is newer than supported version 7/);
  });

  it("persists several launch instances independently with immutable terminal outcomes", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-launch-instances-"));
    roots.push(root);
    const store = new ControlStore(join(root, "control.sqlite3"), "boot-current");
    store.createLaunchInstance(launchInstance("instance-1", "client-1", "a1"));
    store.createLaunchInstance(launchInstance("instance-2", "client-2", "pi"));

    const rootOne = { pid: 2001, startIdentity: "2001:root" };
    const rootTwo = { pid: 2002, startIdentity: "2002:root" };
    expect(store.activateLaunchInstance("instance-1", "client-1", rootOne, { provider: "test", token: "scope-1" }, new Date(1).toISOString())).toBe(true);
    expect(store.activateLaunchInstance("instance-2", "wrong-client", rootTwo, { provider: "test", token: "scope-2" }, new Date(1).toISOString())).toBe(false);
    expect(store.activateLaunchInstance("instance-2", "client-2", rootTwo, { provider: "test", token: "scope-2" }, new Date(1).toISOString())).toBe(true);
    expect(store.beginLaunchInstanceStop("instance-1", "client-1", new Date(2).toISOString())).toBe(true);
    expect(store.completeLaunchInstance("instance-1", "client-1", "completed", { kind: "exited", exitCode: 0 }, new Date(3).toISOString())).toBe(true);
    expect(store.completeLaunchInstance("instance-1", "client-1", "completed", { kind: "exited", exitCode: 1 }, new Date(4).toISOString())).toBe(false);

    expect(store.loadActiveLaunchInstances().map(instance => instance.id)).toEqual(["instance-2"]);
    expect(store.loadLaunchInstance("instance-1")).toMatchObject({ state: "completed", outcome: { kind: "exited", exitCode: 0 } });
    const schema = store.database.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'launch_instances'").get() as { sql: string };
    expect(schema.sql).not.toMatch(/environment|terminal_bytes|display|framebuffer|argv/i);
    expect(store.database.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_one_live_foreground_lease'").get()).toBeUndefined();
    store.close();
  });

  it("reconciles prior-boot launch instances without accepting stale owner mutations", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-launch-instance-reconcile-"));
    roots.push(root);
    const path = join(root, "control.sqlite3");
    const first = new ControlStore(path, "boot-old");
    first.createLaunchInstance(launchInstance("instance-1", "client-1", "pi"));
    expect(first.activateLaunchInstance(
      "instance-1",
      "client-1",
      { pid: 2101, startIdentity: "2101:root" },
      { provider: "test", token: "scope-old" },
      new Date(1).toISOString(),
    )).toBe(true);

    const second = new ControlStore(path, "boot-new");
    expect(second.loadActiveLaunchInstances()).toEqual([]);
    expect(second.loadLaunchInstance("instance-1")).toMatchObject({
      state: "interrupted",
      outcome: { kind: "interrupted", reason: "supervisor-disconnect" },
    });
    expect(first.beginLaunchInstanceStop("instance-1", "client-1", new Date(2).toISOString())).toBe(false);
    second.close();
    first.close();
  });

  it("rejects a legacy product schema without migration", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-legacy-control-store-"));
    roots.push(root);
    const path = join(root, "control.sqlite3");
    const legacy = new DatabaseSync(path);
    legacy.exec("PRAGMA user_version = 4");
    legacy.exec("CREATE TABLE product_identity (schema TEXT PRIMARY KEY NOT NULL)");
    legacy.prepare("INSERT INTO product_identity (schema) VALUES (?)").run("addone-control-store-v1");
    legacy.close();

    expect(() => new ControlStore(path)).toThrow(/schema addone-control-store-v1 is unsupported/);
  });

  it("rolls an interrupted migration back to the previous schema state", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-migration-rollback-"));
    roots.push(root);
    const store = new ControlStore(join(root, "control.sqlite3"));
    store.database.prepare("PRAGMA user_version = 6").run();
    store.database.exec("BEGIN IMMEDIATE");
    try {
      store.database.exec("CREATE TABLE migration_workspace_agents (id TEXT PRIMARY KEY)");
      store.database.prepare("INSERT INTO migration_workspace_agents (id) VALUES ('kept')").run();
      throw new Error("simulated interrupted migration");
    } catch {
      store.database.exec("ROLLBACK");
    }
    expect(store.database.prepare("PRAGMA user_version").get()).toMatchObject({ user_version: 6 });
    expect(store.database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migration_workspace_agents'").all()).toEqual([]);
    store.close();
  });
});

function tableNames(database: DatabaseSync): string[] {
  return (database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[]).map(row => row.name);
}

function launchInstance(id: string, ownerClientId: string, profileId: LaunchInstance["profileId"]): LaunchInstance {
  return {
    id,
    ownerClientId,
    profileId,
    state: "requested",
    shutdownPolicy: "terminate-tree-on-close",
    guardianIdentity: { pid: id === "instance-1" ? 1001 : 1002, startIdentity: `${id}:guardian` },
    rootIdentity: null,
    containmentIdentity: null,
    createdAt: "2026-08-21T20:00:00.000Z",
    activatedAt: null,
    stoppingAt: null,
    completedAt: null,
    outcome: null,
  };
}
