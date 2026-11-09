import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionNameReveal } from "../../../src/app/session-shell/session-name-reveal.js";
import type { OwnedUiSessionViewModel } from "../../../src/contracts/owned-ui/index.js";

const view = (id?: string, from = "old") => ({ status: { footer: { sessionName: "new", ...(id ? { sessionNameReveal: { id, from } } : {}) } } }) as OwnedUiSessionViewModel;
afterEach(() => vi.useRealTimers());

describe("presenter-owned name reveal clock", () => {
  it("does not replay loaded names and keeps one clock across duplicate views", async () => {
    vi.useFakeTimers();
    const frame = vi.fn((value: { elapsed: number } | null) => value !== null && value.elapsed < 100);
    const requestRender = vi.fn();
    const clock = new SessionNameReveal({ active: () => true, frame, requestRender });
    clock.update(view("saved"), 1); expect(vi.getTimerCount()).toBe(0);
    clock.update(view("generated"), 1); expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(45);
    clock.update(view("generated"), 1); expect(vi.getTimerCount()).toBe(1);
    expect(frame.mock.calls.at(-1)?.[0]).toMatchObject({ elapsed: 45 });
    await vi.advanceTimersByTimeAsync(90); expect(vi.getTimerCount()).toBe(0);
    const count = requestRender.mock.calls.length;
    clock.update(view("generated"), 1); await vi.advanceTimersByTimeAsync(100);
    expect(requestRender).toHaveBeenCalledTimes(count);
    clock.stop();
  });

  it("supersedes automatic changes and cancels manual, binding, and deactivation transitions", async () => {
    vi.useFakeTimers(); let active = true;
    const frame = vi.fn((value: { from: string; elapsed: number } | null) => value !== null);
    const clock = new SessionNameReveal({ active: () => active, frame, requestRender: () => {} });
    clock.update(view(), 1); clock.update(view("first"), 1);
    await vi.advanceTimersByTimeAsync(30);
    clock.update(view("second", "previous-name"), 1);
    expect(frame.mock.calls.at(-1)?.[0]).toEqual({ from: "previous-name", elapsed: 0 });
    clock.update(view(), 1); expect(vi.getTimerCount()).toBe(0);
    clock.update(view("third"), 1); clock.update(view("other-binding"), 2);
    expect(vi.getTimerCount()).toBe(0);
    clock.update(view("fourth"), 2); active = false; clock.stop();
    expect(vi.getTimerCount()).toBe(0);
    active = true; clock.update(view("fourth"), 2); expect(vi.getTimerCount()).toBe(0);
  });

  it("does not schedule when the footer has no visible name budget or presenter is inactive", () => {
    vi.useFakeTimers();
    const clock = new SessionNameReveal({ active: () => false, frame: () => true, requestRender: () => {} });
    clock.update(view(), 1); clock.update(view("name"), 1); expect(vi.getTimerCount()).toBe(0);
    const hidden = new SessionNameReveal({ active: () => true, frame: () => false, requestRender: () => {} });
    hidden.update(view(), 1); hidden.update(view("name"), 1); expect(vi.getTimerCount()).toBe(0);
  });
});
