import { describe, expect, it, vi } from "vitest";
import { EngineViewState } from "../../../../src/integrations/pi/engine/view-state.js";

describe("EngineViewState", () => {
  it("starts with a starting session that does not accept submissions", () => {
    const state = new EngineViewState();
    expect(state.lifecycle).toBe("starting");
    expect(state.editor.submitEnabled).toBe(false);
    expect(state.terminal).toMatchObject({ columns: 100, rows: 32, hardwareCursor: false });
    state.markReady();
    expect(state.lifecycle).toBe("ready");
    expect(state.editor.submitEnabled).toBe(true);
  });

  it("enters and leaves work, reporting whether the session was already busy", () => {
    const state = new EngineViewState();
    expect(state.enterWork("Working")).toBe(false);
    expect(state.enterWork("Still working")).toBe(true);
    expect(state.status).toMatchObject({ workingMessage: "Still working", workingProgress: null });
    expect(state.setWorkProgress(40)).toBe(true);
    expect(state.setWorkProgress(40)).toBe(false);
    state.leaveWork();
    expect(state.lifecycle).toBe("ready");
    expect(state.status).toMatchObject({ workingMessage: null, workingProgress: null });
  });

  it("advances the revision per event and recomputes usage once per published view", () => {
    const state = new EngineViewState();
    const read = vi.fn(() => ({ tokens: 1 }) as never);
    state.advance();
    state.invalidate();
    expect(state.revision).toBe(2);
    state.usage(read);
    state.usage(read);
    expect(read).toHaveBeenCalledOnce();
    state.invalidateUsage();
    state.usage(read);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("queues submissions, offers navigated text only to an empty editor, and resets on replacement", () => {
    const state = new EngineViewState();
    state.setQueuedSubmissions(["one"]);
    expect(state.editor).toMatchObject({ queuedSubmissions: ["one"], historyRevision: 1 });
    state.offerEditorText("from tree");
    expect(state.editor).toMatchObject({ text: "from tree", cursorOffset: 9 });
    state.offerEditorText("ignored");
    expect(state.editor.text).toBe("from tree");
    state.enterWork("Working");
    state.replaceSession();
    expect(state.editor).toMatchObject({ text: "", queuedSubmissions: [], historyRevision: 2, submitEnabled: true });
    expect(state.status).toMatchObject({ workingMessage: null, badges: [] });
  });

  it("settles a delivery overload as ready, failed, or stopped", () => {
    const state = new EngineViewState();
    state.settleOverload(true, false);
    expect([state.lifecycle, state.editor.submitEnabled]).toEqual(["ready", true]);
    state.settleOverload(false, false);
    expect([state.lifecycle, state.editor.submitEnabled]).toEqual(["failed", false]);
    state.settleOverload(true, true);
    expect([state.lifecycle, state.editor.submitEnabled]).toEqual(["stopped", false]);
    expect(state.revision).toBe(3);
  });

  it("keeps the last hundred diagnostics and the last eight status messages", () => {
    const state = new EngineViewState();
    for (let index = 0; index < 105; index++) state.recordDiagnostic("warning", "code", `message ${index}`, true);
    expect(state.diagnostics).toHaveLength(100);
    expect(state.diagnostics[0]?.message).toBe("message 5");
    expect(state.status.diagnostics).toHaveLength(8);
    expect(state.status.diagnostics.at(-1)).toBe("message 104");
  });
});
