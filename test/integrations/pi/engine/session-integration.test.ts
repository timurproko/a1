import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import {
  PiSessionCommandIntegration,
  subscribeToPiSessionEvents,
  type PiDocumentedSessionCommands,
} from "../../../../src/integrations/pi/engine/index.js";

type PromptCall = { text: string; options?: { streamingBehavior?: "steer" | "followUp"; images?: readonly unknown[]; preflightResult?: (success: boolean) => void } };

class Commands implements PiDocumentedSessionCommands {
  isStreaming = false;
  isRetrying = false;
  isCompacting = false;
  readonly calls: string[] = [];
  readonly prompts: PromptCall[] = [];
  readonly queued: Array<{ mode: "steer" | "followUp"; text: string; images?: readonly unknown[] }> = [];
  extensionCommands: readonly string[] = [];
  promptFailure: { error: Error; accepted: boolean } | undefined;
  readonly extensionRunner = { getCommand: (name: string) => this.extensionCommands.includes(name) ? { name } : undefined };
  async prompt(text: string, options?: PromptCall["options"]): Promise<void> {
    this.calls.push(`prompt:${text}${options?.streamingBehavior ? `:${options.streamingBehavior}` : ""}`);
    this.prompts.push({ text, ...(options === undefined ? {} : { options }) });
    if (this.promptFailure !== undefined) {
      options?.preflightResult?.(this.promptFailure.accepted);
      throw this.promptFailure.error;
    }
    options?.preflightResult?.(true);
  }
  async steer(text: string, images?: readonly unknown[]): Promise<void> {
    this.calls.push(`steer:${text}`);
    this.queued.push({ mode: "steer", text, ...(images === undefined ? {} : { images }) });
  }
  async followUp(text: string, images?: readonly unknown[]): Promise<void> {
    this.calls.push(`follow:${text}`);
    this.queued.push({ mode: "followUp", text, ...(images === undefined ? {} : { images }) });
  }
  async abort(): Promise<void> { this.calls.push("abort"); }
  abortRetry(): void { this.calls.push("abort-retry"); }
  abortCompaction(): void { this.calls.push("abort-compaction"); }
  async compact(): Promise<unknown> { this.calls.push("compact"); return { summary: "ok" }; }
  clearQueue(): { steering: string[]; followUp: string[] } {
    this.calls.push("clear-queue");
    const steering = this.queued.filter(item => item.mode === "steer").map(item => item.text);
    const followUp = this.queued.filter(item => item.mode === "followUp").map(item => item.text);
    this.queued.length = 0;
    return { steering, followUp };
  }
  async executeBash(command: string): Promise<unknown> { this.calls.push(`bash:${command}`); return { output: command, exitCode: 0, cancelled: false, truncated: false }; }
}

const image = (data: string) => ({ type: "image" as const, data, mimeType: "image/png" });

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
    expect(session.calls).toEqual([
      "prompt:first",
      "prompt:now:steer",
      "prompt:later:followUp",
      "prompt:later",
      "compact",
      "bash:echo ok",
    ]);
  });

  it("queues steering and follow-ups through the engine queue while compacting and runs extension commands immediately", async () => {
    const session = new Commands();
    session.isCompacting = true;
    session.extensionCommands = ["reload-things"];
    const integration = new PiSessionCommandIntegration(session);
    await integration.execute({ type: "steer", text: "first", images: [image("aA==")] });
    await integration.execute({ type: "follow-up", text: "later" });
    await integration.execute({ type: "steer", text: "/reload-things now" });
    await integration.execute({ type: "steer", text: "/unknown-slash text" });
    expect(session.calls).toEqual(["steer:first", "follow:later", "prompt:/reload-things now:steer", "steer:/unknown-slash text"]);
    expect(session.queued).toEqual([
      { mode: "steer", text: "first", images: [image("aA==")] },
      { mode: "followUp", text: "later" },
      { mode: "steer", text: "/unknown-slash text" },
    ]);
  });

  it("delivers the queue after a manual compaction: the first message starts a run and the rest are re-queued with their images", async () => {
    const session = new Commands();
    session.isCompacting = true;
    const integration = new PiSessionCommandIntegration(session);
    await integration.execute({ type: "steer", text: "first", images: [image("aA==")] });
    await integration.execute({ type: "steer", text: "second", images: [image("bB==")] });
    await integration.execute({ type: "follow-up", text: "third" });
    session.isCompacting = false;
    const failures: unknown[] = [];
    await integration.deliverQueuedAfterCompaction(error => failures.push(error));
    expect(session.calls.slice(3)).toEqual(["clear-queue", "prompt:first:steer", "steer:second", "follow:third"]);
    expect(session.prompts.at(-1)).toMatchObject({ text: "first", options: { streamingBehavior: "steer", images: [image("aA==")] } });
    expect(session.queued).toEqual([{ mode: "steer", text: "second", images: [image("bB==")] }, { mode: "followUp", text: "third" }]);
    expect(failures).toEqual([]);
    await integration.execute({ type: "retry" });
    expect(session.calls.at(-1)).toBe("prompt:first");
  });

  it("delivers nothing while the engine is streaming or compacting, or when the queue is empty", async () => {
    const session = new Commands();
    const integration = new PiSessionCommandIntegration(session);
    await integration.deliverQueuedAfterCompaction(() => undefined);
    session.isStreaming = true;
    await session.steer("held");
    await integration.deliverQueuedAfterCompaction(() => undefined);
    expect(session.calls.filter(call => call.startsWith("prompt:"))).toEqual([]);
    expect(session.queued).toHaveLength(1);
  });

  it("restores the queue and reports the error when the delivering run is refused before acceptance", async () => {
    const session = new Commands();
    session.isCompacting = true;
    const integration = new PiSessionCommandIntegration(session);
    await integration.execute({ type: "steer", text: "first", images: [image("aA==")] });
    await integration.execute({ type: "follow-up", text: "later" });
    session.isCompacting = false;
    session.promptFailure = { error: new Error("no model selected"), accepted: false };
    const failures: unknown[] = [];
    await integration.deliverQueuedAfterCompaction(error => failures.push(error));
    await new Promise(resolve => setImmediate(resolve));
    expect(failures).toEqual([expect.objectContaining({ message: "no model selected" })]);
    expect(session.queued).toEqual([{ mode: "steer", text: "first", images: [image("aA==")] }, { mode: "followUp", text: "later" }]);

    session.promptFailure = { error: new Error("provider failed mid-run"), accepted: true };
    await integration.deliverQueuedAfterCompaction(error => failures.push(error));
    await new Promise(resolve => setImmediate(resolve));
    expect(failures).toHaveLength(2);
    expect(session.queued).toEqual([{ mode: "followUp", text: "later" }]);
  });

  it("forgets kept attachments when the queue is cleared by the shell", async () => {
    const session = new Commands();
    session.isCompacting = true;
    const integration = new PiSessionCommandIntegration(session);
    await integration.execute({ type: "steer", text: "first", images: [image("aA==")] });
    integration.forgetQueuedImages();
    session.isCompacting = false;
    await integration.deliverQueuedAfterCompaction(() => undefined);
    expect(session.prompts.at(-1)).toEqual({ text: "first", options: expect.not.objectContaining({ images: expect.anything() }) });
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
