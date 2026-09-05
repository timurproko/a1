import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { SessionManager, type SessionInfo } from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openSelectedPiSession } from "../../../../src/integrations/pi/engine/session-selection.js";

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "a1-session-selection-"));
  roots.push(root);
  const cwd = join(root, "work");
  const other = join(root, "other");
  const store = join(root, "session's store");
  await Promise.all([mkdir(cwd), mkdir(other), mkdir(store)]);
  vi.stubEnv("PI_CODING_AGENT_DIR", join(root, ".a1", "agent"));
  vi.stubEnv("PI_CODING_AGENT_SESSION_DIR", undefined);
  return { root, cwd, other, store };
}

async function save(path: string, cwd: string, id = "saved-id") {
  await writeFile(path, [
    { type: "session", version: 3, id, timestamp: "2026-01-01T00:00:00Z", cwd },
    { type: "message", id: "u1", parentId: null, timestamp: "2026-01-01T00:00:01Z", message: { role: "user", content: `history-${id}`, timestamp: 1 } },
  ].map(entry => JSON.stringify(entry)).join("\n") + "\n");
}

function api() {
  return {
    list: vi.fn<typeof SessionManager.list>(),
    listAll: vi.fn<typeof SessionManager.listAll>(),
    open: vi.fn(SessionManager.open.bind(SessionManager)),
    forkFrom: vi.fn(SessionManager.forkFrom.bind(SessionManager)),
  };
}

describe("public CLI session selection (Pi 0.84.2 oracle)", () => {
  it("opens relative files from invoking cwd and preserves header cwd and identity", async () => {
    const { cwd, other } = await fixture();
    const path = join(cwd, "saved.jsonl");
    await save(path, other);
    const manager = await openSelectedPiSession({ cwd, selection: { target: "./saved.jsonl" } });
    expect(manager.getSessionFile()).toBe(path);
    expect(manager.getCwd()).toBe(other);
    expect(manager.getSessionId()).toBe("saved-id");
    expect(manager.buildSessionContext().messages).toMatchObject([{ role: "user", content: "history-saved-id" }]);
  });

  it("uses real custom-store filtering, explicit precedence, and environment fallback", async () => {
    const { root, cwd, other, store } = await fixture();
    await save(join(store, "local.jsonl"), cwd, "local-id");
    await save(join(store, "foreign.jsonl"), other, "foreign-id");
    vi.stubEnv("PI_CODING_AGENT_SESSION_DIR", join(root, "wrong-store"));
    const selected = await openSelectedPiSession({ cwd: root, selection: { target: join(store, "local.jsonl"), sessionDir: "session's store" } });
    expect(selected.getSessionDir()).toBe(store);
    const local = await openSelectedPiSession({ cwd, selection: { target: "local", sessionDir: store } });
    expect(local.getSessionId()).toBe("local-id");
    vi.stubEnv("PI_CODING_AGENT_SESSION_DIR", store);
    expect((await openSelectedPiSession({ cwd, selection: { target: "local" } })).getSessionId()).toBe("local-id");
    const forkPrompt = vi.fn(async () => false);
    await expect(openSelectedPiSession({ cwd, selection: { target: "foreign" }, forkPrompt })).rejects.toMatchObject({ exitCode: 0 });
    expect(forkPrompt).toHaveBeenCalledExactlyOnceWith({ sourceCwd: other });
  });

  it("uses the selected A1 profile for default lookup and never falls back to Pi", async () => {
    const { root, cwd } = await fixture();
    const manager = SessionManager.create(cwd);
    await save(manager.getSessionFile()!, cwd, "default-id");
    expect((await openSelectedPiSession({ cwd, selection: { target: "default-id" } })).getSessionFile()).toBe(manager.getSessionFile());
    const piStore = join(root, ".pi", "agent", "sessions", "foreign");
    await mkdir(piStore, { recursive: true });
    await save(join(piStore, "only-pi.jsonl"), cwd, "only-pi");
    await expect(openSelectedPiSession({ cwd, selection: { target: "only-pi" } })).rejects.toMatchObject({ exitCode: 1, message: "No session found matching 'only-pi'" });
    expect(existsSync(join(cwd, "only-pi"))).toBe(false);
  });

  it("prefers local exact before prefix, local prefix before global exact, and pinned first-prefix ordering", async () => {
    const { cwd, store } = await fixture();
    const firstPath = join(store, "first.jsonl");
    const exactPath = join(store, "exact.jsonl");
    await save(firstPath, cwd, "short-prefix-first");
    await save(exactPath, cwd, "short");
    const sessions = api();
    sessions.list.mockResolvedValue([
      { id: "short-prefix-first", path: firstPath, cwd },
      { id: "short", path: exactPath, cwd },
    ] as SessionInfo[]);
    expect((await openSelectedPiSession({ cwd, selection: { target: "short" }, sessions })).getSessionId()).toBe("short");
    sessions.list.mockResolvedValue([
      { id: "short-prefix-first", path: firstPath, cwd },
      { id: "short-prefix-second", path: exactPath, cwd },
    ] as SessionInfo[]);
    expect((await openSelectedPiSession({ cwd, selection: { target: "short" }, sessions })).getSessionId()).toBe("short-prefix-first");
    expect(sessions.listAll).not.toHaveBeenCalled();
  });

  it("forks only a confirmed global ID and preserves the source bytes", async () => {
    const { cwd, other, store } = await fixture();
    const path = join(store, "foreign.jsonl");
    await save(path, other);
    const before = await readFile(path, "utf8");
    const forkPrompt = vi.fn(async () => true);
    const manager = await openSelectedPiSession({ cwd, selection: { target: "saved-id", sessionDir: store }, forkPrompt });
    expect(forkPrompt).toHaveBeenCalledExactlyOnceWith({ sourceCwd: other });
    expect(manager.getSessionId()).not.toBe("saved-id");
    expect(manager.getCwd()).toBe(cwd);
    expect(manager.getHeader()?.parentSession).toBe(path);
    expect(manager.buildSessionContext().messages[0]).toMatchObject({ content: "history-saved-id" });
    expect(await readFile(path, "utf8")).toBe(before);
  });

  it.each(["", "not json", '{"type":"not-session"}\n'])("rejects empty/invalid existing files without modifying them (%j)", async content => {
    const { cwd } = await fixture();
    const path = join(cwd, "invalid.jsonl");
    await writeFile(path, content);
    await expect(openSelectedPiSession({ cwd, selection: { target: path } })).rejects.toMatchObject({ exitCode: 1 });
    expect(await readFile(path, "utf8")).toBe(content);
  });

  it("rejects missing files, directories and missing header cwd without creating replacement files", async () => {
    const { cwd, root } = await fixture();
    const path = join(cwd, "missing.jsonl");
    await expect(openSelectedPiSession({ cwd, selection: { target: path } })).rejects.toThrow("does not exist");
    expect(existsSync(path)).toBe(false);
    await expect(openSelectedPiSession({ cwd, selection: { target: `${cwd}/` } })).rejects.toThrow("not a regular file");
    await save(path, join(root, "missing-cwd"));
    await expect(openSelectedPiSession({ cwd, selection: { target: path } })).rejects.toThrow("Session working directory does not exist");
  });

  it("handles an unreadable target and a deterministic disappearing-file race as failures", async () => {
    const { cwd } = await fixture();
    const path = join(cwd, "saved.jsonl");
    await save(path, cwd);
    const sessions = api();
    sessions.open.mockImplementationOnce(() => { throw Object.assign(new Error("permission denied"), { code: "EACCES" }); });
    await expect(openSelectedPiSession({ cwd, selection: { target: path }, sessions })).rejects.toMatchObject({ exitCode: 1, message: expect.stringContaining("permission denied") });
    sessions.list.mockImplementationOnce(async () => {
      await rm(path);
      return [{ id: "saved-id", path, cwd }] as SessionInfo[];
    });
    await expect(openSelectedPiSession({ cwd, selection: { target: "saved-id" }, sessions })).rejects.toThrow("does not exist");
    expect(existsSync(path)).toBe(false);
    expect(sessions.open).toHaveBeenCalledTimes(1);
  });
});
