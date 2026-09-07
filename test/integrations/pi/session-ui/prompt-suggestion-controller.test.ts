import { describe, expect, it, vi } from "vitest";
import {
  CONTEXTUAL_PROMPT_SUGGESTION_INSTRUCTION,
  normalizePromptSuggestionCandidate,
  type OwnedUiPromptSuggestionGeneratorPort,
  type OwnedUiPromptSuggestionIdentity,
  type OwnedUiPromptSuggestionResult,
} from "../../../../src/contracts/owned-ui/index.js";
import { ContextualPromptSuggestionController } from "../../../../src/integrations/pi/session-ui/prompt-suggestion-controller.js";

const IDENTITY: OwnedUiPromptSuggestionIdentity = {
  sessionId: "session-1",
  sessionGeneration: 2,
  runSequence: 3,
  responseSequence: 4,
  model: { providerId: "openai", modelId: "gpt-5", displayName: "GPT-5" },
};

function deferredGenerator() {
  let resolve!: (result: OwnedUiPromptSuggestionResult) => void;
  let signal: AbortSignal | undefined;
  const generator: OwnedUiPromptSuggestionGeneratorPort = {
    generate: vi.fn(request => {
      signal = request.signal;
      return new Promise<OwnedUiPromptSuggestionResult>(done => { resolve = done; });
    }),
  };
  return { generator, resolve: (result: OwnedUiPromptSuggestionResult) => resolve(result), signal: () => signal };
}

function surface() {
  let text: string | null = null;
  let eligible = true;
  return {
    port: {
      canPresent: () => eligible,
      present: (value: string) => { text = value; return eligible; },
      clear: () => { text = null; },
      requestRender: vi.fn(),
    },
    text: () => text,
    setEligible: (value: boolean) => { eligible = value; },
  };
}

async function tick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("contextual prompt suggestion candidates", () => {
  it("uses an independently authored concise prediction instruction", () => {
    expect(CONTEXTUAL_PROMPT_SUGGESTION_INSTRUCTION).toContain("user is most likely to type next");
    expect(CONTEXTUAL_PROMPT_SUGGESTION_INSTRUCTION).not.toContain("SUGGESTION MODE");
  });

  it.each([
    [" go ahead and merge it ", "go ahead and merge it"],
    ["run the tests", "run the tests"],
    ["yes", "yes"],
    ["/compact", "/compact"],
  ])("accepts %j as %j", (candidate, expected) => {
    expect(normalizePromptSuggestionCandidate(candidate,)).toBe(expected);
  });

  it.each([
    "", "done", "No suggestion", "Let me run it", "I'll apply this", "looks good",
    "**merge it**", "first line\nsecond line", "run it\u001b[31m", "API error: failed",
    "do this. Then do that", "one two three four five six seven eight nine ten eleven twelve thirteen",
    "x".repeat(100),
  ])("rejects unsafe or low-quality candidate %j", candidate => {
    expect(normalizePromptSuggestionCandidate(candidate)).toBeNull();
  });
});

describe("ContextualPromptSuggestionController", () => {
  it("holds an early result privately and publishes it at matching settlement", async () => {
    const pending = deferredGenerator();
    const target = surface();
    const controller = new ContextualPromptSuggestionController({ generator: pending.generator, surface: target.port, enabled: true });
    controller.consider(IDENTITY, true);
    expect(controller.state).toEqual({ status: "generating", identity: IDENTITY, settled: false });
    pending.resolve({ identity: IDENTITY, text: "go ahead and merge it" });
    await tick();
    expect(controller.state).toEqual({ status: "prepared", identity: IDENTITY, text: "go ahead and merge it" });
    expect(target.text()).toBeNull();
    controller.settle(IDENTITY);
    expect(controller.state.status).toBe("available");
    expect(target.text()).toBe("go ahead and merge it");
    controller.invalidate();
    expect(controller.state).toEqual({ status: "idle" });
    expect(target.text()).toBeNull();
  });

  it("publishes immediately when a current result arrives after settlement", async () => {
    const pending = deferredGenerator();
    const target = surface();
    const controller = new ContextualPromptSuggestionController({ generator: pending.generator, surface: target.port, enabled: true });
    controller.consider(IDENTITY, true);
    controller.settle(IDENTITY);
    expect(controller.state).toEqual({ status: "generating", identity: IDENTITY, settled: true });
    pending.resolve({ identity: IDENTITY, text: "run the tests" });
    await tick();
    expect(controller.state.status).toBe("available");
    expect(target.text()).toBe("run the tests");
  });

  it("aborts and discards a stale result", async () => {
    const pending = deferredGenerator();
    const target = surface();
    const controller = new ContextualPromptSuggestionController({ generator: pending.generator, surface: target.port, enabled: true });
    controller.consider(IDENTITY, true);
    controller.invalidate();
    expect(pending.signal()?.aborted).toBe(true);
    pending.resolve({ identity: IDENTITY, text: "run the tests" });
    await tick();
    expect(target.text()).toBeNull();
  });

  it("rejects mismatched identities and a surface that became ineligible", async () => {
    const pending = deferredGenerator();
    const target = surface();
    const controller = new ContextualPromptSuggestionController({ generator: pending.generator, surface: target.port, enabled: true });
    controller.consider(IDENTITY, true);
    pending.resolve({ identity: { ...IDENTITY, runSequence: 4 }, text: "run the tests" });
    await tick();
    expect(target.text()).toBeNull();

    const second = deferredGenerator();
    const next = new ContextualPromptSuggestionController({ generator: second.generator, surface: target.port, enabled: true });
    next.consider(IDENTITY, true);
    target.setEligible(false);
    second.resolve({ identity: IDENTITY, text: "run the tests" });
    await tick();
    expect(next.state.status).toBe("prepared");
    next.settle(IDENTITY);
    expect(next.state).toEqual({ status: "idle" });
    expect(target.text()).toBeNull();
  });

  it("fails closed when a generator violates the result contract", async () => {
    const target = surface();
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: async request => ({ identity: request.identity, text: "x".repeat(100) }),
    };
    const controller = new ContextualPromptSuggestionController({ generator, surface: target.port, enabled: true });
    controller.consider(IDENTITY, true);
    await tick();
    expect(controller.state).toEqual({ status: "idle" });
    expect(target.text()).toBeNull();
  });

  it("bounds a generator that does not settle and rejects its late result", async () => {
    vi.useFakeTimers();
    try {
      const pending = deferredGenerator();
      const target = surface();
      const controller = new ContextualPromptSuggestionController({
        generator: pending.generator,
        surface: target.port,
        enabled: true,
        timeoutMs: 25,
      });
      controller.consider(IDENTITY, true);
      await vi.advanceTimersByTimeAsync(25);
      expect(pending.signal()?.aborted).toBe(true);
      expect(controller.state).toEqual({ status: "idle" });
      pending.resolve({ identity: IDENTITY, text: "run the tests" });
      await tick();
      expect(target.text()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("makes zero requests when disabled or ineligible and disabling aborts", () => {
    const pending = deferredGenerator();
    const target = surface();
    const controller = new ContextualPromptSuggestionController({ generator: pending.generator, surface: target.port, enabled: false });
    controller.consider(IDENTITY, true);
    controller.setEnabled(true);
    controller.consider(IDENTITY, false);
    expect(pending.generator.generate).not.toHaveBeenCalled();
    controller.consider({ ...IDENTITY, runSequence: 4 }, true);
    controller.setEnabled(false);
    expect(pending.signal()?.aborted).toBe(true);
  });
});
