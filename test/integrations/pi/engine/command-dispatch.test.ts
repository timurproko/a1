import { describe, expect, it } from "vitest";
import type { OwnedUiCommand } from "../../../../src/contracts/owned-ui/index.js";
import { PiCommandDispatch, type PiCommandDispatchPorts } from "../../../../src/integrations/pi/engine/command-dispatch.js";
import type { PiEmittedEvent } from "../../../../src/integrations/pi/engine/event-delivery.js";

function harness(overrides: Partial<PiCommandDispatchPorts> = {}) {
  const state = { running: 0, generation: 1, notRunning: false, admissionStopped: false, workflows: 0, performed: [] as string[], diagnostics: [] as string[], views: 0 };
  const events: PiEmittedEvent[] = [];
  let release: (() => void) | undefined;
  let fail: ((error: Error) => void) | undefined;
  const dispatch = new PiCommandDispatch({
    sessionId: () => "owned-1",
    notRunning: () => state.notRunning,
    admissionStopped: () => state.admissionStopped,
    pendingWorkflowCount: () => state.workflows,
    sessionGeneration: () => state.generation,
    beginRunning: () => { state.running += 1; },
    endRunning: () => { state.running -= 1; },
    perform: async command => {
      state.performed.push(command.correlationId);
      await new Promise<void>((resolve, reject) => { release = resolve; fail = reject; });
    },
    emit: value => { events.push(value); },
    emitView: () => { state.views += 1; },
    diagnostic: (severity, code, message) => { state.diagnostics.push(`${severity}:${code}:${message}`); },
    ...overrides,
  });
  const outcomes = () => events.flatMap(event => event.type === "command-outcome" ? [`${event.correlationId}:${event.outcome}`] : []);
  return { dispatch, state, events, outcomes, release: () => release?.(), fail: (message: string) => fail?.(new Error(message)) };
}

const command = (correlationId: string, sessionId = "owned-1"): OwnedUiCommand => ({ type: "abort", sessionId, correlationId });

describe("PiCommandDispatch", () => {
  it("rejects a foreign session, a stopped adapter, and a spent budget without performing anything", async () => {
    const { dispatch, state, outcomes } = harness();
    expect(await dispatch.execute(command("other", "someone-else"))).toEqual({ outcome: "rejected", diagnostic: "command targets a different owned session" });
    state.notRunning = true;
    expect(await dispatch.execute(command("stopped"))).toMatchObject({ outcome: "rejected", diagnostic: "engine adapter is not running" });
    state.notRunning = false;
    state.workflows = 32;
    expect(await dispatch.execute(command("budget"))).toEqual({ outcome: "rejected", diagnostic: null });
    expect(outcomes()).toEqual(["other:rejected", "stopped:rejected"]);
    expect(state.performed).toEqual([]);
  });

  it("emits accepted then completed, tracks the active id and running count, and remembers the result for a retried id", async () => {
    const { dispatch, state, outcomes, release } = harness();
    const first = dispatch.execute(command("c1"));
    await Promise.resolve();
    expect(dispatch.activeCommandIds).toEqual(["c1"]);
    expect([dispatch.pendingCount, dispatch.isPending("c1"), state.running]).toEqual([1, true, 1]);
    expect(await dispatch.execute(command("c1"))).toEqual({ outcome: "rejected", diagnostic: "duplicate engine command correlation id" });
    release();
    expect(await first).toEqual({ outcome: "completed", diagnostic: null });
    expect([dispatch.pendingCount, state.running, state.views]).toEqual([0, 0, 1]);
    expect(await dispatch.execute(command("c1"))).toEqual({ outcome: "completed", diagnostic: null });
    expect(outcomes()).toEqual(["c1:accepted", "c1:rejected", "c1:completed"]);
    dispatch.reset();
    expect(dispatch.activeCommandIds).toEqual([]);
  });

  it("turns a thrown perform into a failed outcome with a diagnostic, and skips the view when the generation moved", async () => {
    const { dispatch, state, outcomes, fail } = harness();
    const pending = dispatch.execute(command("c2"));
    await Promise.resolve();
    state.generation = 2;
    fail("engine exploded");
    expect(await pending).toEqual({ outcome: "failed", diagnostic: "engine exploded" });
    expect(state.diagnostics).toEqual(["error:engine-command:engine exploded"]);
    expect(state.views).toBe(0);
    expect(outcomes()).toEqual(["c2:accepted", "c2:failed"]);
  });

  it("cancels admitted commands out of band except the listed types", async () => {
    const { dispatch, outcomes } = harness();
    const abort = dispatch.execute(command("c3"));
    const shutdown = dispatch.execute({ type: "shutdown", sessionId: "owned-1", correlationId: "c4" });
    await Promise.resolve();
    dispatch.cancelPending(["shutdown"]);
    expect(await abort).toEqual({ outcome: "failed", diagnostic: null });
    expect(dispatch.isPending("c4")).toBe(true);
    dispatch.cancelPending();
    expect(await shutdown).toEqual({ outcome: "failed", diagnostic: null });
    expect(outcomes()).toEqual(["c3:accepted", "c4:accepted", "c3:failed", "c4:failed"]);
  });
});
