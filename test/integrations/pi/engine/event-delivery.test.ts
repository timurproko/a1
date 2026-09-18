import { describe, expect, it } from "vitest";
import type { OwnedUiEvent, OwnedUiTranscriptBlock } from "../../../../src/contracts/owned-ui/index.js";
import { PiEventDelivery, type PiEventDeliveryPorts } from "../../../../src/integrations/pi/engine/event-delivery.js";
import { MAX_PENDING_EVENTS } from "../../../../src/integrations/pi/engine/pending-delivery.js";

function harness(overrides: Partial<PiEventDeliveryPorts> = {}) {
  const blocks = new Map<string, OwnedUiTranscriptBlock>();
  const state = { generation: 1, cancellations: 0, reconciliations: [] as boolean[], listenerFailures: [] as string[], pending: new Set<string>() };
  let releaseCancellation: (() => void) | undefined;
  const delivery = new PiEventDelivery({
    sessionId: () => "session",
    sessionGeneration: () => state.generation,
    transcriptBlock: id => blocks.get(id),
    retainEvent: () => () => {},
    isPendingCommand: id => state.pending.has(id),
    cancelForOverload: () => { state.cancellations += 1; return new Promise<void>(resolve => { releaseCancellation = resolve; }); },
    reconcileOverload: async cancelled => { state.reconciliations.push(cancelled); },
    listenerFailed: message => { state.listenerFailures.push(message); },
    ...overrides,
  });
  const received: OwnedUiEvent[] = [];
  const unsubscribe = delivery.subscribe(event => received.push(event), delivery.stamp({ type: "agent-run-started" }));
  return { delivery, received, state, blocks, unsubscribe, releaseCancellation: () => releaseCancellation?.() };
}

const status = (title: string): Extract<OwnedUiEvent, { type: "status" }>["status"] => ({ title, workingMessage: null, diagnostics: [], badges: [] });
function liveBlock(id: string, text: string, revision: number): OwnedUiTranscriptBlock {
  return { id, text, status: "live", revision, kind: "assistant", title: null, payload: null };
}
const macrotask = () => new Promise<void>(resolve => { setImmediate(resolve); });

describe("PiEventDelivery", () => {
  it("stamps sequence numbers in emit order and delivers them in that order after the subscription's initial event", async () => {
    const { delivery, received } = harness();
    expect(received.map(event => event.sequence)).toEqual([1]);
    const first = delivery.emit({ type: "status", status: status("one") });
    const second = delivery.emit({ type: "status", status: status("two") });
    expect([first.sequence, second.sequence, delivery.sequence]).toEqual([2, 3, 3]);
    expect(received).toHaveLength(1);
    await delivery.settle();
    expect(received.map(event => [event.type, event.sequence, event.sessionId])).toEqual([
      ["agent-run-started", 1, "session"], ["status", 2, "session"], ["status", 3, "session"],
    ]);
    expect(delivery.diagnostics()).toMatchObject({ pending: 0, overloads: 0, recovering: false, invalidatedEvents: 0 });
  });

  it("delivers one queued event per event-loop turn so input keeps its turn during a burst", async () => {
    const { delivery, received } = harness();
    for (let index = 0; index < 3; index += 1) delivery.emit({ type: "status", status: status(String(index)) });
    await Promise.resolve(); await Promise.resolve();
    expect(received).toHaveLength(2);
    await macrotask();
    expect(received).toHaveLength(3);
    await macrotask();
    expect(received).toHaveLength(4);
  });

  it("coalesces a live block's updates to the newest revision and materializes the block from the port", async () => {
    const { delivery, received, blocks } = harness();
    for (const [text, revision] of [["a", 1], ["ab", 2], ["abc", 3]] as const) {
      blocks.set("block", liveBlock("block", text, revision));
      delivery.emit({ type: "transcript-block", block: blocks.get("block")! });
    }
    delivery.emit({ type: "editor-state", editor: { text: "", queuedSubmissions: [], selection: null, cursorOffset: 0, historyRevision: 0, submitEnabled: true } });
    await delivery.settle();
    const delivered = received.filter(event => event.type === "transcript-block");
    expect(delivered).toHaveLength(1);
    expect(delivered[0]).toMatchObject({ sequence: 4, block: { text: "abc", revision: 3 } });
    expect(received.at(-1)?.type).toBe("editor-state");
    expect(delivery.diagnostics().superseded).toBe(2);
  });

  it("invalidates queued events from a replaced session generation but still delivers command outcomes", async () => {
    const { delivery, received, state } = harness();
    delivery.emit({ type: "status", status: status("stale") });
    delivery.emit({ type: "command-outcome", correlationId: "c1", outcome: "completed", diagnostic: null });
    state.generation = 2;
    delivery.emit({ type: "status", status: status("fresh") });
    await delivery.settle();
    expect(received.slice(1).map(event => event.type === "status" ? event.status.title : event.type)).toEqual(["command-outcome", "fresh"]);
    expect(delivery.diagnostics().invalidatedEvents).toBe(1);
    delivery.emit({ type: "status", status: status("queued-before-switch") });
    state.generation = 3;
    delivery.discardObsolete(3);
    await delivery.settle();
    expect(received).toHaveLength(3);
    expect(delivery.diagnostics().invalidatedEvents).toBe(2);
  });

  it("enters one overload on saturation, reserves pending command outcomes, and replays them to the reconciliation in arrival order", async () => {
    const { delivery, received, state, releaseCancellation } = harness();
    state.pending.add("first").add("second");
    for (let index = 0; index < MAX_PENDING_EVENTS; index += 1) delivery.emit({ type: "status", status: status(String(index)) });
    expect(delivery.overloaded).toBe(false);
    delivery.emit({ type: "command-outcome", correlationId: "first", outcome: "cancelled", diagnostic: null });
    expect(delivery.overloaded).toBe(true);
    expect(delivery.failed).toBe(true);
    expect(state.cancellations).toBe(1);
    delivery.emit({ type: "command-outcome", correlationId: "second", outcome: "failed", diagnostic: null });
    delivery.emit({ type: "command-outcome", correlationId: "unknown", outcome: "failed", diagnostic: null });
    delivery.emit({ type: "status", status: status("dropped") });
    delivery.beginOverload();
    expect(delivery.diagnostics()).toMatchObject({ overloads: 1, recovering: true, reservedOutcomes: 2 });
    releaseCancellation();
    await delivery.settle();
    expect(state.reconciliations).toEqual([true]);
    expect(delivery.takeReservedOutcomes()).toEqual([]);
    expect(delivery.overloaded).toBe(false);
    expect(received.filter(event => event.type === "status")).toHaveLength(MAX_PENDING_EVENTS);
    expect(received.some(event => event.type === "status" && event.status.title === "dropped")).toBe(false);
  });

  it("hands the reconciliation the reserved outcomes and reports a failed cancellation as not cancelled", async () => {
    const taken: [string, string][] = [];
    const { delivery, state } = harness({
      cancelForOverload: () => Promise.reject(new Error("abort failed")),
      reconcileOverload: async cancelled => {
        state.reconciliations.push(cancelled);
        for (const [id, outcome] of delivery.takeReservedOutcomes()) taken.push([id, outcome.outcome]);
      },
    });
    state.pending.add("a").add("b");
    for (let index = 0; index < MAX_PENDING_EVENTS; index += 1) delivery.emit({ type: "status", status: status(String(index)) });
    delivery.emit({ type: "command-outcome", correlationId: "b", outcome: "failed", diagnostic: null });
    delivery.emit({ type: "command-outcome", correlationId: "a", outcome: "cancelled", diagnostic: null });
    await delivery.settle();
    expect(state.reconciliations).toEqual([false]);
    expect(taken).toEqual([["b", "failed"], ["a", "cancelled"]]);
    expect(delivery.overloaded).toBe(false);
  });

  it("marks delivery failed when a listener throws, reports it through the port, and keeps serving other listeners", async () => {
    const { delivery, received, state } = harness();
    const unsubscribe = delivery.subscribe(event => { if (event.type === "status") throw new Error("listener broke"); }, delivery.stamp({ type: "agent-run-started" }));
    delivery.emit({ type: "status", status: status("after") });
    await delivery.settle();
    expect(state.listenerFailures).toEqual(["listener broke"]);
    expect(delivery.failed).toBe(true);
    expect(received.at(-1)).toMatchObject({ type: "status", sequence: 3 });
    delivery.clearFailure();
    expect(delivery.failed).toBe(false);
    unsubscribe();
    delivery.emit({ type: "status", status: status("alone") });
    await delivery.settle();
    expect(state.listenerFailures).toHaveLength(1);
    expect(delivery.failed).toBe(false);
  });

  it("skips out-of-band events stamped no later than the listener's initial event", () => {
    const { delivery, received } = harness();
    const earlier = delivery.stamp({ type: "status", status: status("late-subscriber") });
    const late: OwnedUiEvent[] = [];
    delivery.subscribe(event => late.push(event), delivery.stamp({ type: "agent-run-started" }));
    delivery.deliverNow(earlier);
    expect(received.map(event => event.sequence)).toEqual([1, 2]);
    expect(late.map(event => event.sequence)).toEqual([3]);
  });
});
