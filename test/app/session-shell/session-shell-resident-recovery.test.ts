import { describe, expect, it, vi } from "vitest";
import { residentFixture } from "./session-shell-fixture.js";

describe("resident session recovery admission", () => {
  it("keeps the editor and dispatches nothing when durable admission fails", async () => {
    const admit = vi.fn(async () => { throw new Error("disk full"); });
    const { engine, shell } = await residentFixture({ requestDetach: async () => true, admit });
    const result = await shell.submit("keep this prompt");
    expect(result.outcome).toBe("rejected");
    expect(admit).toHaveBeenCalledWith(expect.objectContaining({ text: "keep this prompt", kind: "prompt" }));
    expect(engine.session.calls).not.toContain("prompt:keep this prompt");
    expect(shell.root.editor.getText()).toBe("keep this prompt");
    expect(shell.root.render(100).join("\n")).toContain("recovery journal could not be synchronized");
    await shell.dispose();
  });

  it("correlates a durably admitted prompt after dispatch", async () => {
    const admit = vi.fn(async () => ({ id: "submission-1" }));
    const correlated = vi.fn(async () => {});
    const { engine, shell } = await residentFixture({ requestDetach: async () => true, admit, correlated });
    await expect(shell.submit("send once")).resolves.toMatchObject({ outcome: "completed" });
    expect(engine.session.calls).toContain("prompt:send once");
    expect(correlated).toHaveBeenCalledWith("submission-1", expect.stringMatching(/^pi-shell-prompt-/));
    await shell.dispose();
  });

  it("routes /restart-tab through the authenticated resident bridge action", async () => {
    const requestRestart = vi.fn(async () => true);
    const { engine, shell } = await residentFixture({ requestDetach: async () => true, requestRestart });
    await expect(shell.submit("/restart-tab")).resolves.toMatchObject({ outcome: "completed" });
    expect(requestRestart).toHaveBeenCalledOnce();
    expect(engine.session.calls).not.toContain("prompt:/restart-tab");
    expect(shell.root.render(100).join("\n")).toContain("Restarting resident tab");
    await shell.dispose();
  });

  it("shows a non-destructive stall notice and clears stalled status on progress", async () => {
    const reportStatus = vi.fn();
    const { engine, adapter, shell } = await residentFixture({
      requestDetach: async () => true,
      reportStatus,
      stallNoticeSeconds: 0.01,
    });
    engine.session.emit({ type: "agent_start" });
    await adapter.flushEvents();
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(reportStatus).toHaveBeenCalledWith("stalled");
    expect(shell.root.render(100).join("\n")).toContain("No progress for 1 min");
    engine.session.emit({
      type: "message_update",
      message: { role: "assistant", content: [{ type: "text", text: "next" }], timestamp: 1 },
      assistantMessageEvent: { type: "text_delta", delta: "next" },
    });
    await adapter.flushEvents();
    expect(reportStatus).toHaveBeenCalledWith("working");
    await shell.dispose();
  });

  it("offers an unfinished prompt and keeps a simultaneous draft in editor history", async () => {
    const checkpoint = vi.fn();
    const { shell } = await residentFixture({
      requestDetach: async () => true,
      checkpoint,
      recovered: { prompts: [{ id: "submission-1", text: "unfinished prompt" }], draft: "unsent draft" },
    });
    expect(shell.root.editor.getText()).toBe("unfinished prompt");
    shell.root.editor.setText("");
    shell.root.editor.handleInput?.("\u001b[A");
    expect(shell.root.editor.getText()).toBe("unsent draft");
    expect(checkpoint).toHaveBeenCalled();
    await shell.dispose();
  });
});
