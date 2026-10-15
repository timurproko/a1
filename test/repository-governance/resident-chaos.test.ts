import { describe, expect, it } from "vitest";
import { CHAOS_SCHEMA, chooseAction, createGenerator, labelViolations, listingViolations, percentile, readSchedule, recordContext, summarize, type ChaosAction } from "../../scripts/development/run-resident-chaos.mjs";

/** Simulate a run's choices against a tab set that loses every third targeted tab, as kills and stops do. */
function simulate(seed: number, steps: number): ChaosAction[] {
  const random = createGenerator(seed);
  const open: number[] = [];
  let created = 0;
  const actions: ChaosAction[] = [];
  for (let step = 0; step < steps; step++) {
    const action = chooseAction(random, open);
    actions.push(action);
    if (action.kind === "create") open.push(created++);
    if ("tab" in action && step % 3 === 0) open.splice(open.indexOf(action.tab), 1);
  }
  return actions;
}

describe("resident chaos harness", () => {
  it("flags duplicate tabs and a holder serving two tabs", () => {
    expect(listingViolations([{ tabId: "a", holderPid: 1 }, { tabId: "b", holderPid: 2 }, { tabId: "c", holderPid: null }])).toEqual([]);
    expect(listingViolations([{ tabId: "a", holderPid: 1 }, { tabId: "a", holderPid: 2 }])).toEqual(["duplicate tab a"]);
    expect(listingViolations([{ tabId: "a", holderPid: 7 }, { tabId: "b", holderPid: 7 }])).toEqual(["holder 7 serves a and b"]);
  });

  it("keeps only the registry fields that explain a missed replacement", () => {
    expect(recordContext(undefined)).toEqual({ present: false });
    expect(recordContext({ tabId: "a", lifecycle: "restarting", desired: "running", incarnation: 3, restarts: 2, holderPid: 9, childPid: null, lastExit: "signal 9", sessionFile: "/secret" }))
      .toEqual({ present: true, tabId: "a", lifecycle: "restarting", desired: "running", incarnation: 3, restarts: 2, holderPid: 9, childPid: null, lastExit: "signal 9" });
  });

  it("draws the same sequence for one seed and a different one for another", () => {
    const draw = (seed: number) => { const random = createGenerator(seed); return Array.from({ length: 64 }, () => random(1_000_000)); };
    expect(draw(42)).toEqual(draw(42));
    expect(draw(42)).not.toEqual(draw(43));
    expect(draw(0xffff_ffff).every(value => Number.isInteger(value) && value >= 0 && value < 1_000_000)).toBe(true);
  });

  it("chooses the same action schedule for one seed, targeting only open tabs", () => {
    const actions = simulate(7, 400);
    expect(simulate(7, 400)).toEqual(actions);
    expect(new Set(actions.map(action => action.kind))).toEqual(new Set(["create", "kill-server", "kill-holder", "kill-child", "stop-tab", "idle"]));
    expect(chooseAction(createGenerator(1), [])).toMatchObject({ kind: "create" });
    for (const action of actions) {
      if (action.kind === "create") expect(action.bytes).toBeGreaterThanOrEqual(1);
      if (action.kind === "idle") expect(action.delayMs).toBeGreaterThanOrEqual(50);
    }
  });

  it("replays exactly the recorded actions from a saved report", () => {
    const actions = simulate(11, 200);
    const schedule = actions.map((action, step) => ({ step, atMs: step * 37, ...action, outcome: action.kind }));
    const saved = JSON.parse(JSON.stringify({ schema: CHAOS_SCHEMA, seed: 11, schedule }));
    expect(readSchedule(saved)).toEqual(actions);
    expect(() => readSchedule({ ...saved, schema: "a1-resident-chaos-v1" })).toThrow(/report with a seed and a schedule/u);
    expect(() => readSchedule({ ...saved, schedule: [{ kind: "kill-holder" }] })).toThrow(/entry 0 is not a recorded action/u);
  });

  it("names the seed and report in every violation", () => {
    expect(labelViolations(["duplicate tab a", { violation: "server was not replaced after it was killed", step: 3 }], 99, "chaos.json")).toEqual([
      { violation: "duplicate tab a", seed: 99, report: "chaos.json" },
      { violation: "server was not replaced after it was killed", step: 3, seed: 99, report: "chaos.json" },
    ]);
  });

  it("summarizes measurements with nearest-rank percentiles", () => {
    expect(percentile([], 0.95)).toBeNull();
    expect(percentile([5, 1, 3, 2, 4], 0.5)).toBe(3);
    expect(percentile(Array.from({ length: 100 }, (_, index) => index + 1), 0.95)).toBe(95);
    expect(summarize({ serverRecoveryMs: [10, 30, 20], tabStopMs: [] })).toEqual({
      serverRecoveryMs: { samples: 3, p50Ms: 20, p95Ms: 30, maxMs: 30 },
      tabStopMs: { samples: 0, p50Ms: null, p95Ms: null, maxMs: null },
    });
  });
});
