import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionManager, type AgentSession } from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PiSessionNaming } from "../../../../src/integrations/pi/engine/session-naming.js";
import { SessionNamingController } from "../../../../src/features/session-naming/index.js";
import type { OwnedUiEvent, OwnedUiSessionBackend } from "../../../../src/contracts/owned-ui/index.js";

const roots: string[] = [];
const releases: Array<() => void> = [];
afterEach(() => { releases.splice(0).forEach(release => release()); roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })); vi.restoreAllMocks(); });
const settle = async () => { await vi.dynamicImportSettled(); for (let i = 0; i < 30; i++) await Promise.resolve(); };
function fixture(conversation = true) {
  const root = mkdtempSync(join(tmpdir(), "a1-auto-name-")); roots.push(root);
  let manager = SessionManager.create(root, join(root, "sessions")), binding = 1, unavailable = false;
  if (conversation) manager.appendMessage({ role: "user", content: "Fix cache", timestamp: Date.now() });
  const session = { get sessionManager() { return manager; }, setSessionName(name: string) { manager.appendSessionInfo(name); naming.nameChanged(); } } as unknown as AgentSession;
  const changed = vi.fn();
  const naming = new PiSessionNaming({ session: () => session, runtime: () => undefined, binding: () => binding, unavailable: () => unavailable, changed });
  return { naming, changed, get manager() { return manager; },
    resume() { manager = SessionManager.open(manager.getSessionFile()!); binding++; },
    replace() { manager = SessionManager.create(root, join(root, "sessions")); binding++; },
    inMemory() { manager = SessionManager.inMemory(root); binding++; },
    stop() { unavailable = true; },
  };
}

describe("Pi automatic-name policy ownership", () => {
  it("persists an independent idempotent override across resume without changing provenance", () => {
    const f = fixture(), before = f.naming.state()!;
    expect(f.naming.apply(before, "Fix cache", "context-1")).toBe(true);
    const automatic = f.naming.state()!;
    expect(automatic).toMatchObject({ source: "auto", autoName: null });
    expect(f.naming.setAutoName(automatic, false)).toBe(true);
    const saved = readFileSync(f.manager.getSessionFile()!, "utf8");
    expect(f.naming.setAutoName(f.naming.state()!, false)).toBe(true);
    expect(readFileSync(f.manager.getSessionFile()!, "utf8")).toBe(saved);
    expect(f.naming.state()).toMatchObject({ name: automatic.name, nameEntryId: automatic.nameEntryId, source: "auto", completedContext: "context-1", autoName: false });
    f.resume();
    expect(f.naming.state()).toMatchObject({ autoName: false, source: "auto", completedContext: "context-1" });
    expect(f.naming.setAutoName(f.naming.state()!, true)).toBe(true);
    f.resume(); expect(f.naming.state()?.autoName).toBe(true);
    expect(f.naming.rename(f.naming.state()!, "Manual")).toBe(true);
    expect(f.naming.setAutoName(f.naming.state()!, false)).toBe(true);
    expect(f.naming.setAutoName(f.naming.state()!, true)).toBe(true);
    expect(f.naming.state()).toMatchObject({ name: "Manual", source: "user", autoName: true });
    expect(f.naming.apply(f.naming.state()!, "Replace manual", "context-2")).toBe(false);
  });

  it("does not leak to replacements, mutate stale targets or acknowledge setup-only/in-memory sessions", () => {
    const f = fixture(), before = f.naming.state()!;
    expect(f.naming.setAutoName(before, false)).toBe(true);
    f.replace(); expect(f.naming.state()?.autoName).toBeNull();
    expect(f.naming.setAutoName(before, true)).toBe(false);
    expect(f.naming.setAutoName(f.naming.state()!, false)).toBe(false);
    f.inMemory(); expect(f.naming.state()).toBeNull();
    expect(f.naming.setAutoName(before, true)).toBe(false);
    f.stop(); expect(f.naming.state()).toBeNull();
  });

  it("refuses direct late automatic application while disabled and propagates failed persistence", () => {
    const f = fixture(), before = f.naming.state()!;
    f.naming.setAutoName(before, false);
    expect(f.naming.apply(before, "Late name", "context")).toBe(false);
    vi.spyOn(f.manager, "appendCustomEntry").mockImplementation(() => { throw new Error("disk failure"); });
    expect(() => f.naming.setAutoName(f.naming.state()!, true)).toThrow("disk failure");
    expect(f.naming.state()?.autoName).toBe(false);
  });

  it("cancels synchronously even when disabled and re-enabled before a UI event drains", async () => {
    const f = fixture(); let listener: (event: OwnedUiEvent) => void = () => {};
    const backend = { identity: { sessionBindingGeneration: 1 }, session: {
      onEvent(next: typeof listener) { listener = next; return () => {}; }, view: () => ({ transcript: [], status: {} }),
    } } as unknown as OwnedUiSessionBackend;
    let answer!: (name: string) => void;
    const complete = vi.spyOn(f.naming, "complete").mockImplementationOnce(() => new Promise(resolve => { answer = resolve; })).mockResolvedValue("Fix cache");
    const controller = new SessionNamingController({ backend, naming: f.naming, enabled: () => f.naming.state()?.autoName !== false,
      format: () => "sentence", withContext: async consume => consume({ cwd: "/repo", branch: "fix/cache", revision: "one" }) });
    releases.push(() => controller.dispose());
    const prompt = (id: string) => { listener({ type: "agent-run-started" } as OwnedUiEvent); listener({ type: "transcript-block", block: { id, kind: "user", text: "Fix cache" } } as OwnedUiEvent); };
    prompt("first"); await settle(); expect(complete).toHaveBeenCalledOnce();
    const signal = complete.mock.calls[0]![0].signal;
    f.naming.setAutoName(f.naming.state()!, false);
    expect(signal.aborted).toBe(true);
    f.naming.setAutoName(f.naming.state()!, true);
    answer("Late result"); await settle(); expect(f.naming.state()?.name).toBeNull();
    prompt("second"); await settle(); expect(complete).toHaveBeenCalledTimes(2);
    expect(f.naming.state()).toMatchObject({ source: "auto", name: "Fix cache" });
    f.naming.setAutoName(f.naming.state()!, false); f.naming.setAutoName(f.naming.state()!, true);
    prompt("third"); await settle(); expect(complete).toHaveBeenCalledTimes(2);
  });
});
