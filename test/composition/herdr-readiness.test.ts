import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { startIntegrationControl } from "../../src/composition/integration-api.js";
import type { OwnedUiSessionBackend } from "../../src/contracts/owned-ui/index.js";
import type { OwnedSettingsManager } from "../../src/ui/settings/manager.js";
const observed = vi.hoisted(() => ({ fail: false, release: undefined as (() => void) | undefined, reporter: vi.fn(), request: vi.fn(), dispose: vi.fn() }));
vi.mock("../../src/foundation/lifecycle/session-control.js", () => ({ serveSessionControl: async () => {
  if (observed.fail) throw new Error("endpoint unavailable");
  return { publish: () => new Promise<void>(done => { observed.release = done; }), dispose: observed.dispose };
} }));
vi.mock("../../src/features/owned-ui/herdr-reporter.js", () => ({ createHerdrReporter: (options: unknown) => { observed.reporter(options); return { request: observed.request, dispose: async () => {} }; } }));
function fixture() {
  const listeners = new Set<() => void>();
  const identity = { sessionId: randomUUID(), cwd: "C:/Users/me", sessionBindingGeneration: 1, disposed: false, currentHistorySessionId: () => identity.sessionId };
  const backend = { identity, session: { onEvent(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; } } } as unknown as OwnedUiSessionBackend;
  const runtimeId = randomUUID();
  return { identity, backend, runtimeId, reservation: { terminalId: "t5z", runtimeId, generation: 1, file: "unused-test-fence" }, emit: () => { for (const listener of listeners) listener(); }, listeners };
}
describe("reporting readiness and replacement publication ordering", () => {
  it("does not create a reporter for failed endpoint startup", async () => {
    vi.clearAllMocks(); observed.fail = true;
    const f = fixture();
    await expect(startIntegrationControl(f.backend, {} as OwnedSettingsManager, "unused", f.runtimeId, f.reservation)).rejects.toThrow("endpoint unavailable");
    expect(observed.reporter).not.toHaveBeenCalled(); observed.fail = false;
  });
  it("withholds a replacement identity until endpoint publication finishes and unsubscribes on disposal", async () => {
    vi.clearAllMocks(); const f = fixture();
    const control = await startIntegrationControl(f.backend, {} as OwnedSettingsManager, "unused", f.runtimeId, f.reservation);
    const options = observed.reporter.mock.calls[0]![0] as { identity: () => unknown };
    expect(options.identity()).toMatchObject({ sessionId: f.identity.sessionId, binding: 1, cwd: "C:/Users/me" });
    // A queued/rejected target never changes the active backend identity.
    f.emit(); expect(options.identity()).toMatchObject({ cwd: "C:/Users/me" });
    f.identity.cwd = "D:/Git/repo/.worktrees/attached";
    f.identity.sessionId = randomUUID(); f.identity.sessionBindingGeneration++; f.emit();
    expect(options.identity()).toBeUndefined(); expect(observed.request).not.toHaveBeenCalled();
    await new Promise(done => setImmediate(done)); observed.release!(); await new Promise(done => setImmediate(done));
    expect(options.identity()).toMatchObject({ sessionId: f.identity.sessionId, binding: 2, cwd: f.identity.cwd }); expect(observed.request).toHaveBeenCalledOnce();
    // Worktree switches, detach and completion all replace the context of this same conversation.
    for (const cwd of ["D:/Git/repo/.worktrees/other", "C:/Users/me", "D:/Git/repo"]) {
      f.identity.cwd = cwd; f.identity.sessionBindingGeneration++; f.emit();
      expect(options.identity()).toBeUndefined();
      await new Promise(done => setImmediate(done)); observed.release!(); await new Promise(done => setImmediate(done));
      expect(options.identity()).toMatchObject({ cwd, binding: f.identity.sessionBindingGeneration });
    }
    await control.dispose(); expect(f.listeners.size).toBe(0); expect(options.identity()).toBeUndefined();
  });
});
