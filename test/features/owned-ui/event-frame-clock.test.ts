import { promisify } from "node:util";
import { describe, expect, it, vi } from "vitest";
import { EventFrameClock } from "./event-frame-clock.js";

describe("event-frame clock ownership", () => {
  it("holds due paints until the declared boundary without advancing animation time", async () => {
    const clock = new EventFrameClock();
    const timeout = vi.fn();
    const interval = vi.fn();
    await clock.run(async () => {
      expect(Date.now()).toBe(clock.now);
      expect(new Date().getTime()).toBe(clock.now);
      expect(new Date(42).getTime()).toBe(42);
      expect(Date()).toBe(new Date(clock.now).toString());
      const timer = setTimeout(timeout, 16) as unknown as NodeJS.Timeout;
      expect(timer.unref().hasRef()).toBe(false);
      expect(timer.ref().hasRef()).toBe(true);
      setInterval(interval, 10);
      clock.hold(true);
      expect(clock.advance(100)).toBe(0);
      expect(timeout).not.toHaveBeenCalled();
      clock.hold(false);
      expect(clock.advance(0)).toBe(1);
      expect(timeout).toHaveBeenCalledOnce();
      expect(interval).not.toHaveBeenCalled();
      expect(Date.now()).toBe(clock.now);
    });
    expect(clock.pending).toBe(0);
  });

  it("preserves native promisified timers for unrelated callers during ownership", async () => {
    const nativeDate = Date;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const clock = new EventFrameClock();
    const capture = clock.run(async () => { await gate; });
    try {
      expect(await promisify(setTimeout)(1, "native timer")).toBe("native timer");
      expect(Date.now()).toBeGreaterThanOrEqual(nativeDate.now() - 1000);
      expect(clock.pending).toBe(0);
    } finally {
      release();
      await capture;
    }
  });

  it("cancels only owned handles, including numeric cancellation and disposal", async () => {
    const clock = new EventFrameClock();
    const callback = vi.fn();
    await clock.run(async () => {
      clearTimeout(+setTimeout(callback, 0));
      (setTimeout(callback, 0) as unknown as NodeJS.Timeout)[Symbol.dispose]();
      clearInterval(setInterval(callback, 0));
      expect(clock.advance(1)).toBe(0);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  it("bounds callback batches and always restores globals", async () => {
    const previous = { Date, setTimeout, clearTimeout, setInterval, clearInterval };
    const clock = new EventFrameClock();
    await expect(clock.run(async () => {
      for (let index = 0; index < 65; index += 1) setTimeout(() => {}, 0);
      clock.advance(1);
    })).rejects.toThrow("callback bound exhausted");
    expect(clock.pending).toBe(0);
    expect({ Date, setTimeout, clearTimeout, setInterval, clearInterval }).toEqual(previous);
  });

  it("rejects overlapping ownership before touching the active scope", async () => {
    const clock = new EventFrameClock();
    await clock.run(async () => {
      const activeDate = Date;
      await expect(new EventFrameClock().run(async () => {})).rejects.toThrow("must not overlap");
      expect(Date).toBe(activeDate);
      expect(Date.now()).toBe(clock.now);
    });
  });

  it("reports stage and pending work on finite settlement exhaustion", async () => {
    const clock = new EventFrameClock();
    await expect(clock.run(async () => {
      setTimeout(() => {}, 10);
      await clock.settle("completed/flush", () => new Promise<void>(() => {}), () => ({ queued: 7 }));
    })).rejects.toThrow('stage=completed/flush turns=64 pendingTimers=1 work={"queued":7}');
    expect(clock.pending).toBe(0);
    await expect(clock.run(async () => {})).rejects.toThrow("cannot be reused");
    const next = new EventFrameClock();
    await next.run(async () => {
      expect(await next.settle("next", async () => 42)).toBe(42);
    });
  });
});
