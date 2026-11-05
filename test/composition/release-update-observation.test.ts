import { afterEach, describe, expect, it, vi } from "vitest";
import { createStartupReleaseUpdateObservation } from "../../src/composition/release-update-observation.js";
import { deferStartupReleaseUpdateObservation } from "../../src/composition/startup-route.js";
import type { AvailableRelease, StartupReleaseCheckOptions } from "../../src/foundation/release/latest-release.js";

const automatic = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../../src/foundation/release/automatic-update.js", () => ({
  AUTOMATIC_UPDATE_ACTIVATION_RETRY_MS: 15_000,
  requestAutomaticUpdate: automatic.request,
  observeNewerActiveRelease: () => () => {},
}));
const active: { stop(): void }[] = [];
afterEach(() => { for (const observer of active.splice(0)) observer.stop(); automatic.request.mockReset(); });
const release: AvailableRelease = { version: "0.3.1", channel: "stable", command: "a1 update", changelogUrl: null };
function setup(mode: "auto" | "notify" | "no", initial: string) {
  let client = initial;
  const announced = vi.fn();
  const checks: StartupReleaseCheckOptions[] = [];
  const options = {
    backend: { extensions: { announceReleaseUpdate: announced } } as never,
    configDir: "fixture", packageVersion: "0.2.0", readPackageVersion: async () => "0.2.0", notificationVersion: "0.2.1", mode,
    clientVersion: () => client,
    checkForNewerRelease: async (options: StartupReleaseCheckOptions) => { checks.push(options); return release; },
  };
  const observer = createStartupReleaseUpdateObservation(options);
  active.push(observer);
  return { observer, options, announced, checks, connect(version: string) { client = version; observer.clientChanged(); } };
}

describe("deferred update observation", () => {
  it("loads once after start and exposes an unbound-safe client callback", async () => {
    const fixture = setup("notify", "0.3.0");
    const load = vi.fn(async () => ({ createStartupReleaseUpdateObservation: () => fixture.observer }));
    const deferred = deferStartupReleaseUpdateObservation(fixture.options, load); active.push(deferred);
    expect(load).not.toHaveBeenCalled();
    deferred.start(); deferred.start();
    await vi.waitFor(() => expect(fixture.checks).toHaveLength(1));
    expect(load).toHaveBeenCalledOnce();
    const callback = deferred.clientChanged;
    expect(() => callback()).not.toThrow();
    await vi.waitFor(() => expect(fixture.checks).toHaveLength(2));
  });
  it("does not start optional work if disposal wins module loading", async () => {
    const fixture = setup("auto", "0.3.0");
    const pending = Promise.withResolvers<{ createStartupReleaseUpdateObservation: typeof createStartupReleaseUpdateObservation }>();
    const create = vi.fn(() => fixture.observer);
    const deferred = deferStartupReleaseUpdateObservation(fixture.options, () => pending.promise); active.push(deferred);
    deferred.start(); deferred.stop();
    pending.resolve({ createStartupReleaseUpdateObservation: create });
    await pending.promise; await Promise.resolve();
    expect(create).not.toHaveBeenCalled(); expect(fixture.checks).toHaveLength(0);
  });
});

describe("connected-client update readiness", () => {
  it("does not offer the installed client again merely because an Agent keeps older code", async () => {
    const fixture = setup("auto", "0.3.1"); fixture.observer.start();
    await vi.waitFor(() => expect(fixture.checks).toHaveLength(1));
    expect(fixture.checks[0]?.runningVersion).toBe("0.3.1");
    expect(automatic.request).not.toHaveBeenCalled(); expect(fixture.announced).not.toHaveBeenCalled();
  });
  it("keeps late installed readiness attached to the older long-lived process", async () => {
    const pending = Promise.withResolvers<string | null>(); automatic.request.mockReturnValue(pending.promise);
    const fixture = setup("auto", "0.3.0"); fixture.observer.start();
    await vi.waitFor(() => expect(automatic.request).toHaveBeenCalledOnce());
    fixture.connect("0.3.1"); pending.resolve("0.3.1");
    await vi.waitFor(() => expect(fixture.announced).toHaveBeenCalledOnce());
    expect(fixture.announced).toHaveBeenCalledWith({ status: "installed", version: "0.3.1" });
    expect(automatic.request).toHaveBeenCalledOnce();
  });
  it("reports prepared activation without claiming restart readiness", async () => {
    automatic.request.mockImplementation(async options => {
      options.onActivationBlocked?.("0.3.1");
      return null;
    });
    const fixture = setup("auto", "0.3.0"); fixture.observer.start();
    await vi.waitFor(() => expect(fixture.announced).toHaveBeenCalledOnce());
    expect(fixture.announced).toHaveBeenCalledWith({ status: "blocked", version: "0.3.1" });
  });
  it("removes prepared status when prepared proof is invalidated", async () => {
    automatic.request.mockImplementation(async options => {
      options.onActivationBlocked?.("0.3.1");
      options.onActivationBlocked?.(null);
      return null;
    });
    const fixture = setup("auto", "0.3.0"); fixture.observer.start();
    await vi.waitFor(() => expect(fixture.announced).toHaveBeenCalledTimes(2));
    expect(fixture.announced.mock.calls.map(call => call[0])).toEqual([
      { status: "blocked", version: "0.3.1" },
      { status: "blocked-cleared", version: "0.3.1" },
    ]);
  });
  it("keeps one installed notice without restarting discovery as clients change", async () => {
    automatic.request.mockResolvedValue("0.3.1");
    const fixture = setup("auto", "0.3.0"); fixture.observer.start();
    await vi.waitFor(() => expect(fixture.announced).toHaveBeenCalledOnce());
    fixture.connect("0.3.1"); fixture.connect("0.3.0");
    await new Promise(resolve => setImmediate(resolve));
    expect(fixture.checks).toHaveLength(1);
    expect(fixture.announced).toHaveBeenCalledTimes(1);
    expect(fixture.announced).toHaveBeenCalledWith({ status: "installed", version: "0.3.1" });
  });
  it("keeps Notify passive and uses the actual client rather than an old notification hint", async () => {
    const fixture = setup("notify", "0.3.1"); fixture.observer.start();
    await vi.waitFor(() => expect(fixture.checks).toHaveLength(1));
    expect(fixture.checks[0]?.runningVersion).toBe("0.3.1"); expect(automatic.request).not.toHaveBeenCalled();
    expect(fixture.announced).not.toHaveBeenCalled();
  });
  it("does not arm another observation on client changes in No mode", async () => {
    const fixture = setup("no", "0.3.0"); fixture.observer.start();
    await vi.waitFor(() => expect(fixture.checks).toHaveLength(1));
    fixture.connect("0.3.1"); await Promise.resolve();
    expect(fixture.checks).toHaveLength(1); expect(automatic.request).not.toHaveBeenCalled(); expect(fixture.announced).not.toHaveBeenCalled();
  });
});
