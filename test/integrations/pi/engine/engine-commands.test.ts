import { describe, expect, it, vi } from "vitest";
import type { OwnedUiCommand } from "../../../../src/contracts/owned-ui/index.js";
import { performEngineCommand, type EngineCommandContext } from "../../../../src/integrations/pi/engine/command-dispatch.js";
import { EngineViewState } from "../../../../src/integrations/pi/engine/view-state.js";

function harness(options: { outcome?: "completed" | "rejected"; admissionOpen?: boolean; running?: boolean } = {}) {
  const execute = vi.fn(async (_request: unknown) => ({ outcome: options.outcome ?? "completed" }));
  const session = { setModel: vi.fn(async () => {}), setThinkingLevel: vi.fn() };
  const runtime = {
    services: { modelRuntime: { getModel: vi.fn((provider: string, id: string) => id === "missing" ? undefined : { provider, id }) } },
    newSession: vi.fn(async () => {}),
    switchSession: vi.fn(async () => {}),
  };
  const state = new EngineViewState();
  const emit = vi.fn();
  const dispose = vi.fn(async () => {});
  const context = {
    engine: {
      runtime: options.running === false ? undefined : runtime,
      session: options.running === false ? undefined : session,
      generation: 1,
      sessionCommands: { execute },
    },
    state,
    admissionOpen: () => options.admissionOpen ?? true,
    emit,
    dispose,
  } as unknown as EngineCommandContext;
  return { context, execute, session, runtime, state, emit, dispose };
}

const base = { correlationId: "c", sessionId: "s" } as const;

describe("performEngineCommand", () => {
  it("sends prompt input with its images and session controls by type", async () => {
    const { context, execute } = harness();
    await performEngineCommand({ ...base, type: "steer", text: "go", images: [{ type: "image", data: "x", mimeType: "image/png" }] } as OwnedUiCommand, context);
    await performEngineCommand({ ...base, type: "compact" }, context);
    expect(execute.mock.calls.map(([request]) => request)).toEqual([
      { type: "steer", text: "go", images: [{ type: "image", data: "x", mimeType: "image/png" }] },
      { type: "compact" },
    ]);
  });

  it("names a failed retry and any other rejected command", async () => {
    const { context } = harness({ outcome: "rejected" });
    await expect(performEngineCommand({ ...base, type: "retry" }, context)).rejects.toThrow("no previous prompt is available to retry");
    await expect(performEngineCommand({ ...base, type: "prompt", text: "x" }, context)).rejects.toThrow("Pi session command failed: prompt");
  });

  it("publishes a model change only while admission is open", async () => {
    const model = { providerId: "p", modelId: "m", displayName: "M" };
    const open = harness();
    await performEngineCommand({ ...base, type: "set-model", model }, open.context);
    expect(open.session.setModel).toHaveBeenCalledWith({ provider: "p", id: "m" });
    expect(open.state.activeModel).toEqual(model);
    const closed = harness({ admissionOpen: false });
    await performEngineCommand({ ...base, type: "set-model", model }, closed.context);
    expect(closed.state.activeModel).toBeNull();
    await expect(performEngineCommand({ ...base, type: "set-model", model: { ...model, modelId: "missing" } }, open.context))
      .rejects.toThrow("model is unavailable: p/missing");
  });

  it("updates thinking, the terminal surface, sessions, and disposal", async () => {
    const { context, session, runtime, state, emit, dispose } = harness();
    await performEngineCommand({ ...base, type: "set-thinking-level", thinkingLevel: "high" }, context);
    expect(session.setThinkingLevel).toHaveBeenCalledWith("high");
    expect(state.thinkingLevel).toBe("high");
    const surface = { columns: 80, rows: 24, focusedRegion: "editor", hardwareCursor: true } as const;
    await performEngineCommand({ ...base, type: "resize-surface", surface } as OwnedUiCommand, context);
    expect(emit).toHaveBeenCalledWith({ type: "terminal-surface", surface });
    await performEngineCommand({ ...base, type: "new-session" } as OwnedUiCommand, context);
    await performEngineCommand({ ...base, type: "resume-session", sessionPath: "/s.jsonl" } as OwnedUiCommand, context);
    await performEngineCommand({ ...base, type: "shutdown" }, context);
    expect(runtime.newSession).toHaveBeenCalledOnce();
    expect(runtime.switchSession).toHaveBeenCalledWith("/s.jsonl");
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("refuses owned UI state commands and commands without a running session", async () => {
    const { context } = harness();
    await expect(performEngineCommand({ ...base, type: "set-setting" } as unknown as OwnedUiCommand, context))
      .rejects.toThrow("owned UI state commands belong to the owned UI layer");
    await expect(performEngineCommand({ ...base, type: "abort" }, harness({ running: false }).context))
      .rejects.toThrow("engine session is unavailable");
  });
});
