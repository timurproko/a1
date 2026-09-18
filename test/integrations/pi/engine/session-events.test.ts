import { describe, expect, it } from "vitest";
import type { OwnedUiTranscriptBlock } from "../../../../src/contracts/owned-ui/index.js";
import type { PiEmittedEvent } from "../../../../src/integrations/pi/engine/event-delivery.js";
import { PiSessionEvents, type PiSessionEventPorts } from "../../../../src/integrations/pi/engine/session-events.js";
import { PiTranscriptProjection } from "../../../../src/integrations/pi/engine/transcript-projection.js";

function harness(overrides: Partial<PiSessionEventPorts> = {}) {
  const calls: string[] = [];
  const emitted: PiEmittedEvent[] = [];
  const state = { generation: 1, messages: [] as unknown[], transcript: [] as OwnedUiTranscriptBlock[] };
  const projection = new PiTranscriptProjection({ retryAttempt: () => 0, blockChanged: block => { emitted.push({ type: "transcript-block", block }); } });
  const events = new PiSessionEvents(projection, {
    sessionGeneration: () => state.generation,
    sessionMessages: () => state.messages,
    activeModel: () => ({ providerId: "openai", modelId: "gpt-5", displayName: "GPT-5" }),
    replaceTranscript: blocks => { state.transcript = blocks; projection.replace(blocks); calls.push(`transcript:${blocks.length}`); },
    emit: value => { emitted.push(value); },
    emitView: () => { calls.push("view"); },
    enterWork: message => { calls.push(`work:${message}`); },
    leaveWork: () => { calls.push("idle"); },
    workProgress: percent => { calls.push(`progress:${percent}`); },
    queueChanged: queued => { calls.push(`queue:${queued.join(",")}`); },
    thinkingLevelChanged: level => { calls.push(`thinking:${level}`); },
    usageInvalidated: () => { calls.push("usage"); },
    compactionStarted: () => { calls.push("compaction-start"); },
    compactionEnded: () => { calls.push("compaction-end"); },
    deliverQueuedAfterCompaction: () => { calls.push("deliver-queued"); },
    ...overrides,
  });
  return { events, projection, calls, emitted, state, types: () => emitted.map(event => event.type).filter(type => type !== "transcript-block") };
}

const assistant = (text: string, extra: Record<string, unknown> = {}) => ({ role: "assistant", content: [{ type: "text", text }], timestamp: 1_000, usage: { input: 1 }, ...extra });

describe("PiSessionEvents", () => {
  it("counts runs and completed assistant responses and emits the semantic run events around work states", () => {
    const { events, calls, emitted, state, types } = harness();
    events.handle({ type: "agent_start" });
    expect([events.runSequence, events.responseSequence]).toEqual([1, 0]);
    events.handle({ type: "message_start", message: assistant("par") });
    events.handle({ type: "message_end", message: assistant("partial answer", { stopReason: "stop" }) });
    expect(events.responseSequence).toBe(1);
    state.messages = [assistant("partial answer", { stopReason: "stop" })];
    events.handle({ type: "agent_settled" });
    expect(types()).toEqual(["agent-run-started", "assistant-message-completed", "agent-run-settled"]);
    expect(emitted.some(event => event.type === "transcript-block")).toBe(true);
    const completed = emitted.find(event => event.type === "assistant-message-completed");
    expect(completed).toMatchObject({ runSequence: 1, responseSequence: 1, successful: true, toolContinuation: false, model: { modelId: "gpt-5" } });
    expect(emitted.at(-1)).toMatchObject({ type: "agent-run-settled", successful: true, assistantMessageCount: 1 });
    expect(calls).toEqual(["usage", "work:Working", "usage", "usage", "usage", "transcript:1", "idle", "view"]);
  });

  it("returns to the working state after a retry inside a run and ends every state at settlement", () => {
    const { events, calls } = harness();
    events.handle({ type: "agent_start" });
    events.handle({ type: "auto_retry_start" });
    events.handle({ type: "auto_retry_end" });
    events.handle({ type: "compaction_start" });
    events.handle({ type: "turn_end", message: assistant("done"), toolResults: [] });
    events.handle({ type: "compaction_end", reason: "auto" });
    events.handle({ type: "agent_end", messages: [assistant("done")] });
    expect(calls.filter(call => call.startsWith("work") || call === "idle" || call.startsWith("compaction"))).toEqual([
      "work:Working", "work:Retrying", "work:Working", "work:Compacting", "compaction-start", "compaction-end", "work:Working", "idle",
    ]);
    events.abandonRun();
    events.handle({ type: "auto_retry_end" });
    expect(calls.filter(call => call === "idle")).toHaveLength(1);
  });

  it("publishes compaction progress only while compacting and delivers queued input after a manual compaction", () => {
    const { events, calls } = harness();
    events.compactionProgress(10);
    events.handle({ type: "compaction_start" });
    events.compactionProgress(40);
    events.handle({ type: "compaction_end", reason: "manual" });
    events.compactionProgress(90);
    events.handle({ type: "queue_update", steering: ["s1"], followUp: ["f1", 2] });
    events.handle({ type: "thinking_level_changed", level: "high" });
    expect(calls.filter(call => !call.startsWith("usage"))).toEqual(["work:Compacting", "compaction-start", "progress:40", "compaction-end", "idle", "deliver-queued", "queue:s1,f1", "thinking:high"]);
    events.reset();
    expect([events.runSequence, events.responseSequence]).toEqual([0, 0]);
  });
});
