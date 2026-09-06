import { describe, expect, it } from "vitest";
import { createPiEngineAdapter } from "../../../../src/integrations/pi/engine/index.js";

const enabled = process.env.A1_PROMPT_SUGGESTION_PROVIDER_TEST === "1"
  && typeof process.env.A1_PROMPT_SUGGESTION_AGENT_DIR === "string";

/** Credential-gated diagnostic; default validation collects this file but never contacts a provider. */
describe.skipIf(!enabled)("contextual prompt suggestion real-provider probe", () => {
  it("uses the selected model through a bounded tool-free request without changing session content", async () => {
    const adapter = await createPiEngineAdapter({
      cwd: process.cwd(),
      agentDir: process.env.A1_PROMPT_SUGGESTION_AGENT_DIR!,
      settingsProductMode: "bare",
    });
    try {
      const model = adapter.view().activeModel;
      expect(model).not.toBeNull();
      const before = JSON.stringify(adapter.view().transcript);
      const startedAt = Date.now();
      const result = await adapter.generate({
        identity: {
          sessionId: adapter.sessionId,
          sessionGeneration: adapter.sessionGeneration,
          runSequence: 0,
          model: model!,
        },
        signal: AbortSignal.timeout(20_000),
      });
      const elapsedMs = Date.now() - startedAt;
      expect(result.text === null || result.text.length < 100).toBe(true);
      expect(JSON.stringify(adapter.view().transcript)).toBe(before);
      process.stdout.write(`${JSON.stringify({
        probe: "contextual-prompt-suggestion",
        provider: model!.providerId,
        model: model!.modelId,
        elapsedMs,
        returnedCandidate: result.text !== null,
      })}\n`);
    } finally {
      await adapter.dispose();
    }
  }, 25_000);
});
