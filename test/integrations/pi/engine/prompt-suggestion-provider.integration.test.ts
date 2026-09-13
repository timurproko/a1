import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager,
  type AgentSessionRuntime,
} from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import { createPiEngineAdapter } from "../../../../src/integrations/pi/engine/index.js";
import { SUGGESTION_CONVERSATIONS } from "../../../fixtures/prompt-suggestion-conversations.js";

const enabled = process.env.RUN_PROMPT_SUGGESTION_PROVIDER_TEST === "1"
  && typeof process.env.PROMPT_SUGGESTION_AGENT_DIR === "string";

// Compatibility: frozen pre-change instruction for the opt-in before/after smoke comparison.
const BASELINE_INSTRUCTION = `[NEXT USER INPUT]
Predict the one short response the user is most likely to type next.
Use the user's recent intent and writing style. Prefer a concrete continuation such as approving an offered action, choosing an offered option, running a requested check, committing, or pushing.
Return nothing when the next input is unclear, the previous response failed, or the user should assess or correct the result.
Do not answer as the assistant. Do not add a label, explanation, quotation marks, Markdown, or multiple sentences.
Return only 2-12 words, except a natural one-word command or answer is allowed.`;

/** Credential-gated smoke comparison; ordinary CI never contacts a provider. */
describe.skipIf(!enabled)("contextual prompt suggestion real-provider comparison", () => {
  it("compares five baseline/revised archive predictions and required-testing abstention in memory", async () => {
    const agentDir = process.env.PROMPT_SUGGESTION_AGENT_DIR!;
    const directory = await mkdtemp(join(tmpdir(), "suggestion-provider-"));
    try {
      const saved = JSON.parse(await readFile(join(agentDir, "settings.json"), "utf8"));
      const modelRuntime = await ModelRuntime.create({
        authPath: join(agentDir, "auth.json"), modelsPath: join(agentDir, "models.json"),
        modelsStorePath: join(agentDir, "models-store.json"), allowModelNetwork: false,
        signal: AbortSignal.timeout(15000),
      });
      const summaries: Array<{ variant: string; outcomes: string[]; elapsedMs: number[]; archivalCandidates: number; reasoning: string }> = [];
      for (const variant of ["baseline", "revised", "required-testing"] as const) {
        const settingsManager = SettingsManager.inMemory(saved);
        const resourceLoader = new DefaultResourceLoader({
          cwd: directory, agentDir, settingsManager,
          noExtensions: true, noSkills: true, noPromptTemplates: true, noThemes: true,
          agentsFilesOverride: () => ({ agentsFiles: [] }),
          systemPromptOverride: () => "You are a coding assistant.",
        });
        await resourceLoader.reload();
        const sessionManager = SessionManager.inMemory(directory);
        const { session } = await createAgentSession({
          cwd: directory, agentDir, settingsManager, resourceLoader, modelRuntime,
          sessionManager, thinkingLevel: "high", noTools: "all",
        });
        const fixture = variant === "required-testing" ? SUGGESTION_CONVERSATIONS.requiredTesting : SUGGESTION_CONVERSATIONS.archive;
        session.agent.state.messages = structuredClone(fixture.messages) as unknown as typeof session.agent.state.messages;
        const completeSimple: typeof modelRuntime.completeSimple = (model, context, options) => modelRuntime.completeSimple(model,
          variant === "baseline" ? { ...context, messages: [...context.messages.slice(0, -1), { role: "user", content: BASELINE_INSTRUCTION, timestamp: Date.now() }] } : context,
          variant === "baseline" ? { ...options, reasoning: "high" } : options);
        const adapter = await createPiEngineAdapter({
          cwd: directory, agentDir,
          createRuntime: async () => ({
            cwd: directory, session, diagnostics: [],
            services: { settingsManager, resourceLoader, diagnostics: [], modelRuntime: {
              completeSimple, getAvailableSnapshot: () => modelRuntime.getAvailableSnapshot(),
            } },
            setRebindSession() {}, dispose: async () => session.dispose(),
          }) as unknown as AgentSessionRuntime,
        });
        const summary = { variant, outcomes: [] as string[], elapsedMs: [] as number[], archivalCandidates: 0, reasoning: variant === "baseline" ? "high" : adapter.suggestionReasoningPolicy() };
        try {
          const model = adapter.view().activeModel;
          expect(model, "selected profile must have an available model").not.toBeNull();
          const before = JSON.stringify(session.agent.state.messages);
          const mainThinking = session.thinkingLevel;
          for (let sample = 0; sample < (variant === "required-testing" ? 1 : 5); sample++) {
            const abort = new AbortController();
            const started = Date.now();
            let timeout!: ReturnType<typeof setTimeout>;
            const request = adapter.generate({
              identity: { sessionId: adapter.sessionId, sessionGeneration: adapter.sessionGeneration, runSequence: 0, responseSequence: 0, model: model! },
              signal: abort.signal,
            });
            const result = await Promise.race([request, new Promise<null>(resolve => {
              timeout = setTimeout(() => { resolve(null); abort.abort(); }, 15000);
            })]);
            clearTimeout(timeout);
            summary.elapsedMs.push(Date.now() - started);
            summary.outcomes.push(result === null ? "timeout" : result.outcome);
            if (result?.text && /\barchiv(?:e|ing)\b/i.test(result.text)) summary.archivalCandidates++;
            expect(JSON.stringify(session.agent.state.messages)).toBe(before);
            expect(session.thinkingLevel).toBe(mainThinking);
            expect(sessionManager.isPersisted()).toBe(false);
            expect(sessionManager.getSessionFile()).toBeUndefined();
          }
          process.stdout.write(`${JSON.stringify({ probe: "prompt-suggestion-comparison", provider: model!.providerId, model: model!.modelId, ...summary })}\n`);
          summaries.push(summary);
        } finally { await adapter.dispose(); }
      }
      expect(summaries.find(summary => summary.variant === "revised")!.archivalCandidates,
        "quality acceptance remains open until a real archival continuation is observed").toBeGreaterThan(0);
      expect(summaries.find(summary => summary.variant === "required-testing")!.archivalCandidates,
        "required testing must not be treated as optional").toBe(0);
    } finally { await rm(directory, { recursive: true, force: true }); }
  }, 240_000);
});
