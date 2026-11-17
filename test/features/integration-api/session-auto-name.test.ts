import { describe, expect, it, vi } from "vitest";
import type { OwnedUiSessionNameState, OwnedUiSessionNamingPort } from "../../../src/contracts/owned-ui/index.js";
import { applySessionAutoName } from "../../../src/features/integration-api/session-auto-name.js";
import { assertIntegrationResponse, executeIntegrationRequest, parseIntegrationRequest } from "../../../src/features/integration-api/index.js";

const target = { scope: "session", sessionId: "11111111-1111-4111-8111-111111111111", runtimeId: "22222222-2222-4222-8222-222222222222" };
const request = (type = "settings.get", extra: object = {}) => ({ version: 1, id: "policy-1", type, target, setting: "sessionAutoName", ...extra });
function owner() {
  let state: OwnedUiSessionNameState = { sessionFile: "private.jsonl", binding: 1, name: "Manual", nameEntryId: "name-1", source: "user", completedContext: null, autoName: null };
  const naming: OwnedUiSessionNamingPort = { state: () => state, complete: async () => null, apply: () => false,
    setAutoName: vi.fn((_expected, enabled) => { state = { ...state, autoName: enabled }; return true; }) };
  return { naming, replace() { state = { ...state, binding: 2, sessionFile: "other.jsonl", autoName: null }; } };
}

describe("external automatic-name policy", () => {
  it.each([true, false])("inherits profile %s without inventing a stored override", enabled => {
    const f = owner(), input = parseIntegrationRequest(request());
    const response = applySessionAutoName(input, f.naming, enabled);
    assertIntegrationResponse(response, input);
    expect(response.data).toEqual({ target, setting: "sessionAutoName", storedValue: null, effectiveValue: enabled, origin: "profile", application: "live" });
    expect(f.naming.setAutoName).not.toHaveBeenCalled();
  });

  it.each([true, false])("applies boolean %s independently of profile/manual-name ownership", enabled => {
    const f = owner(), input = parseIntegrationRequest(request("settings.update", { value: enabled }));
    const response = applySessionAutoName(input, f.naming, !enabled);
    assertIntegrationResponse(response, input);
    expect(response.data).toMatchObject({ target, storedValue: enabled, effectiveValue: enabled, origin: "session", status: "applied" });
    expect(f.naming.state()).toMatchObject({ name: "Manual", source: "user" });
    const read = applySessionAutoName(request(), f.naming, !enabled);
    expect(read.data).toMatchObject({ storedValue: enabled, effectiveValue: enabled });
    expect(JSON.stringify(read)).not.toContain("private.jsonl");
  });

  it.each(["false", "true", 0, 1, null, undefined, {}, []])("rejects nonboolean %j before routing", async value => {
    const services = { profile: vi.fn(), session: vi.fn() };
    expect(await executeIntegrationRequest(request("settings.update", { value }), services)).toMatchObject({ success: false, error: { code: "invalid-value" } });
    expect(services.session).not.toHaveBeenCalled(); expect(services.profile).not.toHaveBeenCalled();
  });

  it("rejects profile scope and unknown fields without routing", async () => {
    const services = { profile: vi.fn(), session: vi.fn() };
    expect(await executeIntegrationRequest(request("settings.update", { value: false, target: { scope: "profile", profileId: "a1" } }), services)).toMatchObject({ error: { code: "unsupported-scope" } });
    expect(await executeIntegrationRequest(request("settings.get", { value: false }), services)).toMatchObject({ error: { code: "invalid-request" } });
    expect(services.session).not.toHaveBeenCalled(); expect(services.profile).not.toHaveBeenCalled();
  });

  it("fails closed for missing, nonpersistent, replaced or unacknowledged owners", () => {
    const f = owner(), update = request("settings.update", { value: false });
    expect(applySessionAutoName(update, undefined, true)).toMatchObject({ error: { code: "session-unavailable" } });
    f.naming.setAutoName = () => false;
    expect(applySessionAutoName(update, f.naming, true)).toMatchObject({ error: { code: "session-unavailable" } });
    f.naming.setAutoName = () => { f.replace(); return true; };
    expect(applySessionAutoName(update, f.naming, true)).toMatchObject({ error: { code: "session-unavailable" } });
    f.naming.setAutoName = () => true;
    expect(applySessionAutoName(update, f.naming, true)).toMatchObject({ error: { code: "settings-failed" } });
  });

  it("validates setting-specific readback and applied acknowledgements", () => {
    const f = owner(), input = parseIntegrationRequest(request("settings.update", { value: false }));
    const response = applySessionAutoName(input, f.naming, true), data = response.data as object;
    for (const patch of [{ storedValue: "false" }, { effectiveValue: true }, { origin: "profile" }, { status: "stored" }, { storedValue: null }]) {
      expect(() => assertIntegrationResponse({ ...response, data: { ...data, ...patch } }, input)).toThrow();
    }
    const read = parseIntegrationRequest(request());
    for (const patch of [{ storedValue: null, origin: "session" }, { storedValue: false, origin: "profile" }, { storedValue: false, effectiveValue: true }]) {
      expect(() => assertIntegrationResponse({ ...response, data: { ...data, ...patch } }, read)).toThrow();
    }
  });
});
