import { describe, expect, it } from "vitest";
import type { OwnedUiEvent, OwnedUiTranscriptBlock } from "../../../../src/contracts/owned-ui/index.js";
import { PendingEngineDelivery } from "../../../../src/integrations/pi/engine/pending-delivery.js";

const base = { sessionId: "test", sequence: 1 };
function block(id: string, text: string, sequence: number, status: OwnedUiTranscriptBlock["status"] = "live"): OwnedUiEvent {
  return { ...base, sequence, type: "transcript-block", block: { id, text, status, revision: sequence, kind: "assistant", title: null, payload: null } };
}
function barrier(sequence: number): OwnedUiEvent { return { ...base, sequence, type: "command-outcome", correlationId: String(sequence), outcome: "completed", diagnostic: null }; }
/** Whether the later of two queued events replaces the earlier one. */
function coalesces(first: OwnedUiEvent, second: OwnedUiEvent): boolean {
  const queue = new PendingEngineDelivery();
  queue.push(first, 1);
  queue.push(second, 1);
  return queue.size === 1;
}
function drain(queue: PendingEngineDelivery): OwnedUiEvent[] {
  const events: OwnedUiEvent[] = [];
  while (queue.size) { const pending = queue.shift()!; events.push(pending.event); pending.release?.(); }
  return events;
}

describe("semantic pending engine delivery", () => {
  it("shares large authoritative revisions while charging delivery-exclusive obsolete content", () => {
    const first = (block("a", "x".repeat(5 * 1024 * 1024), 1, "finalized") as Extract<OwnedUiEvent, { type: "transcript-block" }>).block;
    let current: readonly OwnedUiTranscriptBlock[] = Object.freeze([first]);
    const queue = new PendingEngineDelivery(undefined, () => current);
    const view = (sequence: number) => ({ ...base, sequence, type: "session-view", view: { transcript: current } }) as OwnedUiEvent;
    for (let sequence = 1; sequence <= 30; sequence++) expect(queue.push(view(sequence), 1)).toBe(true);
    expect(queue.diagnostics().bytes).toBeLessThan(32 * 1024);
    expect(drain(queue)).toHaveLength(30);
    expect(queue.diagnostics().bytes).toBe(0);
    expect(queue.push(view(31), 1)).toBe(true);
    current = Object.freeze([{ ...first, revision: 2, text: "new" }]);
    // Invariant: the large old revision is now genuinely retained only by the pending event.
    expect(queue.push(view(32), 1)).toBe(false);
    const consumed = queue.shift()!;
    const old = consumed.event as Extract<OwnedUiEvent, { type: "session-view" }>;
    expect(old.view.transcript[0]).toBe(first);
    consumed.release?.();
    expect(queue.push(view(33), 1)).toBe(true);
    drain(queue);
    expect(queue.diagnostics().bytes).toBe(0);
  });

  it("delivers a large finalized authoritative block and preserves barriers without lazy substitution", () => {
    const event = block("a", "x".repeat(5 * 1024 * 1024), 1, "finalized") as Extract<OwnedUiEvent, { type: "transcript-block" }>;
    const current = [event.block];
    const queue = new PendingEngineDelivery(undefined, () => current);
    expect(queue.push(event, 1)).toBe(true);
    expect(queue.push(barrier(2), 1)).toBe(true);
    expect(drain(queue)).toEqual([event, barrier(2)]);
    expect(queue.diagnostics().bytes).toBe(0);
  });

  it("classifies every owned event kind conservatively using listener side effects", () => {
    const kinds: Record<OwnedUiEvent["type"], boolean> = {
      "transcript-block": true, "session-view": false, status: false, "editor-state": false,
      "terminal-surface": false, "session-lifecycle": false, "agent-run-started": false,
      "agent-run-settled": false, "assistant-message-completed": false, "command-outcome": false,
      diagnostic: false, dialog: false, overlay: false, customization: false,
    };
    for (const [type, replaceable] of Object.entries(kinds)) {
      const event = (sequence: number) => type === "transcript-block" ? block("a", "a", sequence) : { ...base, sequence, type } as OwnedUiEvent;
      expect(coalesces(event(1), event(2)), type).toBe(replaceable);
    }
    expect(coalesces(block("a", "final", 1, "finalized"), block("a", "final", 2, "finalized"))).toBe(false);
    const failedTool = (sequence: number): OwnedUiEvent => ({ ...base, sequence, type: "transcript-block", block: {
      id: "tool", text: "error", revision: sequence, status: "live", kind: "tool-call", title: null, payload: { isError: true },
    } });
    expect(coalesces(failedTool(1), failedTool(2))).toBe(false);
  });

  it("matches an uncoalesced reference at every barrier through a 16,384 update / 32 block burst", () => {
    const queue = new PendingEngineDelivery();
    const reference = new Map<string, string>();
    const boundaries = new Map<number, Map<string, string>>();
    let sequence = 0;
    for (let update = 0; update < 16_384; update++) {
      const id = String(update % 32);
      const text = `${reference.get(id) ?? ""} ${update}`;
      reference.set(id, text);
      expect(queue.push(block(id, text, ++sequence), 1)).toBe(true);
      if (update % 2048 === 2047) {
        boundaries.set(++sequence, new Map(reference));
        expect(queue.push(barrier(sequence), 1)).toBe(true);
      }
    }
    for (const [id, text] of reference) expect(queue.push(block(id, text, ++sequence, "finalized"), 1)).toBe(true);
    const displayed = new Map<string, string>();
    let previous = 0;
    for (const event of drain(queue)) {
      expect(event.sequence).toBeGreaterThan(previous); previous = event.sequence;
      if (event.type === "transcript-block") displayed.set(event.block.id, event.block.text);
      else expect(displayed).toEqual(boundaries.get(event.sequence));
    }
    expect(displayed).toEqual(reference);
    expect(queue.diagnostics()).toMatchObject({ pending: 0, bytes: 0, protected: 0 });
    expect(queue.diagnostics().superseded).toBeGreaterThan(16_000);
    expect(queue.diagnostics().peakNodes).toBeLessThanOrEqual(1024);
    expect(queue.diagnostics().peakBytes).toBeLessThanOrEqual((8 * 1024 * 1024));
  });

  it("appends replacement at its source position and never crosses a protected barrier", () => {
    const queue = new PendingEngineDelivery();
    const events = [block("a", "1", 1), block("b", "2", 2), block("a", "3", 3), barrier(4), block("a", "5", 5), block("a", "6", 6, "finalized")];
    for (const event of events) expect(queue.push(event, 1)).toBe(true);
    expect(drain(queue).map(event => event.sequence)).toEqual([2, 3, 4, 5, 6]);
  });

  it("uses compact authoritative markers, freezes them at boundaries, and refuses an unsafe large boundary", () => {
    const queue = new PendingEngineDelivery();
    let current = block("a", "x".repeat(100_000), 1);
    expect(queue.push(current, 1, () => current)).toBe(true);
    expect(queue.diagnostics().bytes).toBe(128);
    expect(queue.push(barrier(2), 1)).toBe(true);
    current = block("a", "later", 3);
    const consumed = queue.shift()!;
    expect((consumed.event as Extract<OwnedUiEvent, { type: "transcript-block" }>).block.text).toHaveLength(100_000);
    consumed.release?.();
    drain(queue);
    current = block("a", "x".repeat((8 * 1024 * 1024)), 4);
    expect(queue.push(current, 1, () => current)).toBe(true);
    expect(queue.push(barrier(5), 1)).toBe(false);
    expect(queue.diagnostics().bytes).toBe(128);
    expect(drain(queue)).toEqual([current]);
  });

  it("balances snapshot leases on replacement, consumption, sealing, rejection, and generation discard", () => {
    const retained = new Set<number>();
    const queue = new PendingEngineDelivery(event => {
      retained.add(event.sequence);
      return () => { expect(retained.delete(event.sequence)).toBe(true); };
    });
    expect(queue.push(block("a", "first", 1), 1)).toBe(true);
    expect(queue.push(block("a", "second", 2), 1)).toBe(true);
    expect([...retained]).toEqual([2]);
    const consumed = queue.shift()!;
    expect([...retained]).toEqual([2]);
    consumed.release!();
    const large = block("a", "x".repeat(100_000), 3);
    expect(queue.push(large, 1, () => large)).toBe(true);
    expect(retained.size).toBe(0);
    expect(queue.seal()).toBe(true);
    expect([...retained]).toEqual([3]);
    queue.discardObsolete(2);
    expect(retained.size).toBe(0);
    for (let n = 4; n < 1028; n++) expect(queue.push(barrier(n), 2)).toBe(true);
    expect(queue.push(barrier(1028), 2)).toBe(false);
    expect(retained.has(1028)).toBe(false);
    while (queue.size) queue.shift()!.release!();
    expect(retained.size).toBe(0);
  });

  it("never evicts protected events and invalidates obsolete state without invoking stale resolvers", () => {
    const queue = new PendingEngineDelivery();
    for (let i = 0; i < 1024; i++) expect(queue.push(barrier(i), 1)).toBe(true);
    expect(queue.push(barrier(1024), 1)).toBe(false);
    expect(drain(queue)).toHaveLength(1024);
    const event = block("old", "x".repeat(100_000), 1025);
    queue.push(event, 1, () => { throw new Error("obsolete callback"); });
    expect(queue.discardObsolete(2)).toBe(1);
    expect(queue.push(barrier(1026), 2)).toBe(true);
    expect(drain(queue)).toEqual([barrier(1026)]);
  });
});
