import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionNamingController } from "../../../src/features/session-naming/index.js";
import type { OwnedUiEvent, OwnedUiSessionBackend, OwnedUiSessionNameState, OwnedUiSessionNameCompletion, OwnedUiSessionViewModel } from "../../../src/contracts/owned-ui/index.js";

const controllers: SessionNamingController[] = [];
afterEach(() => { controllers.splice(0).forEach(controller => controller.dispose()); vi.useRealTimers(); });
const settle = async () => { for (let index = 0; index < 20; index++) await Promise.resolve(); };

function fixture(initial?: Partial<OwnedUiSessionNameState>) {
  let listener: (event: OwnedUiEvent) => void = () => {};
  let binding = 1;
  let enabled = true;
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
  const controller = new SessionNamingController({ backend, naming: { state: () => state, complete, apply }, enabled: () => enabled,
    withContext: async consume => consume(context),
  });
  controllers.push(controller);
  const emit = (event: object) => listener(event as OwnedUiEvent);
  return { controller, complete, apply, emit, get state() { return state; },
    prompt(text = "Fix the cache invalidation", id = `prompt-${blocks.length}`) { const block = { id, kind: "user", text }; blocks.push(block); emit({ type: "transcript-block", block }); },
    start() { emit({ type: "agent-run-started" }); },
    context(revision: string, notify = true) { context = { ...context, revision }; if (notify) emit({ type: "session-view", view: view() }); },
    rename(name = "my-task") { state = { ...state, name, nameEntryId: "manual", source: "user" }; },
    disable() { enabled = false; controller.settingsChanged(); },
    rebind() { binding++; state = { ...state, binding, sessionFile: "/other.jsonl" }; emit({ type: "session-view", view: view() }); },
  };
}

describe("automatic session naming", () => {
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
    expect(f.state.name).toBe("build-useful");
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
