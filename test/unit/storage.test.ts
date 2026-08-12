import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ControlStore } from "../../src/storage/control-store.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("control-store migration", () => {
  it("creates an isolated WAL database and default workspace", async () => {
    const root = await mkdtemp(join(tmpdir(), "addone-store-"));
    roots.push(root);
    const store = new ControlStore(join(root, "state", "control.sqlite3"));
    expect(store.database.prepare("PRAGMA user_version").get()).toMatchObject({ user_version: 2 });
    expect(store.database.prepare("PRAGMA journal_mode").get()).toMatchObject({ journal_mode: "wal" });
    expect(store.loadWorkspace()).toMatchObject({ id: "workspace-default", selectedAgentId: null, agentIds: [] });
    store.close();
  });

  it("transactionally interrupts nonterminal generations from prior supervisor boots", async () => {
    const root = await mkdtemp(join(tmpdir(), "addone-store-reconcile-"));
    roots.push(root);
    const path = join(root, "control.sqlite3");
    const first = new ControlStore(path, "boot-old");
    const now = new Date(0).toISOString();
    const profile = { id: "profile", kind: "native-pi", executable: "pi", arguments: [], cwd: ".", environment: {}, terminalType: "xterm-256color", dimensions: { columns: 80, rows: 24 }, projection: { kind: "native-full-viewport" }, conptyMouseFallback: "none", resume: "none" };
    first.database.prepare("INSERT INTO driver_profiles (id, kind, profile_json, created_at) VALUES (?, ?, ?, ?)").run(profile.id, profile.kind, JSON.stringify(profile), now);
    first.database.prepare("INSERT INTO terminal_agents (id, workspace_id, name, profile_id, profile_json, surface_json, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)")
      .run("agent", "workspace-default", "stale", profile.id, JSON.stringify(profile), now);
    first.database.prepare("INSERT INTO process_generations (id, agent_id, sequence, profile_id, state, capabilities_json, started_at, owner_boot_nonce) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run("generation", "agent", 1, profile.id, "ready", "[]", now, "boot-old");
    first.close();

    const second = new ControlStore(path, "boot-new");
    expect(second.loadAgents()[0]?.currentGeneration).toMatchObject({ state: "interrupted", ownerBootNonce: "boot-old" });
    second.close();
  });
});
