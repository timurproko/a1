import { describe, expect, it } from "vitest";
import { evaluateStartupTrend, isStartupEvidence, renderStartupTrend, TREND_WINDOW, type StartupTrendRun } from "../../scripts/release/startup-budget-trend.mjs";

type Profile = "a1" | "pi";
type Kind = "post-update" | "no-live-supervisor" | "warm";
const shell: Profile = "a1";
const pi: Profile = "pi";
const budgets: Record<Kind, number> = { "post-update": 2000, "no-live-supervisor": 2500, warm: 2000 };

function evidence(...samples: Array<[Profile, Kind, number]>) {
  return {
    schema: "a1-startup-performance-evidence-v1",
    enforcement: "record",
    budgetViolations: [],
    measurements: samples.map(([profileId, launchKind, elapsedMs]) => ({ profileId, launchKind, elapsedMs, budgetMs: budgets[launchKind] })),
  };
}

function run(runId: number, lanes: Record<string, unknown>): StartupTrendRun {
  return { runId, number: runId, headSha: `sha-${runId}`, url: `https://runs/${runId}`, lanes: Object.entries(lanes).map(([lane, value]) => ({ lane, evidence: value })) };
}

describe("persistent startup overrun verdict", () => {
  it("recognises the startup evidence schema only", () => {
    expect(isStartupEvidence(evidence([shell, "post-update", 1500]))).toBe(true);
    expect(isStartupEvidence({ schema: "a1-validation-outcomes-v1", outcomes: [] })).toBe(false);
    expect(isStartupEvidence(null)).toBe(false);
  });

  it("judges a key regressed only when the three most recent runs all overran", () => {
    const trend = evaluateStartupTrend([
      run(3, { "windows-2025-node22": evidence([shell, "no-live-supervisor", 2715], [shell, "post-update", 1700]) }),
      run(2, { "windows-2025-node22": evidence([shell, "no-live-supervisor", 2532], [shell, "post-update", 1650]) }),
      run(1, { "windows-2025-node22": evidence([shell, "no-live-supervisor", 2601], [shell, "post-update", 2012]) }),
    ]);
    expect(TREND_WINDOW).toBe(3);
    expect(trend.persistent.map(entry => entry.key)).toEqual(["windows-2025-node22/a1/no-live-supervisor"]);
    expect(trend.persistent[0]!.samples.map(sample => sample.elapsedMs)).toEqual([2715, 2532, 2601]);
    expect(trend.entries.find(entry => entry.key === "windows-2025-node22/a1/post-update")).toMatchObject({ verdict: "single", overruns: 1, persistent: false });
    expect(trend.summary).toBe("startup: persistent overrun on windows-2025-node22/a1/no-live-supervisor");
  });

  it("reports two of three, a single overrun on this run, and within budget without a regression", () => {
    const trend = evaluateStartupTrend([
      run(3, { "windows-2025-node24": evidence([pi, "warm", 2100], [shell, "post-update", 1400]) }),
      run(2, { "windows-2025-node24": evidence([pi, "warm", 1900], [shell, "post-update", 1300]) }),
      run(1, { "windows-2025-node24": evidence([pi, "warm", 2050], [shell, "post-update", 1200]) }),
    ]);
    expect(trend.persistent).toEqual([]);
    expect(trend.entries.find(entry => entry.key === "windows-2025-node24/pi/warm")).toMatchObject({ verdict: "single", overruns: 2 });
    expect(trend.currentOverruns.map(entry => entry.key)).toEqual(["windows-2025-node24/pi/warm"]);
    expect(trend.summary).toBe("startup: single overrun on windows-2025-node24/pi/warm, not persistent");
    expect(evaluateStartupTrend([run(1, { lane: evidence([shell, "post-update", 1000]) }), run(0, { lane: evidence([shell, "post-update", 900]) }), run(-1, { lane: evidence([shell, "post-update", 950]) })]).summary).toBe("startup: within budget");
  });

  it("treats a missing run, a lane without evidence, or fewer than three samples as insufficient, never persistent", () => {
    const trend = evaluateStartupTrend([
      run(3, { "windows-2025-node22": evidence([shell, "no-live-supervisor", 2715]), "windows-2025-node24": null }),
      run(2, { "windows-2025-node22": { schema: "a1-validation-outcomes-v1" } }),
      run(1, { "windows-2025-node22": evidence([shell, "no-live-supervisor", 2601]), "windows-2025-node24": evidence([shell, "no-live-supervisor", 2600]) }),
    ]);
    expect(trend.persistent).toEqual([]);
    expect(trend.entries.map(entry => [entry.key, entry.verdict])).toEqual([
      ["windows-2025-node22/a1/no-live-supervisor", "insufficient-overrun"],
      ["windows-2025-node24/a1/no-live-supervisor", "insufficient-overrun"],
    ]);
    expect(trend.summary).toBe("startup: single overrun on windows-2025-node22/a1/no-live-supervisor, not persistent");
    expect(evaluateStartupTrend([]).summary).toBe("startup: no measurements");
    expect(evaluateStartupTrend([run(9, { lane: evidence([shell, "post-update", 2500]) }), run(8, { lane: evidence([shell, "post-update", 2500]) }), run(7, { lane: evidence([shell, "post-update", 2500]) }), run(6, { lane: evidence([shell, "post-update", 100]) })]).persistent).toHaveLength(1);
  });

  it("renders the trend table newest first with the run numbers", () => {
    const trend = evaluateStartupTrend([
      run(3, { "windows-2025-node22": evidence([shell, "no-live-supervisor", 2715]) }),
      run(2, { "windows-2025-node22": evidence([shell, "no-live-supervisor", 2532]) }),
      run(1, { "windows-2025-node22": evidence([shell, "no-live-supervisor", 2601]) }),
    ]);
    expect(renderStartupTrend(trend)).toEqual([
      "| Lane | Profile | Launch kind | Budget | This run | Run -1 | Run -2 |",
      "| --- | --- | --- | ---: | ---: | ---: | ---: |",
      "| windows-2025-node22 | a1 | no-live-supervisor | 2500ms | 2715ms (over) #3 | 2532ms (over) #2 | 2601ms (over) #1 |",
    ]);
    expect(renderStartupTrend(evaluateStartupTrend([run(1, { lane: evidence([pi, "warm", 1000]) })]))).toEqual([]);
    expect(renderStartupTrend(evaluateStartupTrend([run(1, { lane: evidence([pi, "warm", 1000]) })]), { onlyPersistent: false })[2]).toBe("| lane | pi | warm | 2000ms | 1000ms #1 | n/a | n/a |");
  });
});
