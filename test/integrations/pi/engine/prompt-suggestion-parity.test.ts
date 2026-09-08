import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSuggestionFixture, eventResponse, requestBody, syntheticCodexKey } from "../../../support/suggestion-provider-fixture.js";
import { suggestionMessages, suggestionUsage } from "../../../../src/integrations/pi/engine/prompt-suggestion-context.js";
import type { OwnedUiPromptSuggestionObservation } from "../../../../src/contracts/owned-ui/index.js";

type Fixture = Awaited<ReturnType<typeof createSuggestionFixture>>;
const fixtures: Fixture[] = [];
const requests: { body: Record<string, any>; headers: Headers }[] = [];
let beforeResponse: (() => Promise<void>) | undefined;

beforeEach(() => {
  vi.stubEnv("PI_OFFLINE", "1");
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    expect(request.url).toContain("suggestion-fixture.invalid"); // Security: no ambient provider is reachable.
    const body = await requestBody(request);
    requests.push({ body, headers: request.headers });
    await beforeResponse?.();
    return eventResponse(request.url.includes("messages") ? "anthropic-messages" : "openai-responses", `resp_${requests.length}`);
  }));
});
afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(fixture => fixture.dispose()));
  requests.length = 0;
  beforeResponse = undefined;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs();
});
async function fixture(options: Parameters<typeof createSuggestionFixture>[0] = {}) {
  const result = await createSuggestionFixture(options); fixtures.push(result); return result;
}
function withoutCacheMarkers(value: unknown): any {
  if (Array.isArray(value)) return value.map(withoutCacheMarkers);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "cache_control").map(([key, item]) => [key, withoutCacheMarkers(item)]));
  return value;
}
function assertPrefix(main: Record<string, any>, suggestion: Record<string, any>) {
  const key = Array.isArray(main.messages) ? "messages" : "input";
  const left = withoutCacheMarkers(main);
  const right = withoutCacheMarkers(suggestion);
  // Invariant: only the assistant/prediction tail and provider cache-marker placement may differ here.
  expect(right[key].slice(0, left[key].length)).toEqual(left[key]);
  const tail = right[key].slice(left[key].length);
  expect(tail).toHaveLength(2);
  expect(tail.filter((message: { role?: string }) => message.role === "assistant")).toHaveLength(1);
  delete left[key]; delete right[key];
  expect(right).toEqual(left);
}

/** Independent main SDK dispatch versus the corrected generator, with only synthetic wire data. */
describe("supported prompt suggestion request parity", () => {
  it.each(["anthropic", "openai", "openai-codex"] as const)("preserves summaries, schema, default policy, and native routing: %s", async provider => {
    const f = await fixture({ provider, budgets: { high: 4096 }, extensions: [pi => {
      pi.on("before_agent_start", event => ({ systemPrompt: `${event.systemPrompt}\nPersistent instruction.`, message: { customType: "fixture", content: "persistent-hook-context", display: false } }));
      pi.on("session_start", () => {});
    }] });
    f.runtime.session.agent.state.messages = [
      { role: "compactionSummary", summary: "retained-compaction", tokensBefore: 50000, timestamp: 1 },
      { role: "branchSummary", summary: "retained-branch", fromId: "synthetic-branch", timestamp: 2 },
      { role: "custom", customType: "context", content: "retained-custom", display: false, timestamp: 3 },
      { role: "bashExecution", command: "echo retained-command", output: "included-output", exitCode: 0, cancelled: false, truncated: false, timestamp: 4 },
      { role: "bashExecution", command: "excluded-command", output: "excluded-output", exitCode: 0, cancelled: false, truncated: false, excludeFromContext: true, timestamp: 5 },
    ];
    const identity = await f.prompt();
    const before = structuredClone(f.runtime.session.messages);
    const accounting = f.adapter.view().status.usage;
    const observations: OwnedUiPromptSuggestionObservation[] = [];
    const result = await f.adapter.generate({ identity, signal: AbortSignal.timeout(2000), observe: record => { observations.push(record); } });
    expect(result).toMatchObject({ text: "run the tests", outcome: "candidate" });
    expect(requests).toHaveLength(2);
    assertPrefix(requests[0]!.body, requests[1]!.body);
    const wire = JSON.stringify(requests[1]!.body);
    for (const marker of ["retained-compaction", "retained-branch", "retained-custom", "included-output", "persistent-hook-context"]) expect(wire).toContain(marker);
    expect(wire).not.toContain("excluded-output");
    expect(wire).not.toContain(f.adapter.sessionId);
    if (provider !== "anthropic") expect(requests[1]!.body.prompt_cache_key).toBe(f.runtime.session.sessionId);
    if (provider === "anthropic") expect(requests[1]!.body.thinking.budget_tokens).toBe(4096);
    expect(f.runtime.session.messages).toEqual(before);
    expect(f.adapter.view().status.usage).toEqual(accounting);
    await vi.waitFor(() => expect(observations).toHaveLength(1));
    expect(observations[0]).toMatchObject({ phase: "generation", outcome: "candidate", inferenceInvocations: { primary: null, suggestion: 1 }, networkAttempts: null, primaryUsage: { cacheRead: 8000 }, suggestionUsage: { cacheRead: 8000 } });
    const diagnostic = JSON.stringify(observations);
    for (const secret of [f.runtime.session.sessionId, "retained-custom", "run the tests", f.root, "synthetic-key", "headers", "prompt_cache_key"]) expect(diagnostic).not.toContain(secret);
    for (const omission of ["context", "budget", "tools", "routing"]) {
      const broken = structuredClone(requests[1]!.body);
      if (omission === "context") (broken.messages ?? broken.input).shift();
      if (omission === "budget") broken.thinking = { budget_tokens: 16384 };
      if (omission === "tools") broken.tools = [];
      if (omission === "routing") broken.prompt_cache_key = "wrong";
      expect(() => assertPrefix(requests[0]!.body, broken)).toThrow();
    }
  });

  it.each([false, true])("preserves default thinking and provider output-limit clamping, constrained=%s", async constrained => {
    const f = await fixture({ provider: "anthropic" });
    if (constrained) f.runtime.session.agent.state.model = { ...f.runtime.session.model!, contextWindow: 32768, maxTokens: 8192 };
    const identity = await f.prompt();
    expect((await f.adapter.generate({ identity, signal: AbortSignal.timeout(2000) })).outcome).toBe("candidate");
    assertPrefix(requests[0]!.body, requests[1]!.body);
    expect(requests[1]!.body.thinking.budget_tokens).toBeLessThan(requests[1]!.body.max_tokens);
    if (constrained) expect(requests[1]!.body.max_tokens).toBeLessThanOrEqual(8192);
    else expect(requests[1]!.body.thinking.budget_tokens).toBe(16384);
  });

  it.each([false, true])("uses main image conversion semantics, blocked=%s", async blockImages => {
    const f = await fixture({ blockImages });
    f.runtime.session.agent.state.messages = [{ role: "user", timestamp: 1, content: [
      { type: "text", text: "image-fixture" }, { type: "image", mimeType: "image/png", data: "c3ludGhldGlj" },
      { type: "image", mimeType: "image/png", data: "c3ludGhldGlj" }, { type: "text", text: "after-images" },
    ] }];
    const identity = await f.prompt();
    const result = await f.adapter.generate({ identity, signal: AbortSignal.timeout(2000) });
    expect(result.outcome).toBe("candidate");
    assertPrefix(requests[0]!.body, requests[1]!.body);
    expect(JSON.stringify(requests[1]!.body).includes("c3ludGhldGlj")).toBe(!blockImages);
    if (blockImages) expect(JSON.stringify(requests[1]!.body).match(/Image reading is disabled\./g)).toHaveLength(1);
  });

  it.each(["context", "before_provider_request", "before_provider_headers"] as const)("skips even observation-only %s hooks, leaving main execution intact", async hook => {
    let calls = 0;
    const f = await fixture({ extensions: [pi => {
      const observe = () => { calls += 1; };
      if (hook === "context") pi.on("context", observe);
      else if (hook === "before_provider_request") pi.on("before_provider_request", observe);
      else pi.on("before_provider_headers", observe);
    }] });
    const identity = await f.prompt();
    const result = await f.adapter.generate({ identity, signal: AbortSignal.timeout(2000) });
    expect(result).toMatchObject({ text: null, outcome: "unsupported-transformation" });
    expect(calls).toBe(1);
    expect(requests).toHaveLength(1);
  });

  it("fails closed on unknown metadata and recovers after an ordinary reload", async () => {
    const f = await fixture();
    const identity = await f.prompt();
    const get = vi.spyOn(f.loader, "getExtensions").mockImplementation(() => { throw new Error("private-extension-path"); });
    expect(await f.adapter.generate({ identity, signal: AbortSignal.timeout(2000) })).toMatchObject({ outcome: "unknown-extension-metadata", text: null });
    expect(requests).toHaveLength(1);
    get.mockRestore();
    await f.loader.reload();
    const next = await f.prompt();
    expect((await f.adapter.generate({ identity: next, signal: AbortSignal.timeout(2000) })).outcome).toBe("candidate");
  });

  it.each(["thinking", "images", "reload", "model"])("invalidates a pending result on %s changes", async change => {
    const f = await fixture();
    const identity = await f.prompt();
    let release!: () => void;
    beforeResponse = () => new Promise<void>(resolve => { release = resolve; });
    const pending = f.adapter.generate({ identity, signal: AbortSignal.timeout(4000) });
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    if (change === "thinking") f.runtime.session.setThinkingLevel("low");
    if (change === "images") f.settings.setBlockImages(true);
    if (change === "reload") await f.loader.reload();
    if (change === "model") f.runtime.session.agent.state.model = { ...f.runtime.session.model!, samplingParams: { temperature: 0.2 } };
    release();
    expect(await pending).toMatchObject({ text: null, outcome: "configuration-changed" });
    expect(f.adapter.isCurrent(identity)).toBe(false);
  });

  it("rejects mid-run changes and later stable responses work normally", async () => {
    const f = await fixture();
    beforeResponse = async () => { f.settings.setBlockImages(true); };
    const identity = await f.prompt();
    expect((await f.adapter.generate({ identity, signal: AbortSignal.timeout(2000) })).outcome).toBe("configuration-changed");
    beforeResponse = undefined;
    const next = await f.prompt();
    expect((await f.adapter.generate({ identity: next, signal: AbortSignal.timeout(2000) })).outcome).toBe("candidate");
  });

  it("remembers a known thinking change even when its value is restored before completion", async () => {
    const f = await fixture();
    beforeResponse = async () => { f.runtime.session.setThinkingLevel("low"); f.runtime.session.setThinkingLevel("high"); };
    const identity = await f.prompt();
    expect((await f.adapter.generate({ identity, signal: AbortSignal.timeout(2000) })).outcome).toBe("configuration-changed");
  });

  it("resolves refreshed credentials instead of replaying captured auth", async () => {
    const f = await fixture({ provider: "openai-codex" });
    const identity = await f.prompt();
    const fresh = syntheticCodexKey.replace(/fixture$/, "refreshed");
    await f.credentials.modify("openai-codex", async current => ({ ...current!, type: "oauth", access: fresh, refresh: "synthetic-refresh", expires: Date.now() + 86400000 }));
    expect((await f.adapter.generate({ identity, signal: AbortSignal.timeout(2000) })).outcome).toBe("candidate");
    expect(requests[1]!.headers.get("authorization")).toBe(`Bearer ${fresh}`);
    expect(requests[0]!.headers.get("authorization")).not.toBe(requests[1]!.headers.get("authorization"));
  });

  it.each(["native", "stream", "unknown-api"])("excludes opaque provider configuration: %s", async kind => {
    const f = await fixture();
    const identity = await f.prompt();
    const provider = f.modelRuntime.getProvider("openai")!;
    if (kind === "native") f.modelRuntime.registerNativeProvider(provider);
    if (kind === "stream") f.modelRuntime.registerProvider("openai", { api: "openai-responses", streamSimple: provider.streamSimple.bind(provider) });
    if (kind === "unknown-api") f.runtime.session.agent.state.model = { ...f.runtime.session.model!, api: "opaque-fixture-api" };
    expect((await f.adapter.generate({ identity, signal: AbortSignal.timeout(2000) })).outcome).toBe("unsupported-provider");
    expect(requests).toHaveLength(1);
  });

  it("retains supported provider defaults and fresh configured headers", async () => {
    const f = await fixture();
    f.modelRuntime.registerProvider("openai", { headers: { "x-fixture": "configured-header" } });
    f.runtime.session.agent.state.model = { ...f.runtime.session.model!, samplingParams: { temperature: 0.2, top_p: 0.9 } };
    const identity = await f.prompt();
    expect((await f.adapter.generate({ identity, signal: AbortSignal.timeout(2000) })).outcome).toBe("candidate");
    assertPrefix(requests[0]!.body, requests[1]!.body);
    expect(requests[1]!.body).toMatchObject({ temperature: 0.2, top_p: 0.9 });
    expect(requests[1]!.headers.get("x-fixture")).toBe("configured-header");
  });

  it("copies context at response completion rather than reading mutated objects at dispatch", async () => {
    const f = await fixture();
    const identity = await f.prompt();
    let release!: () => void;
    beforeResponse = () => new Promise<void>(resolve => { release = resolve; });
    const pending = f.adapter.generate({ identity, signal: AbortSignal.timeout(4000) });
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    const response = f.runtime.session.agent.state.messages.at(-1)!;
    if (response.role !== "assistant") throw new Error("missing fixture response");
    response.content = [{ type: "text", text: "mutated after completion" }];
    const tool = f.runtime.session.agent.state.tools[0]!;
    tool.description = "mutated schema";
    release();
    expect((await pending).outcome).toBe("stale");
    expect(JSON.stringify(requests[1]!.body)).not.toContain("mutated after completion");
    expect(JSON.stringify(requests[1]!.body)).not.toContain("mutated schema");
    expect(JSON.stringify(requests[1]!.body)).toContain("run the tests");
  });

  it("does not publish after context is superseded and ignores observer failures", async () => {
    const f = await fixture();
    const identity = await f.prompt();
    let release!: () => void;
    beforeResponse = () => new Promise<void>(resolve => { release = resolve; });
    const pending = f.adapter.generate({ identity, signal: AbortSignal.timeout(4000), observe: () => { throw new Error("observer failed"); } });
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    f.runtime.session.agent.state.messages = [...f.runtime.session.messages, { role: "user", content: "superseding user prompt", timestamp: 99 }];
    release();
    expect(await pending).toMatchObject({ text: null, outcome: "stale" });
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  it("does not infer missing cache counters from normalized zero", () => {
    const tool = suggestionMessages([{ role: "toolResult", toolCallId: "fixture", toolName: "fixture_tool", isError: false, timestamp: 1,
      content: [{ type: "text", text: "model-visible" }], addedToolNames: ["fixture_tool"], details: { uiOnly: () => {} },
    }], false)[0];
    expect(tool).toMatchObject({ role: "toolResult", content: [{ type: "text", text: "model-visible" }], addedToolNames: ["fixture_tool"] });
    expect(tool).not.toHaveProperty("details");
    expect(suggestionUsage({ usage: { input: 0, output: 3, cacheRead: 0 } })).toEqual({ input: null, output: 3, cacheRead: null, cacheWrite: null });
    expect(suggestionMessages([{ role: "custom", customType: "visible-context", display: false, content: "included", timestamp: 1 }], false)[0]).toMatchObject({ role: "user", content: [{ type: "text", text: "included" }] });
  });
});
