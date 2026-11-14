import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createOwnedRuntimeContext, ReadySessionBinding, RuntimeApiLifecycle } from "../../../src/features/owned-ui/index.js";
import type { OwnedUiSessionBackend } from "../../../src/contracts/owned-ui/index.js";
import type { OwnedSettingsManager } from "../../../src/ui/settings/index.js";

const reporter = vi.hoisted(() => ({ create: vi.fn(), request: vi.fn(), dispose: vi.fn(async () => {}) }));
vi.mock("../../../src/features/owned-ui/herdr-reporter.js", () => ({ createHerdrReporter: (options: unknown) => { reporter.create(options); return reporter; } }));

function fixture() {
  vi.clearAllMocks();
  const listeners = new Set<() => void>();
  const identity = { sessionId: randomUUID(), sessionBindingGeneration: 1, disposed: false, currentHistorySessionId: () => identity.sessionId };
  const backend = { identity, session: { onEvent(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; } } } as unknown as OwnedUiSessionBackend;
  const runtimeId = randomUUID();
  const context = createOwnedRuntimeContext(runtimeId, { terminalId: "t5z", runtimeId, generation: 1, file: "unused-fixture" });
  return { backend, identity, listeners, context, emit() { for (const listener of listeners) listener(); } };
}

describe("shared product API lifecycle", () => {
  it("captures one immutable identity without inventing a second reporter binding", () => {
    const f = fixture();
    expect(Object.isFrozen(f.context)).toBe(true);
    expect(f.context.runtimeId).toBe(f.context.herdrBinding!.runtimeId);
  });

  it("starts once, resets settings only on committed replacement, and drains a late start once", async () => {
    const f = fixture(), changed = new Set<(settings: OwnedSettingsManager) => void>();
    const settings = { onChange(listener: (settings: OwnedSettingsManager) => void) { changed.add(listener); return () => { changed.delete(listener); }; }, startSession: vi.fn(), value: () => "green" } as unknown as OwnedSettingsManager;
    const gate = Promise.withResolvers<{ dispose(): Promise<void> }>();
    const start = vi.fn(() => gate.promise), apply = vi.fn(), dispose = vi.fn(async () => {});
    const lifecycle = new RuntimeApiLifecycle(f.backend, settings, apply, start);
    lifecycle.start(); lifecycle.start();
    await Promise.resolve();
    expect(start).toHaveBeenCalledOnce();
    for (const listener of changed) listener(settings);
    expect(apply).toHaveBeenCalledWith("green");
    f.emit(); expect(settings.startSession).not.toHaveBeenCalled();
    f.identity.sessionBindingGeneration++; f.emit(); f.emit();
    expect(settings.startSession).toHaveBeenCalledOnce();
    const stopped = lifecycle.dispose();
    lifecycle.start(); gate.resolve({ dispose });
    await stopped; await lifecycle.dispose();
    expect(dispose).toHaveBeenCalledOnce();
    expect(changed.size).toBe(0); expect(f.listeners.size).toBe(0);
  });

  it("cancels before asynchronous control startup without creating an endpoint", async () => {
    const f = fixture();
    const settings = { onChange: () => () => {}, startSession() {} } as unknown as OwnedSettingsManager;
    const start = vi.fn();
    const lifecycle = new RuntimeApiLifecycle(f.backend, settings, () => {}, start);
    lifecycle.start(); await lifecycle.dispose();
    expect(start).not.toHaveBeenCalled();
  });

  it("withholds identity that changed while the endpoint was opening", async () => {
    const f = fixture(), gate = Promise.withResolvers<void>();
    f.identity.sessionBindingGeneration++;
    const control = { publish: vi.fn(() => gate.promise), dispose: vi.fn(async () => {}) };
    const binding = new ReadySessionBinding(f.backend, control, f.context, 1);
    const options = reporter.create.mock.calls[0]![0] as { identity(): unknown };
    expect(options.identity()).toBeUndefined();
    await Promise.resolve(); gate.resolve();
    await vi.waitFor(() => expect(options.identity()).toMatchObject({ binding: 2 }));
    await binding.dispose(); await binding.dispose();
    expect(control.dispose).toHaveBeenCalledOnce();
    expect(options.identity()).toBeUndefined();
  });

  it("never creates a reporter for a mismatched reservation", async () => {
    const f = fixture();
    const binding = new ReadySessionBinding(f.backend, { publish: async () => {}, dispose: async () => {} }, createOwnedRuntimeContext(randomUUID(), f.context.herdrBinding), 1);
    expect(reporter.create).not.toHaveBeenCalled();
    await binding.dispose();
  });
});
