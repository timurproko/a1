import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { createPiEngineAdapter } from "../../../src/integrations/pi/engine/index.js";
import { OwnedUiSessionShell } from "../../../src/integrations/pi/session-ui/index.js";
import { RecordingRenderingTerminal } from "./recording-rendering-terminal.js";

/** Source: pinned 0.84.2 agent-loop emits message_end BEFORE executeToolCalls. */
export function assistantCall(id = "call-1", toolName = "bash", args: unknown = { command: "fixture" }) {
  return {
    role: "assistant", timestamp: 20, stopReason: "toolUse",
    content: [{ type: "text", text: "Commentary before the tool" }, { type: "toolCall", id, name: toolName, arguments: args }],
  };
}

/** Keeps durable messages separate from run-local event payloads, like AgentSession. */
export class TranscriptFixtureSession {
  readonly sessionId = "transcript-fixture";
  readonly model = { provider: "openai", id: "gpt-5", name: "GPT-5" };
  readonly thinkingLevel = "medium";
  readonly isStreaming = false;
  readonly isIdle = true;
  readonly isRetrying = false;
  readonly isCompacting = false;
  readonly definitions = new Map<string, unknown>();
  readonly extensionRunner = {
    getToolDefinition: (name: string) => this.definitions.get(name),
    getRegisteredCommands: () => [],
  };
  readonly listeners = new Set<(event: Record<string, unknown>) => void>();
  constructor(public messages: unknown[] = []) {}
  subscribe(listener: (event: Record<string, unknown>) => void): () => void {
    this.listeners.add(listener); return () => this.listeners.delete(listener);
  }
  emit(event: Record<string, unknown>): void {
    if (event.type === "message_end" && !this.messages.includes(event.message)) this.messages.push(event.message);
    for (const listener of this.listeners) listener(event);
  }
  async abort(): Promise<void> {}
  dispose(): void {}
}

/** Real owned shell and public recording terminal; no credentials, model call, or host UI. */
export async function transcriptLifecycleFixture(options: {
  messages?: unknown[];
  definitions?: ReadonlyMap<string, unknown>;
  width?: number;
  height?: number;
} = {}) {
  const session = new TranscriptFixtureSession(options.messages ?? []);
  for (const [name, definition] of options.definitions ?? []) session.definitions.set(name, definition);
  let rebind: ((next: TranscriptFixtureSession) => void) | undefined;
  const runtime = {
    session,
    services: {
      diagnostics: [],
      modelRuntime: { getAvailableSnapshot: () => [session.model] },
      settingsManager: { getTuiMode: () => "fullscreen", getTheme: () => "dark" },
    },
    diagnostics: [],
    setRebindSession(callback: (next: TranscriptFixtureSession) => void) { rebind = callback; },
    async dispose() {},
  };
  const backend = await createPiEngineAdapter({
    cwd: process.cwd(), sessionId: "transcript-fixture", createRuntime: async () => runtime as unknown as AgentSessionRuntime,
    checkPackageUpdates: async () => [],
  });
  await backend.flushEvents();
  const terminal = new RecordingRenderingTerminal(options.width ?? 80, options.height ?? 30);
  const shell = new OwnedUiSessionShell({ backend, cwd: process.cwd(), terminal, sessionLayout: "custom-viewport" });
  terminal.observeDamageDecisions(() => shell.damagePresentationDecision());
  shell.start();
  await backend.flushEvents();
  shell.runtime.renderNow();
  return {
    session, backend, terminal, shell,
    async emit(...events: Record<string, unknown>[]) {
      for (const event of events) session.emit(event);
      await backend.flushEvents();
    },
    async replaceSession(next: TranscriptFixtureSession) {
      runtime.session = next;
      rebind?.(next);
      await backend.flushEvents();
    },
    async dispose() { await shell.dispose(); if (!backend.disposed) await backend.dispose(); },
  };
}
