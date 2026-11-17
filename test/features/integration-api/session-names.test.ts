import { describe, expect, it, vi } from "vitest";
import { applySessionName, assertIntegrationResponse, executeIntegrationRequest, parseIntegrationRequest } from "../../../src/features/integration-api/index.js";
import type { OwnedUiSessionNameState } from "../../../src/contracts/owned-ui/index.js";

const target = { scope: "session", sessionId: "11111111-1111-4111-8111-111111111111", runtimeId: "22222222-2222-4222-8222-222222222222" };
const request = (type = "session.get", fields = {}) => ({ version: 1, id: "names", type, target, ...fields });
function fixture() {
  let state: OwnedUiSessionNameState = { sessionFile: "/private/history", binding: 1, name: null, nameEntryId: null, source: "unnamed", completedContext: null };
  const naming = { state: () => state, complete: async () => null, apply: () => false,
    rename: vi.fn((expected: OwnedUiSessionNameState, name: string) => {
      if (state !== expected) return false;
      if (state.name !== name) state = { ...state, name, nameEntryId: "next", source: "user" };
      return true;
    }) };
  const read = () => applySessionName(request(), naming).data as { name: string | null; nameRevision: string };
  return { naming, read, set: (next: Partial<OwnedUiSessionNameState>) => { state = { ...state, ...next }; } };
}

describe("exact-session manual naming protocol", () => {
  it("reads opaque state and acknowledges only canonical applied names", () => {
    const f = fixture(), before = f.read();
    expect(before).toMatchObject({ name: null, nameRevision: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(JSON.stringify(before)).not.toContain("private");
    const input = parseIntegrationRequest(request("session.rename", { name: "  Fix cache 🛠  ", expectedNameRevision: before.nameRevision }));
    const response = applySessionName(input, f.naming);
    assertIntegrationResponse(response, input);
    expect(response.data).toMatchObject({ name: "Fix cache 🛠", status: "applied", target });
    expect(f.read().nameRevision).not.toBe(before.nameRevision);
    const current = f.read();
    applySessionName(request("session.rename", { name: current.name, expectedNameRevision: current.nameRevision }), f.naming);
    expect(f.read()).toEqual(current);
  });

  it("refuses stale state including same-text reassignments and missing owners", () => {
    const f = fixture(), before = f.read();
    f.set({ name: "Changed inside A1", nameEntryId: "local" });
    expect(applySessionName(request("session.rename", { name: "stale", expectedNameRevision: before.nameRevision }), f.naming)).toMatchObject({ success: false, error: { code: "name-conflict" } });
    expect(f.naming.rename).not.toHaveBeenCalled();
    const current = f.read(); f.set({ nameEntryId: "same-text-new-entry" });
    expect(applySessionName(request("session.rename", { name: "stale", expectedNameRevision: current.nameRevision }), f.naming).success).toBe(false);
    expect(applySessionName(request(), undefined)).toMatchObject({ error: { code: "session-unavailable" } });
  });

  it.each(["", "  ", "line\nline", "\u001b[31m", "bad\u0085name", "bad\u2028name", "x".repeat(257)])("rejects unsafe or oversized names %j", async name => {
    const services = { profile: vi.fn(), session: vi.fn() };
    const response = await executeIntegrationRequest(request("session.rename", { name, expectedNameRevision: "a".repeat(64) }), services);
    expect(response).toMatchObject({ success: false, error: { code: "invalid-value" } });
    expect(services.session).not.toHaveBeenCalled();
  });

  it("bounds revisions, Unicode names, targets and operation fields", () => {
    expect(() => parseIntegrationRequest(request("session.rename", { name: "🛠".repeat(256), expectedNameRevision: "a".repeat(64) }))).not.toThrow();
    for (const fields of [{ name: "ok" }, { name: "ok", expectedNameRevision: "path" }, { name: "ok", expectedNameRevision: "a".repeat(64), force: true }, { name: "ok", expectedNameRevision: "a".repeat(64), target: { scope: "profile", profileId: "a1" } }]) {
      expect(() => parseIntegrationRequest(request("session.rename", fields))).toThrow();
    }
    const f = fixture(), input = parseIntegrationRequest(request("session.rename", { name: "ok", expectedNameRevision: f.read().nameRevision }));
    const response = applySessionName(input, f.naming);
    for (const patch of [{ status: "queued" }, { name: "wrong" }, { nameRevision: "private-path" }, { target: { ...target, runtimeId: target.sessionId } }]) {
      expect(() => assertIntegrationResponse({ ...response, data: { ...(response.data as object), ...patch } }, input)).toThrow();
    }
  });
});
