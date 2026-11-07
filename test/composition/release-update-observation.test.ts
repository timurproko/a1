import { afterEach, describe, expect, it, vi } from "vitest";
import { createStartupReleaseUpdateObservation } from "../../src/composition/release-update-observation.js";
import { deferStartupReleaseUpdateObservation } from "../../src/composition/startup-route.js";
import type { AvailableRelease, StartupReleaseCheckOptions } from "../../src/foundation/release/latest-release.js";

const automatic = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../../src/foundation/release/automatic-update.js", () => ({
  requestAutomaticUpdate: automatic.request,
  observeNewerActiveRelease: () => () => {},
}));
const active: { stop(): void }[] = [];
afterEach(() => { for (const observer of active.splice(0)) observer.stop(); automatic.request.mockReset(); });
const release: AvailableRelease = { version: "0.3.1", channel: "stable", command: "a1 update", changelogUrl: null };
function setup(mode: "auto" | "manual", packageVersion = "0.3.0") {
  const announced = vi.fn();
  const checks: StartupReleaseCheckOptions[] = [];
  const options = {
    backend: { extensions: { announceReleaseUpdate: announced } } as never,
    configDir: "fixture", packageVersion, readPackageVersion: async () => packageVersion, mode,
    checkForNewerRelease: async (options: StartupReleaseCheckOptions) => { checks.push(options); return release; },
  };
  const observer = createStartupReleaseUpdateObservation(options);
  active.push(observer);
  return { observer, options, announced, checks };
}

describe("deferred update observation", () => {
  it("loads once after start", async () => {
    const fixture = setup("auto");
    automatic.request.mockResolvedValue(null);
    const load = vi.fn(async () => ({ createStartupReleaseUpdateObservation: () => fixture.observer }));
    const deferred = deferStartupReleaseUpdateObservation(fixture.options, load); active.push(deferred);
    expect(load).not.toHaveBeenCalled();
    deferred.start(); deferred.start();
    await vi.waitFor(() => expect(fixture.checks).toHaveLength(1));
    expect(load).toHaveBeenCalledOnce();
  });
  it("does not start optional work if disposal wins module loading", async () => {
    const fixture = setup("auto");
    const pending = Promise.withResolvers<{ createStartupReleaseUpdateObservation: typeof createStartupReleaseUpdateObservation }>();
    const create = vi.fn(() => fixture.observer);
    const deferred = deferStartupReleaseUpdateObservation(fixture.options, () => pending.promise); active.push(deferred);
    deferred.start(); deferred.stop();
    pending.resolve({ createStartupReleaseUpdateObservation: create });
    await pending.promise; await Promise.resolve();
    expect(create).not.toHaveBeenCalled(); expect(fixture.checks).toHaveLength(0);
  });
});

describe("update readiness", () => {
  it("installs silently in Auto and announces only the installed status", async () => {
    automatic.request.mockResolvedValue("0.3.1");
    const fixture = setup("auto"); fixture.observer.start();
    await vi.waitFor(() => expect(fixture.announced).toHaveBeenCalledOnce());
    expect(fixture.checks[0]?.runningVersion).toBe("0.3.0");
    expect(automatic.request).toHaveBeenCalledOnce();
    expect(fixture.announced).toHaveBeenCalledWith({ status: "installed", version: "0.3.1" });
  });
  it("announces nothing while an Auto installation does not complete", async () => {
    automatic.request.mockResolvedValue(null);
    const fixture = setup("auto"); fixture.observer.start();
    await vi.waitFor(() => expect(automatic.request).toHaveBeenCalledOnce());
    await new Promise(resolve => setImmediate(resolve));
    expect(fixture.announced).not.toHaveBeenCalled();
  });
  it("leaves updates to the user in Manual", async () => {
    const fixture = setup("manual"); fixture.observer.start();
    await vi.waitFor(() => expect(fixture.checks).toHaveLength(1));
    await new Promise(resolve => setImmediate(resolve));
    expect(automatic.request).not.toHaveBeenCalled();
    expect(fixture.announced).not.toHaveBeenCalled();
  });
});
