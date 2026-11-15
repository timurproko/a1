/**
 * External exit control over the owned shell: read-only readiness, fail-closed refusals, and a single
 * admitted exit that runs the ordinary quit path after the caller's turn. The engine is the pinned-Pi double.
 */
import { describe, expect, it, vi } from "vitest";
import { fixture, nextImmediate } from "./session-shell-fixture.js";

describe("session exit control", () => {
  it("reports an idle empty shell as admissible without touching it", async () => {
    const { engine, shell } = await fixture([], [], true);
    try {
      const before = engine.calls.length;
      expect(shell.readiness()).toEqual({ lifecycle: "ready", editorEmpty: true, pendingSubmissions: 0, queuedInput: 0, overlayOpen: false, exitAdmissible: true, blockers: [] });
      expect(engine.calls.length).toBe(before);
      expect(engine.calls).not.toContain("clearQueue");
    } finally { await shell.dispose(); }
  });

  it("refuses while a turn runs, a draft exists or input is queued, in that order, changing nothing", async () => {
    const { engine, shell } = await fixture([], [], true);
    try {
      engine.session.isStreaming = true;
      engine.session.emit({ type: "agent_start" });
      await vi.waitFor(() => expect(shell.view().lifecycle).toBe("busy"));
      shell.root.editor.setText("  ");
      await engine.session.followUp("later");
      const readiness = shell.readiness();
      expect(readiness).toMatchObject({ lifecycle: "busy", editorEmpty: false, queuedInput: 1, exitAdmissible: false, blockers: ["session-busy", "editor-not-empty", "pending-input"] });
      expect(shell.requestExit()).toEqual({ admitted: false, blocker: "session-busy" });
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe("  ");
      expect(engine.session.queued).toHaveLength(1);
      expect(engine.calls).not.toContain("clearQueue");
      expect(engine.calls).not.toContain("abort");
      expect(engine.calls).not.toContain("dispose");
      expect(shell.view().lifecycle).toBe("busy");
    } finally { await shell.dispose(); }
  });

  it("refuses while an overlay is open and treats an unknown queue as pending input", async () => {
    const { adapter, engine, shell } = await fixture([], [], true);
    try {
      const handle = shell.showSelector("Pick", [{ id: "a", label: "A" }], () => {});
      expect(shell.readiness()).toMatchObject({ overlayOpen: true, blockers: ["overlay-open"] });
      expect(shell.requestExit()).toEqual({ admitted: false, blocker: "overlay-open" });
      handle.hide();
      vi.spyOn(adapter.workflows, "queuedWorkflowCount").mockReturnValue(null);
      expect(shell.readiness()).toMatchObject({ queuedInput: 0, blockers: ["pending-input"] });
      expect(shell.requestExit()).toEqual({ admitted: false, blocker: "pending-input" });
      await nextImmediate();
      expect(engine.calls).not.toContain("dispose");
    } finally { await shell.dispose(); }
  });

  it("admits once, acknowledges before shutdown starts, then quits through the ordinary path", async () => {
    const { adapter, engine, shell, terminal } = await fixture([], [], true);
    const executeWorkflow = vi.spyOn(adapter.workflows, "executeWorkflow");
    try {
      expect(shell.requestExit()).toEqual({ admitted: true });
      // Invariant: the caller's turn sees no teardown yet; the acknowledgement can be written first.
      expect(executeWorkflow).not.toHaveBeenCalled();
      expect(engine.calls).not.toContain("dispose");
      expect(shell.readiness()).toMatchObject({ exitAdmissible: false, blockers: ["session-stopping"] });
      expect(shell.requestExit()).toEqual({ admitted: false, blocker: "session-stopping" });
      await nextImmediate();
      await expect(shell.waitUntilStopped()).resolves.toBeUndefined();
      expect(executeWorkflow).toHaveBeenCalledWith({ command: "quit", argument: "" });
      expect(executeWorkflow).toHaveBeenCalledTimes(1);
      expect(engine.calls).toContain("dispose");
      expect(terminal.active).toBe(false);
      expect(shell.requestExit()).toEqual({ admitted: false, blocker: "session-stopping" });
    } finally { await shell.dispose(); }
  });

  it("allows a later external request after a failed quit", async () => {
    const { adapter, shell } = await fixture([], [], true);
    try {
      const executeWorkflow = vi.spyOn(adapter.workflows, "executeWorkflow").mockRejectedValueOnce(new Error("engine refused"));
      expect(shell.requestExit()).toEqual({ admitted: true });
      await nextImmediate();
      await vi.waitFor(() => expect(shell.readiness().blockers).not.toContain("session-stopping"));
      expect(executeWorkflow).toHaveBeenCalledTimes(1);
      executeWorkflow.mockRestore();
      expect(shell.requestExit()).toEqual({ admitted: true });
      await nextImmediate();
      await expect(shell.waitUntilStopped()).resolves.toBeUndefined();
    } finally { await shell.dispose(); }
  });
});
