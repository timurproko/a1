import { describe, expect, it } from "vitest";
import type { OwnedUiEvent, OwnedUiTranscriptBlock } from "../../../../src/contracts/owned-ui/index.js";
import { MAX_PENDING_EVENT_BYTES, PendingEngineDelivery, replaceableEventKey } from "../../../../src/integrations/pi/engine/pending-delivery.js";

const base = { sessionId: "test", sequence: 1 };
function block(id: string, text: string, sequence: number, status: OwnedUiTranscriptBlock["status"] = "live"): OwnedUiEvent {
  return { ...base, sequence, type: "transcript-block", block: { id, text, status, revision: sequence, kind: "assistant", title: null, payload: null } };
}
function barrier(sequence: number): OwnedUiEvent { return { ...base, sequence, type: "command-outcome", correlationId: String(sequence), outcome: "completed", diagnostic: null }; }
function drain(queue: PendingEngineDelivery): OwnedUiEvent[] {
  const events: OwnedUiEvent[] = [];
  while (queue.size) events.push(queue.shift()!.event);
  return events;
}

describe("semantic pending engine delivery", () => {
  it("classifies every owned event kind conservatively using listener side effects", () => {
    const kinds: Record<OwnedUiEvent["type"], boolean> = {
      "transcript-block": true, "session-view": false, status: false, "editor-state": false,
      "terminal-surface": false, "session-lifecycle": false, "agent-run-started": false,
      "agent-run-settled": false, "assistant-message-completed": false, "command-outcome": false,
      diagnostic: false, dialog: false, overlay: false, customization: false,
    };
    for (const [type, replaceable] of Object.entries(kinds)) {
      const event = type === "transcript-block" ? block("a", "a", 1) : { ...base, type } as OwnedUiEvent;
      expect(replaceableEventKey(event) !== null, type).toBe(replaceable);
    }
    expect(replaceableEventKey(block("a", "final", 1, "finalized"))).toBeNull();
    expect(replaceableEventKey({ ...base, type: "transcript-block", block: {
      id: "tool", text: "error", revision: 1, status: "live", kind: "tool-call", title: null, payload: { isError: true },
    } })).toBeNull();
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
    expect(queue.diagnostics().peakBytes).toBeLessThanOrEqual(MAX_PENDING_EVENT_BYTES);
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
    expect((queue.shift()!.event as Extract<OwnedUiEvent, { type: "transcript-block" }>).block.text).toHaveLength(100_000);
    drain(queue);
    current = block("a", "x".repeat(MAX_PENDING_EVENT_BYTES), 4);
    expect(queue.push(current, 1, () => current)).toBe(true);
    expect(queue.push(barrier(5), 1)).toBe(false);
    expect(queue.diagnostics().bytes).toBe(128);
    expect(drain(queue)).toEqual([current]);
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
