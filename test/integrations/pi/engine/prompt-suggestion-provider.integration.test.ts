import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAgentSessionFromServices, createAgentSessionRuntime, SessionManager } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import { CONTEXTUAL_PROMPT_SUGGESTION_INSTRUCTION, normalizePromptSuggestionCandidate, type OwnedUiPromptSuggestionIdentity, type OwnedUiPromptSuggestionResult } from "../../../../src/contracts/owned-ui/index.js";
import { createPiEngineAdapter } from "../../../../src/integrations/pi/engine/index.js";
import { createPiRuntimeServicesAfterTrust } from "../../../../src/integrations/pi/engine/runtime-integration.js";
import { suggestionUsage } from "../../../../src/integrations/pi/engine/prompt-suggestion-context.js";
import { PromptSuggestionProbeObservations } from "../../../support/prompt-suggestion-observations.js";

const enabled = process.env.RUN_PROMPT_SUGGESTION_PROVIDER_TEST === "1"
  && typeof process.env.PROMPT_SUGGESTION_AGENT_DIR === "string";

/** Explicit paid probe: two fixture turns plus at most one suggestion per independent sample session. */
async function sample(variant: "baseline" | "corrected", index: number) {
  const root = await mkdtemp(join(tmpdir(), "suggestion-provider-probe-"));
  const agentDir = process.env.PROMPT_SUGGESTION_AGENT_DIR!;
  const observations = new PromptSuggestionProbeObservations(4);
  const runtime = await createAgentSessionRuntime(async ({ cwd, sessionManager }) => {
    const { services } = await createPiRuntimeServicesAfterTrust({ cwd, agentDir });
    return { ...await createAgentSessionFromServices({ services, sessionManager, noTools: "all" }), services, diagnostics: [] };
  }, { cwd: root, agentDir, sessionManager: SessionManager.inMemory(root) });
  const adapter = await createPiEngineAdapter({ cwd: root, agentDir, settingsProductMode: "bare", createRuntime: async () => runtime });
  let expired = false;
  const deadline = setTimeout(() => { expired = true; void runtime.session.abort(); }, 60000);
  deadline.unref?.();
  let pending: Promise<OwnedUiPromptSuggestionResult> | undefined;
  let settledAt: number | undefined;
  let completedAt: number | undefined;
  let sequence = 0;
  const run = async (identity: OwnedUiPromptSuggestionIdentity): Promise<OwnedUiPromptSuggestionResult> => {
    const signal = AbortSignal.timeout(20000);
    const before = JSON.stringify(runtime.session.messages);
    const primaryAccounting = adapter.view().status.usage;
    let result: OwnedUiPromptSuggestionResult;
    // Security: never bypass unsupported extension policies, even in the legacy comparison arm.
    if (variant === "corrected" || !adapter.isCurrent(identity)) {
      result = await adapter.generate({ identity, signal, observe: observations.observe });
    } else {
      const session = runtime.session;
      const model = session.model!;
      const started = performance.now();
      const parent = session.messages.at(-1);
      const response = await runtime.services.modelRuntime.completeSimple(model, {
        systemPrompt: session.agent.state.systemPrompt,
        messages: [...session.agent.state.messages.filter(message => message.role === "user" || message.role === "assistant" || message.role === "toolResult"),
          { role: "user", content: CONTEXTUAL_PROMPT_SUGGESTION_INSTRUCTION, timestamp: Date.now() }],
        tools: session.agent.state.tools,
      }, { signal, ...(session.thinkingLevel === "off" ? {} : { reasoning: session.thinkingLevel }) });
      const block = response.content.find(item => item.type === "text");
      const text = response.stopReason === "stop" && !response.content.some(item => item.type === "toolCall")
        ? normalizePromptSuggestionCandidate(block?.type === "text" ? block.text : null) : null;
      result = { identity, text, outcome: text ? "candidate" : response.stopReason === "error" ? "failed" : "empty" };
      observations.observe({ phase: "generation", sequence: identity.responseSequence, outcome: result.outcome!, durationMs: performance.now() - started,
        primaryUsage: suggestionUsage(parent), suggestionUsage: suggestionUsage(response), inferenceInvocations: { primary: null, suggestion: 1 }, networkAttempts: null });
    }
    completedAt = performance.now();
    expect(JSON.stringify(runtime.session.messages)).toBe(before);
    expect(adapter.view().status.usage).toEqual(primaryAccounting);
    return result;
  };
  const unsubscribe = adapter.onEvent(event => {
    if (event.type === "assistant-message-completed" && event.model && event.assistantMessageCount >= 2 && !pending) {
      sequence = event.responseSequence;
      pending = run({ sessionId: event.sessionId, sessionGeneration: event.sessionGeneration, runSequence: event.runSequence,
        responseSequence: event.responseSequence, model: event.model });
      void pending.catch(() => {}); // Concurrency: surface errors below after the primary run settles.
    }
    if (event.type === "agent-run-settled" && event.responseSequence === sequence) settledAt = performance.now();
  });
  try {
    await runtime.session.prompt("This is a synthetic planning conversation, not a request to modify files. Reply with a brief plan for adding a unit test, without calling tools.");
    await adapter.flushEvents();
    if (expired) throw new Error("Provider fixture deadline exceeded");
    await runtime.session.prompt("I agree with that plan. Briefly offer to implement the test next, without calling tools.");
    await adapter.flushEvents();
    if (expired) throw new Error("Provider fixture deadline exceeded");
    expect(pending).toBeDefined();
    const result = await pending!;
    await new Promise<void>(resolve => setImmediate(resolve)); // Concurrency: drain the optional observer, not a presentation wait.
    if (completedAt !== undefined && settledAt !== undefined) observations.observe({ phase: "availability", sequence, resultRelativeToSettlementMs: completedAt - settledAt });
    process.stdout.write(`${JSON.stringify({ probe: "contextual-prompt-suggestion", sample: index, variant,
      fixture: "two-primary-turns-independent-session", primaryPromptInvocations: 2, providerRetries: "unobserved", cacheTemperature: "provider-reported-only",
      api: ["anthropic-messages", "openai-responses", "openai-codex-responses"].includes(runtime.session.model?.api ?? "") ? runtime.session.model?.api : "other",
      returnedCandidate: result.text !== null, observations: observations.take(),
    })}\n`);
  } finally {
    clearTimeout(deadline); unsubscribe(); observations.disable(); await adapter.dispose(); await rm(root, { recursive: true, force: true });
  }
}

/** Default CI collects this file but cannot contact a provider. Never infer paint latency from these samples. */
describe.skipIf(!enabled)("contextual prompt suggestion real-provider probe", () => {
  it("reports bounded alternating baseline/corrected samples without exporting private content", async () => {
    const samples = Number(process.env.PROMPT_SUGGESTION_SAMPLES ?? 2);
    if (!Number.isSafeInteger(samples) || samples < 1 || samples > 3) throw new RangeError("Provider samples must be 1-3 pairs");
    for (let index = 0; index < samples; index += 1) {
      const order = index % 2 === 0 ? ["baseline", "corrected"] as const : ["corrected", "baseline"] as const;
      for (const variant of order) await sample(variant, index);
    }
  }, 600000);
});
