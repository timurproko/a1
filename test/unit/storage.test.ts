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
    expect(store.database.pragma("user_version", { simple: true })).toBe(1);
    expect(store.database.pragma("journal_mode", { simple: true })).toBe("wal");
    expect(store.loadWorkspace()).toMatchObject({ id: "workspace-default", selectedAgentId: null, agentIds: [] });
    store.close();
  });
});
