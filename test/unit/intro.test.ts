import { describe, expect, it } from "vitest";
import { initialStartupState, renderIntro, updateStartupState, type MonotonicClock } from "../../src/presentation/intro.js";

class ManualClock implements MonotonicClock {
  value = 100;
  now(): number { return this.value; }
  advance(milliseconds: number): void { this.value += milliseconds; }
}

describe("deterministic startup intro", () => {
  it("does not reveal the shell before the monotonic duration completes", () => {
    const clock = new ManualClock();
    let state = initialStartupState(clock);
    clock.advance(2_999);
    state = updateStartupState(state, clock);
    expect(state.phase).toBe("intro");
    expect(renderIntro(state, 80, 24).join("\n")).toContain("ADDONE");
    clock.advance(1);
    expect(updateStartupState(state, clock).phase).toBe("shell");
  });

  it("produces stable frames for the same injected time", () => {
    const clock = new ManualClock();
    const initial = initialStartupState(clock);
    clock.advance(750);
    const state = updateStartupState(initial, clock);
    expect(renderIntro(state, 80, 24)).toEqual(renderIntro(state, 80, 24));
  });
});
