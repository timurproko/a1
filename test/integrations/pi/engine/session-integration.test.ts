import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import {
  PiSessionCommandIntegration,
  subscribeToPiSessionEvents,
  type PiDocumentedSessionCommands,
} from "../../../../src/integrations/pi/engine/index.js";

class Commands implements PiDocumentedSessionCommands {
  isStreaming = false;
  isRetrying = false;
  isCompacting = false;
  readonly calls: string[] = [];
  async prompt(text: string): Promise<void> { this.calls.push(`prompt:${text}`); }
  async steer(text: string): Promise<void> { this.calls.push(`steer:${text}`); }
  async followUp(text: string): Promise<void> { this.calls.push(`follow:${text}`); }
  async abort(): Promise<void> { this.calls.push("abort"); }
  abortRetry(): void { this.calls.push("abort-retry"); }
  abortCompaction(): void { this.calls.push("abort-compaction"); }
  async compact(): Promise<unknown> { this.calls.push("compact"); return { summary: "ok" }; }
  async executeBash(command: string): Promise<unknown> { this.calls.push(`bash:${command}`); return { output: command, exitCode: 0, cancelled: false, truncated: false }; }
}

describe("documented Pi session integration", () => {
  it("routes prompt, steer/follow-up queues, retry, compaction, and bash with settlement", async () => {
    const session = new Commands();
    const integration = new PiSessionCommandIntegration(session);
    await expect(integration.execute({ type: "retry" })).resolves.toEqual({ outcome: "rejected" });
    await integration.execute({ type: "prompt", text: "first" });
    await integration.execute({ type: "steer", text: "now" });
    await integration.execute({ type: "follow-up", text: "later" });
    await integration.execute({ type: "retry" });
    await integration.execute({ type: "compact" });
    await expect(integration.execute({ type: "bash", command: "echo ok", excludeFromContext: false })).resolves.toMatchObject({ outcome: "completed" });
    expect(session.calls).toEqual(["prompt:first", "steer:now", "follow:later", "prompt:later", "compact", "bash:echo ok"]);
  });

  it("cancels retry, compaction, and active work in documented order", async () => {
    const session = new Commands();
    session.isRetrying = true;
    session.isCompacting = true;
    const integration = new PiSessionCommandIntegration(session);
    await expect(integration.execute({ type: "abort" })).resolves.toEqual({ outcome: "cancelled" });
    expect(session.calls).toEqual(["abort-retry", "abort-compaction", "abort"]);
  });

  it("rejects malformed bash results at the boundary", async () => {
    const session = new Commands();
    session.executeBash = async () => ({ exitCode: "zero" });
    await expect(new PiSessionCommandIntegration(session).execute({ type: "bash", command: "bad", excludeFromContext: true })).rejects.toThrow(/malformed/);
  });

  it("converts supported events in subscription order and bounds malformed events", () => {
    let listener: ((event: AgentSessionEvent) => void) | undefined;
    const session = { subscribe(callback: (event: AgentSessionEvent) => void) { listener = callback; return () => { listener = undefined; }; } };
    const events: unknown[] = [];
    const diagnostics: string[] = [];
    const subscription = subscribeToPiSessionEvents(session, "session-1", event => events.push(event), diagnostic => diagnostics.push(diagnostic));
    listener?.({ type: "agent_start" } as AgentSessionEvent);
    listener?.({ type: "message_start", message: null } as unknown as AgentSessionEvent);
    listener?.({ type: "agent_settled" } as AgentSessionEvent);
    expect(events).toMatchObject([{ sequence: 1, type: "lifecycle", lifecycle: "busy" }, { sequence: 3, type: "lifecycle", lifecycle: "ready" }]);
    expect(diagnostics).toEqual([expect.stringMatching(/event 2 is malformed/)]);
    subscription.dispose();
    expect(listener).toBeUndefined();
  });
});
