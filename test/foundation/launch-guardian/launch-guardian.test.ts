import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import type {
  CommandResult,
  LaunchInstanceOutcome,
  LaunchInstanceStopIntent,
  SupervisorCommand,
  SupervisorSnapshot,
} from "../../../src/foundation/lifecycle/index.js";
import { runLaunchGuardian } from "../../../src/foundation/launch-guardian/index.js";
import type { NativeProcessInspector, ProcessContainment } from "../../../src/foundation/process-containment/index.js";

const guardianIdentity = { pid: 8000, startIdentity: "8000:guardian" };
const rootIdentity = { pid: 8001, startIdentity: "8001:root" };

class FakeControl extends EventEmitter {
  readonly commands: SupervisorCommand[] = [];
  readonly connect = vi.fn(async (): Promise<SupervisorSnapshot> => ({ revision: 0, activeInstances: [] }));
  readonly close = vi.fn();

  async command(command: SupervisorCommand): Promise<CommandResult> {
    this.commands.push(command);
    return { requestId: command.requestId, ok: true, revision: this.commands.length };
  }

  stop(instanceId: string, reason: LaunchInstanceStopIntent["reason"]): void {
    this.emit("stopIntent", { type: "stop-launch-instance", requestId: "stop", instanceId, reason } satisfies LaunchInstanceStopIntent);
  }
}

describe("launch guardian", () => {
  it("creates, activates, closes, and completes one profile-neutral instance", async () => {
    const control = new FakeControl();
    const fixture = containmentFixture(Promise.resolve({ kind: "exited", exitCode: 0 }));
    const code = await runLaunchGuardian(options(control, fixture.containment, fixture.inspector));

    expect(code).toBe(0);
    expect(control.commands.map(command => command.type)).toEqual([
      "create-launch-instance", "activate-launch-instance", "complete-launch-instance",
    ]);
    expect(control.commands[0]).toMatchObject({ profileId: "sandbox", guardianIdentity });
    expect(control.commands[1]).toMatchObject({ rootIdentity, containmentIdentity: fixture.containment.identity });
    expect(fixture.containment.close).toHaveBeenCalledOnce();
    expect(control.close).toHaveBeenCalledOnce();
  });

  it("preserves the selected runtime exit code without synthetic terminal output", async () => {
    const control = new FakeControl();
    const fixture = containmentFixture(Promise.resolve({ kind: "exited", exitCode: 17 }));
    await expect(runLaunchGuardian(options(control, fixture.containment, fixture.inspector))).resolves.toBe(17);
    expect(control.commands.at(-1)).toMatchObject({ outcome: { kind: "exited", exitCode: 17 } });
  });

  it("uses the same bounded containment close path for a supervisor stop intent", async () => {
    const control = new FakeControl();
    const fixture = containmentFixture(new Promise<LaunchInstanceOutcome>(() => undefined));
    const running = runLaunchGuardian(options(control, fixture.containment, fixture.inspector));
    await vi.waitFor(() => expect(control.commands.map(command => command.type)).toContain("activate-launch-instance"));
    const instanceId = control.commands.find(command => command.type === "create-launch-instance")?.instanceId;
    if (!instanceId) throw new Error("test launch instance was not created");
    control.stop(instanceId, "update");

    await expect(running).resolves.toBe(0);
    expect(control.commands.map(command => command.type)).toEqual([
      "create-launch-instance", "activate-launch-instance", "begin-launch-instance-stop", "complete-launch-instance",
    ]);
    expect(fixture.containment.stop).toHaveBeenCalledWith(false);
    expect(fixture.containment.waitForEmpty).toHaveBeenCalled();
  });

  it("closes local containment without claiming completion after supervisor disconnect", async () => {
    const control = new FakeControl();
    const fixture = containmentFixture(new Promise<LaunchInstanceOutcome>(() => undefined));
    const running = runLaunchGuardian(options(control, fixture.containment, fixture.inspector));
    await vi.waitFor(() => expect(control.commands.map(command => command.type)).toContain("activate-launch-instance"));
    control.emit("disconnect");

    await expect(running).resolves.toBe(1);
    expect(control.commands.map(command => command.type)).toEqual(["create-launch-instance", "activate-launch-instance"]);
    expect(fixture.containment.stop).toHaveBeenCalledWith(false);
    expect(fixture.containment.close).toHaveBeenCalled();
  });

  it("fails concisely before control startup when containment is unsupported", async () => {
    const control = new FakeControl();
    const fixture = containmentFixture(Promise.resolve({ kind: "exited", exitCode: 0 }));
    const unsupported = Object.assign(new Error("process containment is not certified for darwin-arm64"), { code: "CONTAINMENT_UNSUPPORTED" });
    await expect(runLaunchGuardian({
      ...options(control, fixture.containment, fixture.inspector),
      ensureHelper: async () => { throw unsupported; },
    })).rejects.toMatchObject({ code: "CONTAINMENT_UNSUPPORTED" });
    expect(control.connect).not.toHaveBeenCalled();
    expect(control.commands).toEqual([]);
  });

  it("records startup failure and closes partial containment", async () => {
    const control = new FakeControl();
    const fixture = containmentFixture(Promise.resolve({ kind: "exited", exitCode: 0 }));
    fixture.containment.spawn.mockRejectedValueOnce(Object.assign(new Error("helper unavailable"), { code: "ENOENT" }));

    await expect(runLaunchGuardian(options(control, fixture.containment, fixture.inspector))).rejects.toThrow(/helper unavailable/);
    expect(control.commands.map(command => command.type)).toEqual(["create-launch-instance", "complete-launch-instance"]);
    expect(control.commands[1]).toMatchObject({ outcome: { kind: "guardian-error", code: "ENOENT" } });
    expect(fixture.containment.close).toHaveBeenCalled();
  });
});

function options(control: FakeControl, containment: ProcessContainment, inspector: NativeProcessInspector) {
  return {
    profileId: "sandbox" as const,
    releaseRoot: "D:/release",
    uiEntry: "D:/release/bin/a1-ui.js",
    environment: { A1_ENDPOINT: "test-endpoint", A1_RELEASE_ID: "release-1" },
    cwd: "D:/workspace",
    helperPath: "guardian-fixture",
    control,
    containment,
    inspector,
    ensureHelper: async () => undefined,
  };
}

function containmentFixture(outcome: Promise<LaunchInstanceOutcome>) {
  const inspector: NativeProcessInspector = {
    observe: vi.fn(async pid => ({ ...guardianIdentity, pid })),
    matches: vi.fn(async identity => identity.startIdentity === rootIdentity.startIdentity),
  };
  const containment = {
    identity: { provider: "test-containment", token: "scope-1" },
    spawn: vi.fn(async () => ({ identity: rootIdentity, outcome })),
    contains: vi.fn(async identity => identity.startIdentity === rootIdentity.startIdentity),
    stop: vi.fn(async () => undefined),
    waitForEmpty: vi.fn(async () => true),
    close: vi.fn(async () => undefined),
  } as ProcessContainment & {
    spawn: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    waitForEmpty: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
  return { inspector, containment };
}
