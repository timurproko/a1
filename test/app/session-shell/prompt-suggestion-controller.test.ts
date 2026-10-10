import { describe, expect, it, vi } from "vitest";
import {
  CONTEXTUAL_PROMPT_SUGGESTION_INSTRUCTION,
  normalizePromptSuggestionCandidate,
  type OwnedUiPromptSuggestionGeneratorPort,
  type OwnedUiPromptSuggestionIdentity,
  type OwnedUiPromptSuggestionResult,
  type SuggestionDecisionReason,
  type SuggestionDiagnosticRecord,
  SUGGESTION_DECISION_REASONS,
} from "../../../src/contracts/owned-ui/index.js";
import { ContextualPromptSuggestionController } from "../../../src/app/session-shell/prompt-suggestion-controller.js";

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

  it.each(["empty", "rejected", "provider-failure", "unavailable"] as const)("retries and preserves two %s outcomes before exhaustion", async outcome => {
    const { controller, records, target } = observed({
      suggestionReasoningPolicy: () => "low",
      generate: async request => ({ identity: request.identity, outcome, text: null }),
    });
    controller.consider(IDENTITY, null);
    controller.settle(IDENTITY);
    await tick();
    expect(records.map(record => record.event)).toEqual(["started", outcome, "started", outcome, "retry-exhausted"]);
    expect(records.filter(record => record.event === "started").map(record => [record.attempt, record.trigger]))
      .toEqual([[1, "prefetch"], [2, "retry"]]);
    expect(records.every(record => record.reasoning === "low")).toBe(true);
    expect(target.text()).toBeNull();
    expect(JSON.stringify(records)).not.toContain(IDENTITY.sessionId);
    controller.dispose();
    expect(records).toHaveLength(5);
  });

  it("waits for settlement before starting a retry scheduled by prefetch", async () => {
    let attempt = 0;
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: vi.fn(async request => ++attempt === 1
        ? { identity: request.identity, outcome: "empty" as const, text: null }
        : { identity: request.identity, outcome: "candidate" as const, text: "run the tests" }),
    };
    const { controller, records, target } = observed(generator);
    controller.consider(IDENTITY, null);
    await tick();
    expect(generator.generate).toHaveBeenCalledOnce();
    expect(records.map(record => record.event)).toEqual(["started", "empty"]);
    controller.settle(IDENTITY);
    await tick();
    expect(generator.generate).toHaveBeenCalledTimes(2);
    expect(records.map(record => record.event)).toEqual(["started", "empty", "started", "displayed"]);
    expect(target.text()).toBe("run the tests");
  });

  it("does not restart exhausted recovery for duplicate settlement", async () => {
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: vi.fn(async request => ({ identity: request.identity, outcome: "empty" as const, text: null })),
    };
    const { controller, records } = observed(generator);
    controller.consider(IDENTITY, null);
    controller.settle(IDENTITY);
    await tick();
    controller.settle(IDENTITY);
    await tick();
    expect(generator.generate).toHaveBeenCalledTimes(2);
    expect(records.map(record => record.event)).toEqual(["started", "empty", "started", "empty", "retry-exhausted"]);
  });

  it("does not retry an explicit cancelled result", async () => {
    const { controller, records } = observed({
      generate: async request => ({ identity: request.identity, outcome: "cancelled", text: null }),
    });
    controller.consider(IDENTITY, null);
    controller.settle(IDENTITY);
    await tick();
    expect(records.map(record => record.event)).toEqual(["started", "cancelled"]);
  });

  it("starts the first attempt from settlement when prefetch was missed", async () => {
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: vi.fn(async request => ({ identity: request.identity, outcome: "candidate" as const, text: "run the tests" })),
    };
    const { controller, records, target } = observed(generator);
    controller.settle(IDENTITY, null);
    await tick();
    expect(generator.generate).toHaveBeenCalledOnce();
    expect(records).toMatchObject([
      { event: "started", attempt: 1, trigger: "settlement" },
      { event: "displayed", attempt: 1, trigger: "settlement" },
    ]);
    expect(target.text()).toBe("run the tests");
  });

  it("recovers when the first settled attempt returns no candidate", async () => {
    let attempt = 0;
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: vi.fn(async request => ++attempt === 1
        ? { identity: request.identity, outcome: "empty" as const, text: null }
        : { identity: request.identity, outcome: "candidate" as const, text: "run the tests" }),
    };
    const { controller, records, target } = observed(generator);
    controller.consider(IDENTITY, null);
    controller.settle(IDENTITY);
    await tick();
    expect(generator.generate).toHaveBeenCalledTimes(2);
    expect(records.map(record => record.event)).toEqual(["started", "empty", "started", "displayed"]);
    expect(target.text()).toBe("run the tests");
  });

  it.each(SUGGESTION_DECISION_REASONS)("records eligibility reason %s without a request", reason => {
    const generator = { generate: vi.fn() };
    const { controller, records } = observed(generator);
    if (reason === "no-model") controller.skip({ ...IDENTITY, model: null }, reason);
    else controller.consider(IDENTITY, reason);
    expect(generator.generate).not.toHaveBeenCalled();
    expect(records).toMatchObject([{ event: "skipped", reason, request: 0 }]);
  });

  it("does not start settlement fallback for a permanently ineligible response", () => {
    const generator = { generate: vi.fn() };
    const { controller, records } = observed(generator);
    controller.settle(IDENTITY, "tool-continuation");
    expect(generator.generate).not.toHaveBeenCalled();
    expect(records).toMatchObject([{ event: "skipped", reason: "tool-continuation", request: 0 }]);
  });

  it("distinguishes disabled from provider abstention", () => {
    const { controller, records } = observed({ generate: vi.fn() }, false);
    controller.consider(IDENTITY, null);
    expect(records).toMatchObject([{ event: "skipped", reason: "disabled" }]);
  });

  it("starts one retry after timeout and rejects the ignored first attempt's late result", async () => {
    vi.useFakeTimers();
    try {
      const resolvers: Array<(result: OwnedUiPromptSuggestionResult) => void> = [];
      const generator: OwnedUiPromptSuggestionGeneratorPort = {
        generate: vi.fn(() => new Promise<OwnedUiPromptSuggestionResult>(resolve => { resolvers.push(resolve); })),
      };
      const { controller, records, target } = observed(generator);
      controller.consider(IDENTITY, null);
      controller.settle(IDENTITY);
      await vi.advanceTimersByTimeAsync(15000);
      resolvers[0]?.({ identity: IDENTITY, outcome: "candidate", text: "archive it" });
      await tick();
      expect(records.map(record => record.event)).toEqual(["started", "timeout", "started", "late-result-discarded"]);
      expect(records[1]?.elapsedMs).toBe(15000);
      expect(records[2]).toMatchObject({ attempt: 2, trigger: "retry" });
      expect(target.text()).toBeNull();
      expect(generator.generate).toHaveBeenCalledTimes(2);
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

  it("abortPending retires a retry scheduled before settlement", async () => {
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: vi.fn(async request => ({ identity: request.identity, outcome: "empty" as const, text: null })),
    };
    const { controller, records } = observed(generator);
    controller.consider(IDENTITY, null);
    await tick();
    expect(records.map(record => record.event)).toEqual(["started", "empty"]);
    controller.abortPending();
    controller.settle(IDENTITY);
    await tick();
    expect(generator.generate).toHaveBeenCalledOnce();
    expect(records.map(record => record.event)).toEqual(["started", "empty"]);
  });

  it("abortPending cancels only a generating request and discards its late result", async () => {
    const pending = deferredGenerator();
    const { controller, records, target } = observed(pending.generator);
    controller.consider(IDENTITY, null);
    controller.abortPending();
    expect(pending.signal()?.aborted).toBe(true);
    expect(controller.state).toEqual({ status: "idle" });
    controller.settle(IDENTITY);
    pending.resolve({ identity: IDENTITY, text: "archive it" });
    await tick();
    expect(records.map(record => record.event)).toEqual(["started", "cancelled", "late-result-discarded"]);
    expect(target.text()).toBeNull();
    expect(pending.generator.generate).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it("abortPending leaves an available suggestion presented and a prepared result to settle", async () => {
    const shown = deferredGenerator();
    const visible = observed(shown.generator);
    const clear = vi.spyOn(visible.target.port, "clear");
    visible.controller.consider(IDENTITY, null);
    visible.controller.settle(IDENTITY);
    shown.resolve({ identity: IDENTITY, text: "archive it" });
    await tick();
    expect(visible.target.text()).toBe("archive it");
    visible.controller.abortPending();
    expect(visible.controller.state).toEqual({ status: "available", identity: IDENTITY, text: "archive it" });
    expect(visible.target.text()).toBe("archive it");
    expect(clear).not.toHaveBeenCalled();
    expect(visible.records.map(record => record.event)).toEqual(["started", "displayed"]);
    visible.controller.dispose();

    const early = deferredGenerator();
    const prepared = observed(early.generator);
    prepared.controller.consider(IDENTITY, null);
    early.resolve({ identity: IDENTITY, text: "archive it" });
    await tick();
    expect(prepared.controller.state.status).toBe("prepared");
    prepared.controller.abortPending();
    expect(prepared.controller.state.status).toBe("prepared");
    prepared.controller.settle(IDENTITY);
    expect(prepared.target.text()).toBe("archive it");
    expect(prepared.records.map(record => record.event)).toEqual(["started", "displayed"]);
    prepared.controller.dispose();
  });

  it("reasserts an available suggestion without another diagnostic outcome", async () => {
    const pending = deferredGenerator();
    const visible = observed(pending.generator);
    const present = vi.spyOn(visible.target.port, "present");
    visible.controller.consider(IDENTITY, null);
    visible.controller.settle(IDENTITY);
    pending.resolve({ identity: IDENTITY, text: "archive it" });
    await tick();
    present.mockClear();
    visible.target.port.requestRender.mockClear();

    visible.controller.restoreAvailable();

    expect(present).toHaveBeenCalledOnce();
    expect(present).toHaveBeenCalledWith("archive it");
    expect(visible.target.port.requestRender).toHaveBeenCalledOnce();
    expect(visible.records.map(record => record.event)).toEqual(["started", "displayed"]);
    expect(pending.generator.generate).toHaveBeenCalledOnce();
    visible.controller.dispose();
  });

  it("defers a valid candidate until a temporary presentation blocker clears", async () => {
    const records: SuggestionDiagnosticRecord[] = [];
    const target = surface();
    let reason: SuggestionDecisionReason | null = "autocomplete";
    const controller = new ContextualPromptSuggestionController({
      enabled: true, generator: { generate: async request => ({ identity: request.identity, outcome: "candidate", text: "archive it" }) },
      surface: { ...target.port, presentationBlockReason: () => reason },
      diagnostics: { record: record => records.push(record) },
    });
    controller.consider(IDENTITY, null);
    controller.settle(IDENTITY);
    await tick();
    expect(records).toMatchObject([{ event: "started" }, { event: "presentation-deferred", reason: "autocomplete" }]);
    expect(controller.state.status).toBe("prepared");
    expect(target.text()).toBeNull();
    reason = null;
    controller.restoreAvailable();
    expect(records.map(record => record.event)).toEqual(["started", "presentation-deferred", "displayed"]);
    expect(target.text()).toBe("archive it");
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
