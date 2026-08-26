import { mkdtemp, rm } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { LaunchInstance } from "../../../src/foundation/lifecycle/index.js";
import { ControlStore } from "../../../src/foundation/storage/index.js";
import {
  type ManagedAgentDescriptor,
  type TerminalSessionLaunch,
  type TerminalTopologySnapshot,
} from "../../../src/contracts/workspace/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("control-store migration", () => {
  it("creates an isolated WAL database and default workspace", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-store-"));
    roots.push(root);
    const store = new ControlStore(join(root, "state", "control.sqlite3"));
    expect(store.database.prepare("PRAGMA user_version").get()).toMatchObject({ user_version: 6 });
    expect(store.database.prepare("SELECT schema FROM product_identity").get()).toMatchObject({ schema: "a1-control-store-v1" });
    expect(store.database.prepare("PRAGMA journal_mode").get()).toMatchObject({ journal_mode: "wal" });
    expect(store.database.prepare("SELECT id, selected_agent_id FROM workspaces").get()).toEqual({ id: "workspace-default", selected_agent_id: null });
    store.close();
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

  it("migrates legacy live leases to interrupted history without changing released history", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-legacy-lease-migration-"));
    roots.push(root);
    const path = join(root, "control.sqlite3");
    const first = new ControlStore(path);
    const profileJson = JSON.stringify(transparentProfile());
    const insert = first.database.prepare(`INSERT INTO foreground_terminal_leases
      (id, owner_id, profile_json, state, generation_id, process_identity_json, acquired_at, heartbeat_at, released_at, outcome_json, owner_boot_nonce)
      VALUES (?, 'broker-old', ?, ?, NULL, NULL, ?, NULL, ?, ?, 'boot-old')`);
    insert.run("lease-released", profileJson, "released", new Date(0).toISOString(), new Date(1).toISOString(), JSON.stringify({ kind: "exited", exitCode: 0 }));
    insert.run("lease-live", profileJson, "requested", new Date(2).toISOString(), null, null);
    first.close();

    const legacy = new DatabaseSync(path);
    legacy.exec(`
      DROP TABLE launch_instances;
      CREATE UNIQUE INDEX idx_one_live_foreground_lease ON foreground_terminal_leases((1)) WHERE state IN ('requested', 'active');
      PRAGMA user_version = 4;
    `);
    legacy.close();

    const migrated = new ControlStore(path);
    expect(migrated.database.prepare("SELECT state, outcome_json FROM foreground_terminal_leases WHERE id = ?").get("lease-live"))
      .toMatchObject({ state: "interrupted", outcome_json: expect.stringContaining("legacy-migration") });
    expect(migrated.database.prepare("SELECT state, outcome_json FROM foreground_terminal_leases WHERE id = ?").get("lease-released"))
      .toMatchObject({ state: "released", outcome_json: JSON.stringify({ kind: "exited", exitCode: 0 }) });
    expect(migrated.loadActiveLaunchInstances()).toEqual([]);
    migrated.close();
  });

  it("transactionally interrupts nonterminal generations from prior supervisor boots", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-store-reconcile-"));
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

  it("persists versioned workspace, terminal, topology, and recovery records across restart", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-workspace-store-"));
    roots.push(root);
    const path = join(root, "control.sqlite3");
    const first = new ControlStore(path, "boot-old");
    const agent = workspaceAgent();
    const topology = fourPaneTopology(7);
    const rollback = fourPaneTopology(6);
    first.persistWorkspaceAgent(agent, "2026-08-13T00:00:01.000Z");
    first.saveNativeHostTopology(topology, rollback, "2026-08-13T00:00:02.000Z");
    for (const [index, session] of topology.sessions.entries()) {
      first.persistTerminalSession(session, topology.hostInstanceId, `pane-${index + 1}`, "running", "recovery-1", "2026-08-13T00:00:03.000Z");
    }
    first.persistRecoveryReference({
      kind: "composed-terminal",
      referenceId: "recovery-1",
      agentId: agent.id,
      hostInstanceId: "host-1",
      hostBuildId: "build-1",
      processIdentity: "pid:200:start:2",
      pseudoterminalIdentity: "conpty-1",
      retainedStateIdentity: "surface-state-1",
      topologyRevision: 7,
      streamPosition: 4_096,
    }, "accepted", { contractVersion: 1, previousStatus: "pending", reason: "verified before restart" }, "2026-08-13T00:00:04.000Z");
    first.close();

    const second = new ControlStore(path, "boot-new");
    expect(second.database.prepare("PRAGMA user_version").get()).toMatchObject({ user_version: 6 });
    expect(second.loadWorkspaceAgents()).toEqual([agent]);
    expect(second.loadNativeHostTopology("host-1")?.topology).toEqual(topology);
    expect(second.loadTerminalSessions()).toHaveLength(4);
    expect(second.loadRecoveryReference("recovery-1")).toMatchObject({
      status: "accepted",
      rollback: { contractVersion: 1, previousStatus: "pending", reason: "verified before restart" },
    });
    second.close();
  });

  it("rejects stale host topology revisions while retaining backward-readable rollback metadata", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-topology-store-"));
    roots.push(root);
    const store = new ControlStore(join(root, "control.sqlite3"));
    store.saveNativeHostTopology(fourPaneTopology(8), fourPaneTopology(7));
    expect(() => store.saveNativeHostTopology(fourPaneTopology(7), fourPaneTopology(6))).toThrow(/stale native-host topology/);
    expect(() => store.saveNativeHostTopology(fourPaneTopology(9), fourPaneTopology(10))).toThrow(/rollback revision cannot be newer/);
    const persisted = store.loadNativeHostTopology("host-1");
    expect(persisted?.topology.revision).toBe(8);
    expect(persisted?.rollback).toMatchObject({ contractVersion: 1, topology: { revision: 7 } });
    store.close();
  });

  it("rejects malformed recovery references before persistence", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-recovery-store-"));
    roots.push(root);
    const store = new ControlStore(join(root, "control.sqlite3"));
    const agent = workspaceAgent();
    store.persistWorkspaceAgent(agent);
    expect(() => store.persistRecoveryReference({
      kind: "structured",
      referenceId: "recovery-structured",
      agentId: agent.id,
      adapterId: "adapter.synthetic",
      processIdentity: "pid:100:start:1",
      ownershipProof: "",
      boundary: { kind: "position", position: 3, resumeToken: "resume-3" },
    }, "pending", {})).toThrow(/ownership proof/);
    expect(store.loadRecoveryReference("recovery-structured")).toBeNull();
    store.close();
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

  it("rolls an interrupted v3 migration back to the previous schema state", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-migration-rollback-"));
    roots.push(root);
    const store = new ControlStore(join(root, "control.sqlite3"));
    store.database.prepare("PRAGMA user_version = 2").run();
    store.database.exec("BEGIN IMMEDIATE");
    try {
      store.database.exec("CREATE TABLE migration_workspace_agents (id TEXT PRIMARY KEY)");
      store.database.prepare("INSERT INTO migration_workspace_agents (id) VALUES ('kept')").run();
      throw new Error("simulated interrupted migration");
    } catch {
      store.database.exec("ROLLBACK");
    }
    expect(store.database.prepare("PRAGMA user_version").get()).toMatchObject({ user_version: 2 });
    expect(store.database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migration_workspace_agents'").all()).toEqual([]);
    store.close();
  });
});

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

function transparentProfile() {
  return {
    id: "profile-transparent", terminalCapability: "transparent" as const, executable: "pi", arguments: [], cwd: ".", environment: {},
    terminalType: "xterm-256color", dimensions: { columns: 80, rows: 24 }, ownerDisconnect: "stop" as const,
    recovery: "none" as const, surface: "none" as const, visualReconnection: "none" as const,
  };
}

function workspaceAgent(): ManagedAgentDescriptor {
  return {
    id: "agent-1",
    displayName: "Research",
    adapterId: "adapter.synthetic",
    runtime: "composed-terminal",
    lifecycle: "ready",
    capability: {
      kind: "composed-terminal",
      protocolVersion: 1,
      hostInstanceId: "host-1",
      topologyRevision: 7,
      proofStatus: "pending",
    },
    createdAt: "2026-08-13T00:00:00.000Z",
    recoveryReferenceId: "recovery-1",
  };
}

function fourPaneTopology(revision: number): TerminalTopologySnapshot {
  const pane = (id: string, sessionId: string) => ({ id, sessionId });
  const leaf = (id: string, paneId: string) => ({ id, kind: "leaf" as const, paneId });
  const session = (id: string): TerminalSessionLaunch => ({
    id,
    executable: "C:\\Windows\\System32\\cmd.exe",
    arguments: ["/d", "/q"],
    cwd: "C:\\work",
    environment: { A1_PANE_ID: id },
    dimensions: { columns: 80, rows: 24, widthPixels: 640, heightPixels: 480 },
    inactivity: "live-unpainted",
  });
  return {
    hostInstanceId: "host-1",
    revision,
    windows: [{
      id: "window-1",
      activeTabId: "tab-1",
      tabs: [{
        id: "tab-1",
        rootNodeId: "root",
        focusedPaneId: "pane-1",
        panes: [pane("pane-1", "session-1"), pane("pane-2", "session-2"), pane("pane-3", "session-3"), pane("pane-4", "session-4")],
        nodes: [
          { id: "root", kind: "split", axis: "horizontal", ratio: 0.5, first: "left", second: "right" },
          { id: "left", kind: "split", axis: "vertical", ratio: 0.5, first: "leaf-1", second: "leaf-2" },
          { id: "right", kind: "split", axis: "vertical", ratio: 0.5, first: "leaf-3", second: "leaf-4" },
          leaf("leaf-1", "pane-1"),
          leaf("leaf-2", "pane-2"),
          leaf("leaf-3", "pane-3"),
          leaf("leaf-4", "pane-4"),
        ],
      }],
    }],
    sessions: [session("session-1"), session("session-2"), session("session-3"), session("session-4")],
  };
}
