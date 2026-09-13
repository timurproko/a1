import { describe, expect, it, vi } from "vitest";
import {
  CONTEXTUAL_PROMPT_SUGGESTION_INSTRUCTION,
  normalizePromptSuggestionCandidate,
  type OwnedUiPromptSuggestionGeneratorPort,
  type OwnedUiPromptSuggestionIdentity,
  type OwnedUiPromptSuggestionResult,
  type SuggestionDiagnosticRecord,
  SUGGESTION_DECISION_REASONS,
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
  return { generator, resolve: (result: { identity: OwnedUiPromptSuggestionIdentity; text: string }) => resolve({ ...result, outcome: "candidate" }), signal: () => signal };
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
    ["archive it", "archive it"],
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
      generate: async request => ({ identity: request.identity, outcome: "candidate", text: "x".repeat(100) }),
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

describe("suggestion lifecycle diagnostics", () => {
  function observed(generator: OwnedUiPromptSuggestionGeneratorPort, enabled = true) {
    const records: SuggestionDiagnosticRecord[] = [];
    const target = surface();
    const controller = new ContextualPromptSuggestionController({
      generator, enabled, surface: target.port, diagnostics: { record: value => records.push(value) },
    });
    return { controller, records, target };
  }

  it.each(["empty", "rejected", "provider-failure", "unavailable", "cancelled"] as const)("preserves %s rather than mislabeling null", async outcome => {
    const { controller, records, target } = observed({
      suggestionReasoningPolicy: () => "low",
      generate: async request => ({ identity: request.identity, outcome, text: null }),
    });
    controller.consider(IDENTITY, null);
    controller.settle(IDENTITY);
    await tick();
    expect(records.map(record => record.event)).toEqual(["started", outcome]);
    expect(records.every(record => record.reasoning === "low")).toBe(true);
    expect(target.text()).toBeNull();
    expect(JSON.stringify(records)).not.toContain(IDENTITY.sessionId);
    controller.dispose();
    expect(records).toHaveLength(2);
  });

  it.each(SUGGESTION_DECISION_REASONS)("records eligibility reason %s without a request", reason => {
    const generator = { generate: vi.fn() };
    const { controller, records } = observed(generator);
    if (reason === "no-model") controller.skip({ ...IDENTITY, model: null }, reason);
    else controller.consider(IDENTITY, reason);
    expect(generator.generate).not.toHaveBeenCalled();
    expect(records).toMatchObject([{ event: "skipped", reason, request: 0 }]);
  });

  it("distinguishes disabled from provider abstention", () => {
    const { controller, records } = observed({ generate: vi.fn() }, false);
    controller.consider(IDENTITY, null);
    expect(records).toMatchObject([{ event: "skipped", reason: "disabled" }]);
  });

  it("retires timeout before an ignored abort returns a late result", async () => {
    vi.useFakeTimers();
    try {
      const pending = deferredGenerator();
      const { controller, records, target } = observed(pending.generator);
      controller.consider(IDENTITY, null);
      controller.settle(IDENTITY);
      await vi.advanceTimersByTimeAsync(15000);
      pending.resolve({ identity: IDENTITY, text: "archive it" });
      await tick();
      expect(records.map(record => record.event)).toEqual(["started", "timeout", "late-result-discarded"]);
      expect(records[1]?.elapsedMs).toBe(15000);
      expect(target.text()).toBeNull();
      expect(pending.generator.generate).toHaveBeenCalledTimes(1);
      controller.dispose();
    } finally { vi.useRealTimers(); }
  });

  it.each([false, true])("owns cancellation for prepared=%s without a second terminal outcome", async prepared => {
    const pending = deferredGenerator();
    const { controller, records, target } = observed(pending.generator);
    controller.consider(IDENTITY, null);
    if (prepared) { pending.resolve({ identity: IDENTITY, text: "archive it" }); await tick(); }
    controller.invalidate();
    if (!prepared) { pending.resolve({ identity: IDENTITY, text: "archive it" }); await tick(); }
    controller.settle(IDENTITY);
    expect(records.map(record => record.event)).toEqual(prepared
      ? ["started", "cancelled"] : ["started", "cancelled", "late-result-discarded"]);
    expect(target.text()).toBeNull();
    controller.dispose();
  });

  it("records blocked presentation rather than empty output", async () => {
    const records: SuggestionDiagnosticRecord[] = [];
    const target = surface();
    const controller = new ContextualPromptSuggestionController({
      enabled: true, generator: { generate: async request => ({ identity: request.identity, outcome: "candidate", text: "archive it" }) },
      surface: { ...target.port, presentationBlockReason: () => "autocomplete" },
      diagnostics: { record: record => records.push(record) },
    });
    controller.consider(IDENTITY, null);
    controller.settle(IDENTITY);
    await tick();
    expect(records).toMatchObject([{ event: "started" }, { event: "presentation-blocked", reason: "autocomplete" }]);
    expect(target.text()).toBeNull();
    controller.dispose();
  });

  it("distinguishes mismatched identity and invalid contract from provider failures", async () => {
    for (const [result, expected] of [
      [{ identity: { ...IDENTITY, sessionGeneration: 99 }, outcome: "candidate", text: "archive it" }, "stale-result"],
      [{ identity: IDENTITY, outcome: "candidate", text: "I'll do it" }, "rejected"],
      [{ identity: IDENTITY, outcome: "empty", text: "archive it" }, "rejected"],
    ] as const) {
      const { controller, records } = observed({ generate: async () => result as OwnedUiPromptSuggestionResult });
      controller.consider(IDENTITY, null);
      await tick();
      expect(records.map(record => record.event)).toEqual(["started", expected]);
      controller.dispose();
    }
  });

  it("isolates throwing observers and synchronous/asynchronous generator failures", async () => {
    for (const generate of [() => { throw Error("private"); }, async () => { throw Error("private"); }]) {
      const { controller, records } = observed({ generate });
      controller.consider(IDENTITY, null);
      await tick();
      expect(records.map(record => record.event)).toEqual(["started", "provider-failure"]);
      expect(JSON.stringify(records)).not.toContain("private");
      controller.dispose();
    }
    const target = surface();
    const controller = new ContextualPromptSuggestionController({
      enabled: true, surface: target.port,
      generator: { generate: async request => ({ identity: request.identity, outcome: "candidate", text: "archive it" }) },
      diagnostics: { record() { throw Error("private sink error"); } },
    });
    controller.consider(IDENTITY, null);
    controller.settle(IDENTITY);
    await tick();
    expect(target.text()).toBe("archive it");
    controller.dispose();
  });
});
