import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createPiEngineAdapter, createPiRuntimeIntegration } from "../../src/integrations/pi/engine/index.js";
import { lockfileBackend, setSessionWriterLockBackendForTest } from "../../src/foundation/session-writer-lock/index.js";
import { writeResumeFixture } from "../support/session-resume-fixture.js";
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
  it("delivers installed notices to a real large-session adapter without cancelling admitted work", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-update-continuity-"));
    setSessionWriterLockBackendForTest(lockfileBackend(resolve(root, "locks")));
    const saved = await writeResumeFixture(resolve(root, "sessions"), root, { largeMessages: 1000 });
    const before = await readFile(saved.path);
    const runtime = await createPiRuntimeIntegration({ cwd: root, agentDir: resolve(root, "agent"), sessionSelection: { target: saved.path } });
    const adapter = await createPiEngineAdapter({ cwd: root, sessionId: "continuity", createRuntime: async () => runtime });
    const work = Promise.withResolvers<void>();
    const prompt = vi.spyOn(runtime.session, "prompt").mockImplementation(() => work.promise);
    const abort = vi.spyOn(runtime.session, "abort");
    try {
      await adapter.flushEvents();
      const identity = adapter.identity.currentSessionResumeMetadata();
      const transcript = adapter.view().transcript;
      const pending = adapter.execute({ type: "prompt", sessionId: "continuity", correlationId: "busy", text: "offline pending work" });
      const announced = vi.spyOn(adapter.extensions, "announceReleaseUpdate");
      automatic.request.mockResolvedValue("0.3.1");
      const observer = createStartupReleaseUpdateObservation({ backend: adapter as never, configDir: resolve(root, "config"),
        packageVersion: "0.3.0", readPackageVersion: async () => "0.3.0", mode: "auto", checkForNewerRelease: async () => release });
      active.push(observer); observer.start();
      await vi.waitFor(() => expect(announced).toHaveBeenCalledWith({ status: "installed", version: "0.3.1" }));
      await adapter.flushEvents();
      expect(abort).not.toHaveBeenCalled();
      expect(adapter.deliveryDiagnostics().pendingCommands).toBe(1);
      expect(adapter.view().lifecycle).not.toBe("failed");
      expect(adapter.identity.currentSessionResumeMetadata()).toEqual(identity);
      expect(adapter.view().transcript).toEqual(transcript);
      work.resolve();
      expect(await pending).toMatchObject({ outcome: "completed" });
      expect(adapter.view().editor.submitEnabled).toBe(true);
      prompt.mockResolvedValue(undefined);
      expect(await adapter.execute({ type: "prompt", sessionId: "continuity", correlationId: "next", text: "next input" })).toMatchObject({ outcome: "completed" });
      expect(await readFile(saved.path)).toEqual(before);
    } finally {
      work.resolve(); await adapter.dispose();
      setSessionWriterLockBackendForTest(undefined);
      await rm(root, { recursive: true, force: true });
    }
  }, 30_000);

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
