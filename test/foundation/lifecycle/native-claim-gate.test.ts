import { afterEach, describe, expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({ load: vi.fn(), acquire: vi.fn() }));
vi.mock("node:module", () => ({ createRequire: () => native.load }));
vi.mock("node:fs", () => ({ existsSync: () => true }));
afterEach(() => { vi.resetModules(); vi.resetAllMocks(); });

describe("native claim gate adapter", () => {
  it("returns genuine contention and preserves the native handle", async () => {
    native.load.mockReturnValue({ SessionLock: { tryAcquireGate: native.acquire } });
    const { tryAcquireClaimGate } = await import("../../../src/foundation/lifecycle/native-claim-gate.js");
    native.acquire.mockReturnValueOnce({ acquired: false });
    expect(tryAcquireClaimGate("gate")).toBeNull();
    const handle = { acquired: true, release: vi.fn() };
    native.acquire.mockReturnValueOnce(handle);
    expect(tryAcquireClaimGate("gate")).toBe(handle);
  });
  it("refuses an old addon rather than falling back to PID files", async () => {
    native.load.mockReturnValue({ SessionLock: { acquire: vi.fn() } });
    const { tryAcquireClaimGate } = await import("../../../src/foundation/lifecycle/native-claim-gate.js");
    expect(() => tryAcquireClaimGate("gate")).toThrow(expect.objectContaining({ code: "worktree-coordination-unavailable" }));
  });
  it("classifies native I/O failure without exposing the native error", async () => {
    native.load.mockReturnValue({ SessionLock: { tryAcquireGate: native.acquire } });
    native.acquire.mockImplementation(() => { throw new Error("private native path"); });
    const { tryAcquireClaimGate } = await import("../../../src/foundation/lifecycle/native-claim-gate.js");
    expect(() => tryAcquireClaimGate("gate")).toThrow(expect.objectContaining({ code: "worktree-coordination-io" }));
    expect(() => tryAcquireClaimGate("gate")).not.toThrow(/private native path/);
  });
});
