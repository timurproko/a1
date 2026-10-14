import { describe, expect, it } from "vitest";
import { listingViolations, percentile, recordContext, summarize } from "../../scripts/development/run-resident-chaos.mjs";

describe("resident chaos harness", () => {
  it("flags duplicate tabs and a holder serving two tabs", () => {
    expect(listingViolations([{ tabId: "a", holderPid: 1 }, { tabId: "b", holderPid: 2 }, { tabId: "c", holderPid: null }])).toEqual([]);
    expect(listingViolations([{ tabId: "a", holderPid: 1 }, { tabId: "a", holderPid: 2 }])).toEqual(["duplicate tab a"]);
    expect(listingViolations([{ tabId: "a", holderPid: 7 }, { tabId: "b", holderPid: 7 }])).toEqual(["holder 7 serves a and b"]);
  });

  it("keeps only the registry fields that explain a missed replacement", () => {
    expect(recordContext(undefined)).toEqual({ present: false });
    expect(recordContext({ tabId: "a", lifecycle: "restarting", desired: "running", incarnation: 3, restarts: 2, holderPid: 9, childPid: null, lastExit: "signal 9", sessionFile: "/secret" }))
      .toEqual({ present: true, lifecycle: "restarting", desired: "running", incarnation: 3, restarts: 2, holderPid: 9, childPid: null, lastExit: "signal 9" });
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
