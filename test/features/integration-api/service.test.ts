import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationSettings } from "../../../src/app/settings/index.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";
import { OwnedSettingsManager } from "../../../src/ui/settings/index.js";
import { applyIntegrationSettings, applySessionLifecycle, assertIntegrationResponse, executeIntegrationRequest, parseIntegrationRequest, type SessionLifecycleServices } from "../../../src/features/integration-api/index.js";

const roots: string[] = [];
const root = () => { const directory = mkdtempSync(join(tmpdir(), "integration-settings-")); roots.push(directory); return directory; };
afterEach(() => roots.splice(0).forEach(directory => rmSync(directory, { recursive: true, force: true })));
const target = { scope: "session" as const, sessionId: "11111111-1111-4111-8111-111111111111", runtimeId: "22222222-2222-4222-8222-222222222222" };
const request = (type: string, extra = {}) => ({ version: 1, id: "request-1", type, ...extra });

describe("shared integration application authority", () => {
  it("discovers only supported operations and declaration-derived descriptors without services", async () => {
    const services = { profile: vi.fn(), session: vi.fn() };
    const capabilities = await executeIntegrationRequest(request("capabilities"), services);
    expect(capabilities).toMatchObject({ version: 1, id: "request-1", type: "response", command: "capabilities", success: true,
      data: { operations: ["capabilities", "settings.list", "settings.get", "settings.update", "session.get", "session.lifecycle", "session.exit"], launchColor: true, terminalIdentity: true, lifecycle: true } });
    const descriptors = await executeIntegrationRequest(request("settings.list"), services);
    expect(descriptors.data).toMatchObject({ settings: [
      { id: "defaultAccentColor", scope: "profile", application: "next-session" },
      { id: "accentColor", scope: "session", choices: ["blue", "green", "orange", "pink", "purple", "cyan", "grey"] },
    ] });
    expect(services.profile).not.toHaveBeenCalled(); expect(services.session).not.toHaveBeenCalled();
  });

  it.each([
    [request("settings.update", { target, setting: "accentColor", value: "pink", version: 2 }), "unsupported-version"],
    [request("prompt"), "unsupported-operation"],
    [request("settings.get", { target: { scope: "repository" }, setting: "accentColor" }), "unsupported-scope"],
    [request("settings.get", { target: { ...target, runtimeId: undefined }, setting: "accentColor" }), "invalid-target"],
    [request("settings.get", { target, setting: "apiKey" }), "unsupported-setting"],
    [request("settings.update", { target, setting: "accentColor", value: "red" }), "invalid-value"],
    [request("settings.get", { setting: "accentColor" }), "target-required"],
    [request("settings.get", { target, setting: "defaultAccentColor" }), "unsupported-scope"],
    [request("settings.list", { target }), "invalid-request"],
    [request("session.lifecycle"), "target-required"],
    [request("session.exit", { target: { scope: "profile", profileId: "a1" } }), "unsupported-scope"],
    [request("session.exit", { target, force: true }), "invalid-request"],
    [request("session.lifecycle", { target, setting: "accentColor" }), "invalid-request"],
  ])("rejects unsupported input before reaching services", async (input, code) => {
    const services = { profile: vi.fn(), session: vi.fn() };
    expect(await executeIntegrationRequest(input, services)).toMatchObject({ success: false, error: { code } });
    expect(services.profile).not.toHaveBeenCalled(); expect(services.session).not.toHaveBeenCalled();
  });

  it("shares UI state, keeps Current local, and retains immutable replacement policy", async () => {
    const directory = root();
    const settings = new OwnedSettingsManager({ profileDir: directory, profileId: "a1", sessionColor: "green" });
    const peer = new ApplicationSettings({ profileDir: directory, profileId: "a1" });
    const update = parseIntegrationRequest(request("settings.update", { target, setting: "accentColor", value: "pink" }));
    const result = await applyIntegrationSettings(update, settings);
    assertIntegrationResponse(result, update);
    expect(result.data).toMatchObject({ status: "applied", effectiveValue: "pink", storedValue: "pink", origin: "session" });
    expect(settings.sections().flatMap(section => section.entries).find(entry => entry.id === "accentColor")?.effectiveValue).toBe("pink");
    expect(peer.value("accentColor")).toBe("blue");
    await settings.change("a1", "accentColor", "cyan");
    expect((await applyIntegrationSettings(request("settings.get", { target, setting: "accentColor" }), settings)).data).toMatchObject({ effectiveValue: "cyan" });
    settings.startSession(); expect(settings.value("accentColor")).toBe("green");
  });

  it("stores profile defaults atomically, preserving peers and unknown root/namespace fields", async () => {
    const directory = root(), file = join(directory, "settings.json");
    writeFileSync(file, JSON.stringify({ piRoot: true, [PRODUCT_IDENTITY.commandName]: { future: { keep: true } } }));
    const settings = new OwnedSettingsManager({ profileDir: directory, profileId: "a1" });
    const peer = new ApplicationSettings({ profileDir: directory, profileId: "a1" });
    await peer.change("a1", "backgroundStyle", "dark");
    const update = parseIntegrationRequest(request("settings.update", { target: { scope: "profile", profileId: "a1" }, setting: "defaultAccentColor", value: "purple" }));
    const response = await applyIntegrationSettings(update, settings); assertIntegrationResponse(response, update);
    expect(response.data).toMatchObject({ status: "stored", application: "next-session", storedValue: "purple" });
    expect(settings.sections().flatMap(section => section.entries).find(entry => entry.id === "defaultAccentColor")).toMatchObject({ application: "next-session", storedValue: "purple", effectiveValue: "blue" });
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({ piRoot: true, [PRODUCT_IDENTITY.commandName]: { future: { keep: true }, backgroundStyle: "dark", defaultAccentColor: "purple" } });
    peer.refresh(); expect(peer.value("accentColor")).toBe("blue"); peer.startSession(); expect(peer.value("accentColor")).toBe("purple");
  });

  it("refuses malformed or mismatched acknowledgements", async () => {
    const settings = new ApplicationSettings({ profileDir: root(), profileId: "a1" });
    const update = parseIntegrationRequest(request("settings.update", { target, setting: "accentColor", value: "pink" }));
    const response = await applyIntegrationSettings(update, settings);
    for (const patch of [{ id: "other" }, { version: 2 }, { command: "settings.get" }, { type: "event" }, { success: "true" }, { data: {} }]) {
      expect(() => assertIntegrationResponse({ ...response, ...patch }, update)).toThrow();
    }
    const data = response.data as Record<string, unknown>;
    for (const patch of [{ status: "queued" }, { effectiveValue: "blue" }, { target: { ...target, runtimeId: target.sessionId } }]) {
      expect(() => assertIntegrationResponse({ ...response, data: { ...data, ...patch } }, update)).toThrow();
    }
  });

  const idle = { lifecycle: "ready" as const, editorEmpty: true, pendingSubmissions: 0, queuedInput: 0, overlayOpen: false, exitAdmissible: true, blockers: [] as const };
  const lifecycleServices = (snapshot: ReturnType<SessionLifecycleServices["readiness"]>, exit: ReturnType<SessionLifecycleServices["requestExit"]>) => {
    const services = { readiness: vi.fn(() => snapshot), requestExit: vi.fn(() => exit) };
    return services;
  };

  it("routes lifecycle operations to the exact runtime, never to profile settings", async () => {
    const services = { profile: vi.fn(), session: vi.fn(async () => ({ forwarded: true })) };
    expect(await executeIntegrationRequest(request("session.lifecycle", { target }), services)).toEqual({ forwarded: true });
    expect(await executeIntegrationRequest(request("session.exit", { target }), services)).toEqual({ forwarded: true });
    expect(services.profile).not.toHaveBeenCalled();
    const settings = new ApplicationSettings({ profileDir: root(), profileId: "a1" });
    expect(await applyIntegrationSettings(request("session.exit", { target }), settings)).toMatchObject({ success: false, error: { code: "unsupported-operation" } });
  });

  it("answers a read-only snapshot and validates its consistency", () => {
    const services = lifecycleServices(idle, { admitted: true });
    const snapshot = parseIntegrationRequest(request("session.lifecycle", { target }));
    const response = applySessionLifecycle(snapshot, services);
    assertIntegrationResponse(response, snapshot);
    expect(response.data).toEqual({ target, ...idle });
    expect(services.requestExit).not.toHaveBeenCalled();
    const data = response.data as Record<string, unknown>;
    for (const patch of [{ exitAdmissible: false }, { blockers: ["forced"] }, { lifecycle: "gone" }, { queuedInput: -1 }, { pendingSubmissions: "0" }]) {
      expect(() => assertIntegrationResponse({ ...response, data: { ...data, ...patch } }, snapshot)).toThrow(/Malformed lifecycle snapshot/);
    }
    expect(applySessionLifecycle(snapshot, null)).toMatchObject({ success: false, error: { code: "session-unavailable" } });
    expect(applySessionLifecycle(request("session.get", { target }), services)).toMatchObject({ success: false, error: { code: "unsupported-operation" } });
  });

  it("acknowledges an admitted exit once and reports the first blocker otherwise", () => {
    const exit = parseIntegrationRequest(request("session.exit", { target }));
    const admitted = applySessionLifecycle(exit, lifecycleServices(idle, { admitted: true }));
    assertIntegrationResponse(admitted, exit);
    expect(admitted.data).toEqual({ target, status: "admitted", lifecycle: "stopping" });
    for (const patch of [{ status: "queued" }, { lifecycle: "ready" }]) {
      expect(() => assertIntegrationResponse({ ...admitted, data: { ...(admitted.data as object), ...patch } }, exit)).toThrow(/not acknowledged as admitted/);
    }
    for (const blocker of ["session-stopping", "session-busy", "editor-not-empty", "pending-input", "overlay-open"] as const) {
      const refused = applySessionLifecycle(exit, lifecycleServices({ ...idle, exitAdmissible: false, blockers: [blocker] }, { admitted: false, blocker }));
      expect(refused).toMatchObject({ success: false, id: "request-1", command: "session.exit", error: { code: blocker } });
      assertIntegrationResponse(refused, exit);
    }
  });
});
