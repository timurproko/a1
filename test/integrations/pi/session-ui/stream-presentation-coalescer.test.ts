import { describe, expect, it } from "vitest";
import {
  STREAM_PRESENTATION_INTERVAL_MS,
  StreamPresentationCoalescer,
  type StreamPresentationScheduler,
} from "../../../../src/integrations/pi/session-ui/index.js";

class FakeScheduler implements StreamPresentationScheduler {
  #now = 0;
  #nextId = 1;
  readonly #tasks = new Map<number, { readonly at: number; readonly callback: () => void }>();
  now(): number { return this.#now; }
  setTimeout(callback: () => void, delayMs: number): ReturnType<typeof setTimeout> {
    const id = this.#nextId++;
    this.#tasks.set(id, { at: this.#now + delayMs, callback });
    return id as unknown as ReturnType<typeof setTimeout>;
  }
  clearTimeout(timer: ReturnType<typeof setTimeout>): void {
    this.#tasks.delete(timer as unknown as number);
  }
  advance(delayMs: number): void {
    this.#now += delayMs;
    while (true) {
      const ready = [...this.#tasks.entries()]
        .filter(([, task]) => task.at <= this.#now)
        .sort((left, right) => left[1].at - right[1].at || left[0] - right[0])[0];
      if (ready === undefined) return;
      this.#tasks.delete(ready[0]);
      ready[1].callback();
    }
  }
}

describe("stream presentation coalescer", () => {
  it("uses a measured 30 fps interval and presents only the newest burst state", () => {
    expect(STREAM_PRESENTATION_INTERVAL_MS).toBe(33);
    const scheduler = new FakeScheduler();
    let semanticRevision = 1;
    const presented: number[] = [];
    const coalescer = new StreamPresentationCoalescer(() => presented.push(semanticRevision), 33, scheduler);

    coalescer.request();
    semanticRevision = 2;
    coalescer.request();
    semanticRevision = 3;
    coalescer.request();
    expect(presented).toEqual([1]);
    expect(coalescer.pending).toBe(true);

    scheduler.advance(32);
    expect(presented).toEqual([1]);
    scheduler.advance(1);
    expect(presented).toEqual([1, 3]);
  });

  it("lets immediate input feedback preempt an obsolete pending stream frame", () => {
    const scheduler = new FakeScheduler();
    let presentations = 0;
    const coalescer = new StreamPresentationCoalescer(() => { presentations += 1; }, 33, scheduler);
    coalescer.request();
    coalescer.request();
    expect(coalescer.pending).toBe(true);

    coalescer.noteImmediatePresentation();
    presentations += 1; // Invariant: the immediate editor/overlay/resize path renders current state itself.
    scheduler.advance(100);
    expect(presentations).toBe(2);
    expect(coalescer.pending).toBe(false);
  });

  it("keeps a stream frame behind a just-presented independent status frame", () => {
    const scheduler = new FakeScheduler();
    let streamFrames = 0;
    let statusFrames = 0;
    const coalescer = new StreamPresentationCoalescer(() => { streamFrames += 1; }, 33, scheduler);
    coalescer.request();
    scheduler.advance(10);
    coalescer.noteImmediatePresentation();
    statusFrames += 1;
    coalescer.request();
    scheduler.advance(32);
    expect({ streamFrames, statusFrames }).toEqual({ streamFrames: 1, statusFrames: 1 });
    scheduler.advance(1);
    expect({ streamFrames, statusFrames }).toEqual({ streamFrames: 2, statusFrames: 1 });
  });

  it("flushes final state immediately without a duplicate scheduled frame", () => {
    const scheduler = new FakeScheduler();
    let semanticRevision = 1;
    const presented: number[] = [];
    const coalescer = new StreamPresentationCoalescer(() => presented.push(semanticRevision), 33, scheduler);
    coalescer.request();
    semanticRevision = 2;
    coalescer.request();
    semanticRevision = 3;
    coalescer.flush();
    scheduler.advance(100);
    expect(presented).toEqual([1, 3]);
  });

  it("disposes timers and ignores later stream requests", () => {
    const scheduler = new FakeScheduler();
    let presentations = 0;
    const coalescer = new StreamPresentationCoalescer(() => { presentations += 1; }, 33, scheduler);
    coalescer.request();
    coalescer.request();
    coalescer.dispose();
    coalescer.request();
    scheduler.advance(100);
    expect(presentations).toBe(1);
  });
});
