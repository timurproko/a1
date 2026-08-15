import { describe, expect, it } from "vitest";
import { createPiEngineAdapter, type PiRuntimeLike, type PiSessionLike } from "../../../src/foundation/pi-engine-adapter/index.js";
import { OwnedPiSessionController } from "../../../src/features/owned-ui/index.js";

class Session implements PiSessionLike {
  readonly sessionId = "pi-session";
  model: unknown = { provider: "openai", id: "gpt-5", name: "GPT-5" };
  thinkingLevel: unknown = "medium";
  isStreaming = false;
  readonly isIdle = true;
  isRetrying = false;
  isCompacting = false;
  readonly messages: readonly unknown[] = [];
  readonly calls: string[] = [];
  #listeners = new Set<(event: unknown) => void>();

  subscribe(listener: (event: unknown) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  emit(event: unknown): void {
    for (const listener of this.#listeners) listener(event);
  }

  async prompt(text: string): Promise<void> { this.calls.push(`prompt:${text}`); }
  async steer(text: string): Promise<void> { this.calls.push(`steer:${text}`); }
  async followUp(text: string): Promise<void> { this.calls.push(`followUp:${text}`); }
  async abort(): Promise<void> { this.calls.push("abort"); }
  abortRetry(): void { this.calls.push("abortRetry"); }
  abortCompaction(): void { this.calls.push("abortCompaction"); }
  async compact(): Promise<void> { this.calls.push("compact"); }
  async setModel(model: unknown): Promise<void> { this.model = model; this.calls.push("setModel"); }
  setThinkingLevel(level: unknown): void { this.thinkingLevel = level; this.calls.push(`thinking:${String(level)}`); }
  dispose(): void {}
}

class Runtime implements PiRuntimeLike {
  session = new Session();
  readonly services = {
    modelRuntime: {
      getModel(providerId: string, modelId: string): unknown {
        return modelId === "missing" ? undefined : { provider: providerId, id: modelId, name: modelId };
      },
    },
    diagnostics: [],
  };
  readonly diagnostics = [];
  readonly calls: string[] = [];
  setRebindSession(): void {}
  async newSession(): Promise<void> { this.calls.push("newSession"); }
  async switchSession(sessionPath: string): Promise<void> { this.calls.push(`switch:${sessionPath}`); }
  async dispose(): Promise<void> { this.calls.push("dispose"); }
}

async function controllerFixture() {
  const runtime = new Runtime();
  const adapter = await createPiEngineAdapter({
    cwd: "D:/work",
    agentDir: "D:/agent",
    sessionId: "owned-1",
    createRuntime: async () => runtime,
  });
  const controller = new OwnedPiSessionController({ adapter, width: 80 });
  return { adapter, controller, runtime, session: runtime.session };
}

describe("owned Pi session controller", () => {
  it("wires prompt, abort, retry, compaction, model, thinking, resume, settings, and shutdown through the adapter", async () => {
    const { controller, runtime, session } = await controllerFixture();
    await controller.submit("Inspect repository");
    await controller.abort();
    await controller.retry();
    await controller.compact();
    await controller.setModel({ providerId: "openai", modelId: "gpt-5.1", displayName: "GPT-5.1" });
    await controller.setThinkingLevel("high");
    await controller.newSession();
    await controller.resumeSession("C:/sessions/one.jsonl");
    await controller.setSetting("tui.tight", true);
    const shutdown = await controller.shutdown();

    expect(session.calls).toEqual([
      "prompt:Inspect repository",
      "abort",
      "prompt:Inspect repository",
      "compact",
      "setModel",
      "thinking:high",
    ]);
    expect(runtime.calls).toEqual(["newSession", "switch:C:/sessions/one.jsonl", "dispose"]);
    expect(controller.settings().get("tui.tight")).toBe(true);
    expect(shutdown.outcome).toBe("completed");
  });

  it("updates root components from adapter lifecycle, queue, status, and transcript events", async () => {
    const { adapter, controller, session } = await controllerFixture();
    const views: number[] = [];
    controller.onView(() => views.push(1));

    session.emit({ type: "agent_start" });
    session.emit({ type: "queue_update", steering: ["adjust"], followUp: [] });
    session.emit({
      type: "message_start",
      message: { role: "assistant", content: [{ type: "text", text: "Working" }], timestamp: 1 },
    });
    await adapter.flushEvents();

    expect(controller.root.editor.state().queuedSubmissions).toEqual(["adjust"]);
    expect(controller.view().lifecycle).toBe("busy");
    expect(controller.root.render({ columns: 40, rows: 10 }).join("\n")).toContain("Working");
    const frame = controller.root.render({ columns: 40, rows: 10 });
    expect(frame.some(row => row.includes("╭─"))).toBe(true);
    expect(frame.some(row => row.includes("│ "))).toBe(true);
    expect(frame.at(-1)).toContain("╰");
    expect(frame.every(row => row.length <= 40)).toBe(true);
    expect(views.length).toBeGreaterThan(1);
  });

  it("submits editor Enter input through the adapter", async () => {
    const { controller, session } = await controllerFixture();
    controller.root.editor.setText("Use the editor");
    controller.root.editor.handleInput({ type: "key", key: "enter", ctrl: false, alt: false, shift: false });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(session.calls).toContain("prompt:Use the editor");
    expect(controller.root.editor.getText()).toBe("");
  });

  it("applies and rolls back a vanilla preset override without mutating installed Pi components", async () => {
    const { UserMessageComponent } = await import("@earendil-works/pi-coding-agent");
    const originalRender = UserMessageComponent.prototype.render;
    const { adapter, controller, session } = await controllerFixture();
    expect(controller.view().customizations.some(value => value.id === "vanilla-transcript")).toBe(true);

    const rollback = controller.applyCustomization({
      id: "custom-transcript",
      slot: "transcript-block",
      version: 1,
      precedence: 100,
      label: "Custom transcript",
      payload: {},
    }, {
      payload: {},
      render: (input, width) => [`CUSTOM: ${String((input as { text?: unknown }).text ?? "").slice(0, Math.max(0, width - 8))}`],
    });
    session.emit({
      type: "message_start",
      message: { role: "assistant", content: [{ type: "text", text: "hello" }], timestamp: 10 },
    });
    await adapter.flushEvents();
    expect(controller.root.render({ columns: 40, rows: 10 }).join("\n")).toContain("CUSTOM: hello");

    rollback();
    expect(controller.root.render({ columns: 40, rows: 10 }).join("\n")).not.toContain("CUSTOM:");
    expect(UserMessageComponent.prototype.render).toBe(originalRender);
  });

  it("exposes manual base controls through owned slash commands", async () => {
    const { controller, runtime, session } = await controllerFixture();
    await controller.submit("/abort");
    await controller.submit("/retry");
    await controller.submit("/compact");
    await controller.submit("/think high");
    await controller.submit("/model openai/gpt-5.1");
    await controller.submit("/resume C:/sessions/one.jsonl");
    await controller.submit("/set tui.tight true");
    const rejected = await controller.submit("/unknown");

    expect(session.calls).toEqual(expect.arrayContaining(["abort", "compact", "thinking:high", "setModel"]));
    expect(runtime.calls).toContain("switch:C:/sessions/one.jsonl");
    expect(controller.settings().get("tui.tight")).toBe("true");
    expect(rejected.outcome).toBe("rejected");
    expect(controller.diagnostics().entries().some(entry => entry.code === "unknown-command")).toBe(true);
  });

  it("records failed engine commands in bounded owned diagnostics", async () => {
    const { controller } = await controllerFixture();
    const result = await controller.setModel({ providerId: "openai", modelId: "missing", displayName: "Missing" });
    expect(result.outcome).toBe("failed");
    expect(controller.diagnostics().entries().some(entry => entry.code === "engine-command")).toBe(true);
    expect(controller.view().diagnostics.some(entry => entry.code === "engine-command")).toBe(true);
  });
});
