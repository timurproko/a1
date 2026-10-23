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

  it("keeps a legal multi-image payload out of bounded journal admission and sends every image", async () => {
    const admit = vi.fn(async (_input: unknown) => ({ id: "submission-images" }));
    const images = Array.from({ length: 8 }, () => Object.freeze({
      type: "image" as const,
      data: "AAAA".repeat(80 * 1024),
      mimeType: "image/png",
    }));
    expect(Buffer.byteLength(JSON.stringify(images))).toBeGreaterThan(2 * 1024 * 1024);
    const { engine, shell } = await residentFixture({ requestDetach: async () => true, admit });
    const preparation = vi.spyOn(shell.root, "preparePromptSubmission").mockReturnValue({
      text: "inspect screenshots",
      images,
    });
    try {
      await expect(shell.submit("inspect screenshots")).resolves.toMatchObject({ outcome: "completed" });
      expect(admit).toHaveBeenCalledWith(expect.objectContaining({ text: "inspect screenshots", kind: "prompt" }));
      expect(admit.mock.calls[0]![0]).not.toHaveProperty("images");
      expect(engine.session.promptOptions).toEqual([{ images }]);
    } finally {
      preparation.mockRestore();
      await shell.dispose();
    }
  });

  it("does not expose a /restart-tab management command", async () => {
    const { engine, shell } = await residentFixture({ requestDetach: async () => true });
    await expect(shell.submit("/restart-tab")).resolves.toMatchObject({ outcome: "completed" });
    expect(engine.session.calls).toContain("prompt:/restart-tab");
    expect(shell.root.render(100).join("\n")).not.toContain("Restarting resident tab");
    await shell.dispose();
  });

  it("reports a stall without a transcript line and clears stalled status on progress", async () => {
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
    expect(shell.root.render(100).join("\n")).not.toContain("No progress");
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

  it("rehydrates verified recovered images and removes unresolved image tokens", async () => {
    const validTag = "[📷 screenshot-aabbccdd]";
    const missingTag = "[📷 screenshot-deadbeef]";
    const attachment = Object.freeze({ type: "image" as const, data: "aA==", mimeType: "image/png" });
    const sidecar = {
      write: vi.fn(),
      readAttachment: vi.fn((id: string) => id === "aabbccdd" ? attachment : null),
    };
    const store = {
      start() {}, refresh() {}, close: async () => {},
      onSnapshot: () => () => {}, onFailure: () => () => {},
      record: async () => "skipped" as const,
    };
    const { shell } = await residentFixture({
      requestDetach: async () => true,
      recovered: { prompts: [{ id: "submission-images", text: `before ${validTag} middle ${missingTag} after` }], draft: null },
    }, { store, limit: 100, imageSidecar: sidecar });
    try {
      const text = shell.root.editor.getText();
      expect(text).toContain(validTag);
      expect(text).not.toContain(missingTag);
      expect(shell.root.preparePromptSubmission(text).images).toEqual([attachment]);
      expect(sidecar.readAttachment).toHaveBeenCalledWith("aabbccdd");
      expect(sidecar.readAttachment).toHaveBeenCalledWith("deadbeef");
    } finally { await shell.dispose(); }
  });

  it("removes recovered image tokens when persistent history is disabled", async () => {
    const tag = "[📷 screenshot-deadbeef]";
    const { shell } = await residentFixture({
      requestDetach: async () => true,
      recovered: { prompts: [{ id: "submission-images", text: `before ${tag} after` }], draft: null },
    });
    try {
      expect(shell.root.editor.getText()).not.toContain(tag);
      expect(shell.root.editor.getText()).toContain("before");
      expect(shell.root.editor.getText()).toContain("after");
      expect(shell.root.preparePromptSubmission(shell.root.editor.getText()).images).toEqual([]);
    } finally { await shell.dispose(); }
  });
});
