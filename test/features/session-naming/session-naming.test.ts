import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionNamingController } from "../../../src/features/session-naming/index.js";
import type { OwnedUiEvent, OwnedUiSessionBackend, OwnedUiSessionNameState, OwnedUiSessionNameCompletion, OwnedUiSessionViewModel } from "../../../src/contracts/owned-ui/index.js";

const controllers: SessionNamingController[] = [];
afterEach(() => { controllers.splice(0).forEach(controller => controller.dispose()); vi.useRealTimers(); });
const settle = async () => {
  for (let index = 0; index < 20; index++) await Promise.resolve();
  await vi.dynamicImportSettled();
  for (let index = 0; index < 20; index++) await Promise.resolve();
};

type NameFormat = "kebab" | "sentence" | "title";

function fixture(initial?: Partial<OwnedUiSessionNameState>, initialFormat: NameFormat = "kebab") {
  let listener: (event: OwnedUiEvent) => void = () => {};
  let binding = 1;
  let enabled = true;
  let format = initialFormat;
  let beforeContext: (() => Promise<void>) | undefined;
  let context = { cwd: "/repo/task", branch: "feature/task" as string | null, revision: "first" };
  let state: OwnedUiSessionNameState = { sessionFile: "/session.jsonl", binding, name: null, nameEntryId: null, source: "unnamed", completedContext: null, ...initial };
  const blocks: Array<{ id: string; kind: string; text: string }> = [{ id: "old", kind: "user", text: "Old unrelated task" }];
  const view = () => ({ transcript: blocks, status: { footer: { repositoryPath: context.cwd, branch: context.branch, repositoryRevision: context.revision } } }) as unknown as OwnedUiSessionViewModel;
  const backend = {
    identity: { get sessionBindingGeneration() { return binding; } },
    session: { view, onEvent: (next: typeof listener) => { listener = next; listener({ type: "session-view", view: view() } as OwnedUiEvent); return () => { listener = () => {}; }; } },
  } as unknown as OwnedUiSessionBackend;
  const complete = vi.fn(async (_request: OwnedUiSessionNameCompletion) => "fix-cache");
  const apply = vi.fn((expected: OwnedUiSessionNameState, name: string, key: string) => {
    if (expected.binding !== binding || expected.nameEntryId !== state.nameEntryId || state.source === "user") return false;
    state = { ...state, name, source: "auto", nameEntryId: `name-${apply.mock.calls.length}`, completedContext: key };
    return true;
  });
  const controller = new SessionNamingController({ backend, naming: { state: () => state, complete, apply }, enabled: () => enabled, format: () => format,
    withContext: async consume => { await beforeContext?.(); return consume(context); },
  });
  controllers.push(controller);
  const emit = (event: object) => listener(event as OwnedUiEvent);
  return { controller, complete, apply, emit, get state() { return state; },
    prompt(text = "Fix the cache invalidation", id = `prompt-${blocks.length}`) { const block = { id, kind: "user", text }; blocks.push(block); emit({ type: "transcript-block", block }); },
    start() { emit({ type: "agent-run-started" }); },
    discuss(kind: "user" | "assistant" | "tool-result" | "thinking", text: string) {
      const block = { id: `history-${blocks.length}`, kind, text }; blocks.push(block); emit({ type: "transcript-block", block });
    },
    repository(branch: string, revision = "task") { context = { cwd: `/repo/${branch.split("/").at(-1)}`, branch, revision }; emit({ type: "session-view", view: view() }); },
    context(revision: string, notify = true) { context = { ...context, revision }; if (notify) emit({ type: "session-view", view: view() }); },
    rename(name = "my-task") { state = { ...state, name, nameEntryId: "manual", source: "user" }; },
    disable() { enabled = false; controller.settingsChanged(); },
    setFormat(next: NameFormat) { format = next; controller.settingsChanged(); },
    delayContext(wait: Promise<void>) { beforeContext = () => wait; },
    rebind() { binding++; state = { ...state, binding, sessionFile: "/other.jsonl" }; emit({ type: "session-view", view: view() }); },
  };
}

describe("automatic session naming", () => {
  it("resolves approvals against relevant task discussion and verified branch hints", async () => {
    const f = fixture(undefined, "sentence");
    f.repository("feature/spinner-style-settings");
    f.discuss("user", "Add selectable spinner style settings");
    f.discuss("assistant", "The plan adds spinner style settings to Agent settings. Shall I implement it?");
    f.complete.mockResolvedValue("Spinner style settings");
    f.start(); f.prompt("ok do it"); await settle();
    const request = f.complete.mock.calls[0]![0].prompt;
    expect(request).toContain("spinner style settings");
    expect(request).toContain("feature/spinner-style-settings");
    expect(request).not.toContain("Old unrelated task");
    expect(f.state.name).toBe("Spinner style settings");
  });

  it("uses recent discussion for an approval without concrete repository hints", async () => {
    const f = fixture(undefined, "sentence");
    f.discuss("user", "Add spinner style settings");
    f.discuss("assistant", "I will add selectable styles. Proceed?");
    f.complete.mockResolvedValue("");
    f.start(); f.prompt("yes please"); await settle();
    expect(f.complete.mock.calls[0]![0].prompt).toContain("Add spinner style settings");
    expect(f.state.name).toBe("Spinner style settings");
  });

  it("rejects generic provider labels and falls back to the concrete branch subject", async () => {
    const f = fixture(undefined, "sentence"); f.repository("feature/spinner-style-settings");
    f.complete.mockResolvedValue("Implement task");
    f.start(); f.prompt("ok do it"); await settle();
    expect(f.complete).toHaveBeenCalledTimes(2);
    expect(f.state.name).toBe("Spinner style settings");
  });

  it("does not carry an unrelated task across repository-context regeneration", async () => {
    const f = fixture(undefined, "sentence");
    f.start(); f.prompt("Fix the cache invalidation"); await settle();
    f.discuss("assistant", "The cache invalidation fix is complete");
    f.repository("feature/spinner-style-settings");
    f.complete.mockResolvedValue(""); f.start(); f.prompt("ok do it"); await settle();
    const request = f.complete.mock.calls[1]![0].prompt;
    expect(request).not.toContain("cache invalidation");
    expect(f.state.name).toBe("Spinner style settings");
  });

  it("bounds discussion and excludes tools, thinking, and attachment paths", async () => {
    const f = fixture(undefined, "sentence"); f.repository("feature/spinner-style-settings");
    for (let index = 0; index < 20; index++) f.discuss("assistant", `spinner style settings ${"discussion ".repeat(500)}`);
    f.discuss("tool-result", "SECRET_TOOL_CONTENT"); f.discuss("thinking", "PRIVATE_REASONING");
    f.complete.mockResolvedValue("");
    f.start(); f.prompt("Add spinner style settings C:\\Users\\person\\herdr-paste-123.png"); await settle();
    const request = f.complete.mock.calls[0]![0].prompt;
    expect(request.length).toBeLessThan(10_000);
    expect(request).not.toMatch(/SECRET_TOOL_CONTENT|PRIVATE_REASONING|herdr-paste|Users/);
    expect(f.state.name).toBe("Spinner style settings");
  });

  it("rejects provider attachment paths instead of saving a filename", async () => {
    const f = fixture(undefined, "sentence"); f.complete.mockResolvedValue("C:\\Users\\person\\herdr-paste-123.png");
    f.start(); f.prompt("Add spinner style settings"); await settle();
    expect(f.state.name).toBe("Spinner style settings");
  });

  it.each(["kebab", "sentence", "title"] as const)("keeps three explanatory words without the former cap in %s", async format => {
    const f = fixture(undefined, format); f.complete.mockResolvedValue("spinner style settings and colors");
    f.start(); f.prompt(); await settle();
    expect(f.state.name).toBe(format === "kebab" ? "spinner-style-settings" : format === "title" ? "Spinner Style Settings" : "Spinner style settings");
    expect(f.state.name!.split(/[- ]/u)).toHaveLength(3);
  });

  it.each([
    ["kebab", "fix-api-cache", "lowercase hyphenated"],
    ["sentence", "Fix API cache", "sentence case"],
    ["title", "Fix API Cache", "title case"],
  ] as const)("formats provider names as %s with matching generation instructions", async (format, expected, instructions) => {
    const f = fixture(undefined, format);
    f.complete.mockResolvedValue('  "fix_API-Cache"  ');
    f.start(); f.prompt(); await settle();
    expect(f.state.name).toBe(expected);
    expect(f.complete.mock.calls[0]?.[0].prompt).toContain(instructions);
    expect(f.complete).toHaveBeenCalledOnce();
  });

  it.each([
    ["sentence", "Fix GitHub API"], ["title", "Fix GitHub API"],
    ["kebab", "fix-github-api"],
  ] as const)("preserves technical spelling in %s names", async (format, expected) => {
    const f = fixture(undefined, format); f.complete.mockResolvedValue("fix GitHub API");
    f.start(); f.prompt(); await settle(); expect(f.state.name).toBe(expected);
  });

  it.each([
    ["kebab", "resolve-extraordinary"], ["sentence", "Resolve extraordinary"], ["title", "Resolve Extraordinary"],
  ] as const)("bounds %s names at a whole word", async (format, expected) => {
    const f = fixture(undefined, format); f.complete.mockResolvedValue("resolve extraordinary performance errors");
    f.start(); f.prompt(); await settle(); expect(f.state.name).toBe(expected); expect(f.state.name!.length).toBeLessThanOrEqual(32);
  });

  it.each(["kebab", "sentence", "title"] as const)("bounds an oversized single word in %s", async format => {
    const f = fixture(undefined, format); f.complete.mockResolvedValue("abcdefghijklmnopqrstuvwxyzabcdefghijk");
    f.start(); f.prompt(); await settle(); expect(f.state.name).toHaveLength(32);
    expect(f.state.name).toBe(format === "kebab" ? "abcdefghijklmnopqrstuvwxyzabcdef" : "Abcdefghijklmnopqrstuvwxyzabcdef");
  });

  it.each([
    ["kebab", "api-cache", "new-task"], ["sentence", "API cache", "New task"], ["title", "API Cache", "New Task"],
  ] as const)("formats prompt and empty-word fallback as %s", async (format, expected, empty) => {
    const f = fixture(undefined, format); f.complete.mockResolvedValue("!!!");
    f.start(); f.prompt("fix API cache later"); await settle();
    expect(f.state.name).toBe(expected); expect(f.complete).toHaveBeenCalledTimes(2);
    const missing = fixture(undefined, format); missing.complete.mockResolvedValue("");
    missing.start(); missing.prompt("???"); await settle(); expect(missing.state.name).toBe(empty);
  });

  it.each([false, true])("uses the latest format for a pending result, with delayed apply %s", async delayed => {
    const f = fixture(); let answer!: (name: string) => void;
    f.complete.mockImplementation(() => new Promise(resolve => { answer = resolve; }));
    f.start(); f.prompt(); await settle();
    let release!: () => void;
    if (delayed) { f.delayContext(new Promise(resolve => { release = resolve; })); answer("fix API cache"); await settle(); }
    f.setFormat("title");
    if (delayed) release(); else answer("fix API cache");
    await settle(); expect(f.state.name).toBe("Fix API Cache"); expect(f.complete).toHaveBeenCalledOnce();
  });

  it("uses the latest format for fallback after a pending provider failure", async () => {
    const f = fixture(); let answer!: (name: string) => void;
    f.complete.mockImplementationOnce(() => new Promise(resolve => { answer = resolve; })).mockResolvedValue("");
    f.start(); f.prompt("fix API cache"); await settle();
    f.setFormat("sentence"); answer(""); await settle();
    expect(f.state.name).toBe("API cache"); expect(f.complete).toHaveBeenCalledTimes(2);
  });

  it("keeps completed names on format changes and uses the choice at the next context regeneration", async () => {
    const f = fixture(); f.start(); f.prompt(); await settle();
    f.setFormat("sentence"); await settle(); expect(f.state.name).toBe("fix-cache"); expect(f.complete).toHaveBeenCalledOnce();
    f.start(); f.prompt("Follow up"); await settle(); expect(f.complete).toHaveBeenCalledOnce();
    f.context("next"); f.start(); f.prompt("Fix cache again"); await settle();
    expect(f.state.name).toBe("Fix cache"); expect(f.complete).toHaveBeenCalledTimes(2);
    f.rename("My Custom Name"); f.setFormat("title"); f.context("another"); f.start(); f.prompt(); await settle();
    expect(f.state.name).toBe("My Custom Name"); expect(f.complete).toHaveBeenCalledTimes(2);
  });

  it("waits for the run's projected prompt and names while the run is still active", async () => {
    const f = fixture(); f.start(); await settle(); expect(f.complete).not.toHaveBeenCalled();
    f.prompt(); await settle();
    expect(f.complete).toHaveBeenCalledOnce();
    expect(f.complete.mock.calls[0]).toEqual([expect.objectContaining({ prompt: expect.stringContaining("Fix the cache invalidation"), maxTokens: 4096 })]);
    expect(f.complete.mock.calls[0]?.[0]).not.toEqual(expect.objectContaining({ prompt: expect.stringContaining("Old unrelated task") }));
    expect(f.state).toMatchObject({ name: "fix-cache", source: "auto" });
    f.start(); f.prompt("More details"); await settle(); expect(f.complete).toHaveBeenCalledOnce();
  });

  it("does not cancel valid first-prompt naming when initial footer metadata catches up", async () => {
    const f = fixture(); let answer!: (name: string) => void;
    f.complete.mockImplementation(() => new Promise(resolve => { answer = resolve; }));
    f.start(); f.prompt(); await settle();
    f.emit({ type: "session-view", view: { transcript: [], status: { footer: { repositoryPath: "/initial-footer" } } } });
    await settle(); answer("first-name"); await settle(); expect(f.state.name).toBe("first-name");
  });

  it("coalesces context transitions and uses the next prompt, including same-path re-entry", async () => {
    const f = fixture(); f.start(); f.prompt(); await settle();
    f.context("exit"); f.context("reentered"); await settle(); expect(f.complete).toHaveBeenCalledOnce();
    f.start(); f.prompt("Add a search box"); await settle();
    expect(f.complete).toHaveBeenCalledTimes(2);
    expect(f.complete.mock.calls[1]?.[0]).toEqual(expect.objectContaining({ prompt: expect.stringContaining("Add a search box") }));
  });

  it("replaces an obsolete pending chain on the first prompt in an unobserved new context", async () => {
    const f = fixture(); let oldAnswer!: (name: string) => void;
    f.complete.mockImplementationOnce(() => new Promise(resolve => { oldAnswer = resolve; }));
    f.start(); f.prompt(); await settle();
    f.context("unseen-new-context", false); f.start(); f.prompt("New work"); await settle();
    expect(f.complete).toHaveBeenCalledTimes(2);
    expect(f.apply).toHaveBeenCalledOnce();
    oldAnswer("obsolete-name"); await settle();
    expect(f.apply).toHaveBeenCalledOnce(); expect(f.state.name).not.toBe("obsolete-name");
  });

  it("does not reinterpret a running turn after context changes or delayed projection", async () => {
    const f = fixture(); f.start(); await settle(); f.context("new"); f.prompt(); await settle();
    expect(f.complete).not.toHaveBeenCalled();
    f.start(); f.prompt("New task"); await settle(); expect(f.complete).toHaveBeenCalledOnce();
  });

  it("drops results when an unobserved context transition occurs before apply", async () => {
    const f = fixture(); let answer!: (name: string) => void;
    f.complete.mockImplementation(() => new Promise(resolve => { answer = resolve; }));
    f.start(); f.prompt(); await settle(); f.context("unseen-reentry", false); answer("old-result"); await settle();
    expect(f.apply).not.toHaveBeenCalled();
  });

  it.each(["manual", "rebind", "disable", "dispose"])("preserves ownership and binding after %s", async action => {
    const f = fixture(); let answer!: (name: string) => void;
    f.complete.mockImplementation(() => new Promise(resolve => { answer = resolve; }));
    f.start(); f.prompt(); await settle();
    if (action === "manual") f.rename();
    if (action === "rebind") f.rebind();
    if (action === "disable") f.disable();
    if (action === "dispose") f.controller.dispose();
    answer("late-result"); await settle();
    expect(f.state.name).not.toBe("late-result");
  });

  it("preserves manually owned and unknown-provenance names", async () => {
    const f = fixture({ name: "custom", source: "user" }); f.start(); f.prompt(); await settle();
    expect(f.complete).not.toHaveBeenCalled();
  });

  it("retains completed context across resume", async () => {
    const first = fixture(); first.start(); first.prompt(); await settle();
    const resumed = fixture(first.state); resumed.start(); resumed.prompt("Follow up"); await settle();
    expect(resumed.complete).not.toHaveBeenCalled();
    resumed.context("changed"); resumed.start(); resumed.prompt("Different task"); await settle();
    expect(resumed.complete).toHaveBeenCalledOnce();
  });

  it("treats a different durable session file as a new naming context even with copied provenance", async () => {
    const f = fixture(); f.start(); f.prompt(); await settle();
    f.rebind(); f.start(); f.prompt("Forked task"); await settle();
    expect(f.complete).toHaveBeenCalledTimes(2);
  });

  it("escalates bounded budgets and falls back deterministically", async () => {
    const f = fixture(); f.complete.mockResolvedValue(""); f.start(); f.prompt("Build useful session names"); await settle();
    expect(f.complete.mock.calls.map(call => call[0])).toEqual([
      expect.objectContaining({ maxTokens: 4096 }), expect.objectContaining({ maxTokens: 32768 }),
    ]);
    expect(f.state.name).toBe("useful-session-names");
  });

  it("times out uncooperative providers and never falls back after cancellation", async () => {
    vi.useFakeTimers(); const f = fixture(); f.complete.mockImplementation(() => new Promise(() => {}));
    f.start(); f.prompt(); await settle(); await vi.advanceTimersByTimeAsync(30_000);
    expect(f.complete).toHaveBeenCalledTimes(2);
    f.disable(); await vi.advanceTimersByTimeAsync(60_000); expect(f.apply).not.toHaveBeenCalled();
  });

  it("ignores slash commands, compaction, retries without a fresh prompt, and duplicate blocks", async () => {
    const f = fixture(); f.emit({ type: "session-view", view: { transcript: [], status: {} } });
    f.start(); f.prompt("/compact"); f.emit({ type: "agent-run-settled" }); await settle();
    f.start(); await settle(); expect(f.complete).not.toHaveBeenCalled();
    f.prompt("Fix cache", "fresh"); f.prompt("Fix cache", "fresh"); await settle(); expect(f.complete).toHaveBeenCalledOnce();
  });
});
