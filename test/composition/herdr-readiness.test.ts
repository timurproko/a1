import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { startSessionColorControl } from "../../src/composition/session-colors.js";
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
  const identity = { sessionId: randomUUID(), sessionBindingGeneration: 1, disposed: false, currentHistorySessionId: () => identity.sessionId };
  const backend = { identity, session: { onEvent(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; } } } as unknown as OwnedUiSessionBackend;
  const runtimeId = randomUUID();
  return { identity, backend, runtimeId, reservation: { terminalId: "t5z", runtimeId, generation: 1, file: "unused-test-fence" }, emit: () => { for (const listener of listeners) listener(); }, listeners };
}
describe("reporting readiness and replacement publication ordering", () => {
  it("does not create a reporter for failed endpoint startup", async () => {
    vi.clearAllMocks(); observed.fail = true;
    const f = fixture();
    await expect(startSessionColorControl(f.backend, {} as OwnedSettingsManager, "unused", f.runtimeId, f.reservation)).rejects.toThrow("endpoint unavailable");
    expect(observed.reporter).not.toHaveBeenCalled(); observed.fail = false;
  });
  it("withholds a replacement identity until endpoint publication finishes and unsubscribes on disposal", async () => {
    vi.clearAllMocks(); const f = fixture();
    const control = await startSessionColorControl(f.backend, {} as OwnedSettingsManager, "unused", f.runtimeId, f.reservation);
    const options = observed.reporter.mock.calls[0]![0] as { identity: () => unknown };
    expect(options.identity()).toMatchObject({ sessionId: f.identity.sessionId, binding: 1 });
    f.identity.sessionId = randomUUID(); f.identity.sessionBindingGeneration++; f.emit();
    expect(options.identity()).toBeUndefined(); expect(observed.request).not.toHaveBeenCalled();
    await new Promise(done => setImmediate(done)); observed.release!(); await new Promise(done => setImmediate(done));
    expect(options.identity()).toMatchObject({ sessionId: f.identity.sessionId, binding: 2 }); expect(observed.request).toHaveBeenCalledOnce();
    await control.dispose(); expect(f.listeners.size).toBe(0); expect(options.identity()).toBeUndefined();
  });
});
