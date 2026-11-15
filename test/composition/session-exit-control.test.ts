/**
 * Lifecycle operations through the real fenced transport: the late-bound shell provider, synchronous admission
 * inside the serialized handler, a single acknowledged exit under concurrency, and unchanged settings routing.
 */
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startIntegrationControl } from "../../src/composition/integration-api.js";
import type { OwnedUiExitReadiness, OwnedUiSessionBackend, OwnedUiSessionLifecyclePort } from "../../src/contracts/owned-ui/index.js";
import { assertIntegrationResponse, parseIntegrationRequest } from "../../src/features/integration-api/index.js";
import { requestSessionControl } from "../../src/foundation/lifecycle/index.js";
import { OwnedSettingsManager } from "../../src/ui/settings/index.js";

let root: string;
const controls: Array<{ dispose(): Promise<void> }> = [];
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), "session-exit-control-")); });
afterEach(async () => { await Promise.all(controls.splice(0).map(control => control.dispose())); await rm(root, { recursive: true, force: true }); });

const idle: OwnedUiExitReadiness = { lifecycle: "ready", editorEmpty: true, pendingSubmissions: 0, queuedInput: 0, overlayOpen: false, exitAdmissible: true, blockers: [] };

/** A shell double whose admission is synchronous and single-shot, like the production presenter. */
function shellDouble(initial: OwnedUiExitReadiness = idle) {
  let admitted = false, current = initial;
  const port: OwnedUiSessionLifecyclePort = {
    readiness: vi.fn((): OwnedUiExitReadiness => admitted ? { ...current, exitAdmissible: false, blockers: ["session-stopping"] } : current),
    requestExit: vi.fn((): ReturnType<OwnedUiSessionLifecyclePort["requestExit"]> => {
      const { blockers } = port.readiness();
      if (blockers.length > 0) return { admitted: false, blocker: blockers[0]! };
      admitted = true;
      return { admitted: true };
    }),
  };
  return { port, set: (next: OwnedUiExitReadiness) => { current = next; }, admittedCount: () => (admitted ? 1 : 0) };
}

async function host(lifecycle: () => OwnedUiSessionLifecyclePort | null) {
  const identity = { sessionId: randomUUID(), sessionBindingGeneration: 1, disposed: false, currentHistorySessionId: () => identity.sessionId };
  const backend = { identity, session: { onEvent: () => () => {} } } as unknown as OwnedUiSessionBackend;
  const settings = new OwnedSettingsManager({ configDir: join(root, "profile"), profileId: "a1" });
  const runtimeId = randomUUID();
  const control = await startIntegrationControl(backend, settings, join(root, "runtime"), runtimeId, undefined, lifecycle);
  controls.push(control);
  const target = { scope: "session" as const, sessionId: identity.sessionId, runtimeId };
  const call = async (type: string, id = randomUUID().slice(0, 8)) => {
    const request = { version: 1, id, type, target };
    const response = await requestSessionControl({ runtimeDir: join(root, "runtime"), sessionId: identity.sessionId, runtimeId, payload: request }) as { success: boolean; data?: unknown; error?: { code: string } };
    if (response.success) assertIntegrationResponse(response, parseIntegrationRequest(request));
    return response;
  };
  return { identity, settings, target, call };
}

describe("session exit control over the private transport", () => {
  it("reports session-unavailable until the shell exists, then answers the shell's snapshot", async () => {
    let shell: OwnedUiSessionLifecyclePort | null = null;
    const { call, target } = await host(() => shell);
    expect(await call("session.lifecycle")).toMatchObject({ success: false, error: { code: "session-unavailable" } });
    expect(await call("session.exit")).toMatchObject({ success: false, error: { code: "session-unavailable" } });
    const double = shellDouble({ ...idle, lifecycle: "busy", editorEmpty: false, exitAdmissible: false, blockers: ["session-busy", "editor-not-empty"] });
    shell = double.port;
    expect(await call("session.lifecycle")).toMatchObject({ success: true, command: "session.lifecycle", data: { target, lifecycle: "busy", editorEmpty: false, exitAdmissible: false, blockers: ["session-busy", "editor-not-empty"] } });
    expect(await call("session.exit")).toMatchObject({ success: false, command: "session.exit", error: { code: "session-busy" } });
    expect(double.admittedCount()).toBe(0);
  });

  it("admits exactly one of several concurrent exit requests and keeps settings operations working", async () => {
    const double = shellDouble();
    const { call, target } = await host(() => double.port);
    const responses = await Promise.all(["one", "two", "three"].map(id => call("session.exit", id)));
    const admitted = responses.filter(response => response.success);
    expect(admitted).toHaveLength(1);
    expect(admitted[0]).toMatchObject({ data: { target, status: "admitted", lifecycle: "stopping" } });
    expect(responses.filter(response => !response.success).map(response => response.error?.code)).toEqual(["session-stopping", "session-stopping"]);
    expect(double.admittedCount()).toBe(1);
    expect(await call("session.lifecycle")).toMatchObject({ success: true, data: { exitAdmissible: false, blockers: ["session-stopping"] } });
    // The handler stays shared: color control over the same endpoint is unchanged.
    const request = { version: 1, id: "color", type: "settings.get", setting: "accentColor", target };
    const color = await requestSessionControl({ runtimeDir: join(root, "runtime"), sessionId: target.sessionId, runtimeId: target.runtimeId, payload: request });
    expect(color).toMatchObject({ success: true, data: { setting: "accentColor", effectiveValue: "blue" } });
  });

  it("refuses a disposed backend before consulting the shell", async () => {
    const double = shellDouble();
    const { call, identity } = await host(() => double.port);
    identity.disposed = true;
    // The transport-level refusal reaches the client as a structured failure, not an envelope.
    await expect(call("session.exit")).rejects.toMatchObject({ code: "session-unavailable" });
    expect(double.port.requestExit).not.toHaveBeenCalled();
  });
});
