import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BranchSummaryStatusIndicator,
  CompactionStatusIndicator,
  IdleStatus,
  RetryStatusIndicator,
  WorkingStatusIndicator,
  applyPiTheme,
} from "../../../src/foundation/pi-component-adapter/index.js";

function tuiFacade(): never {
  return { requestRender() {}, invalidate() {}, terminal: { kittyProtocolActive: false } } as never;
}

afterEach(() => vi.useRealTimers());

describe("pinned status indicator parity", () => {
  it("matches independent pinned working, retry, compaction, branch, idle, countdown, and fixed-width rows", async () => {
    vi.useFakeTimers();
    applyPiTheme("dark");
    const path = resolve("node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/components/status-indicator.js");
    const pinned = await import(pathToFileURL(path).href) as typeof import("../../../src/foundation/pi-component-adapter/upstream/components/status-indicator.js");
    const leftUi = tuiFacade();
    const rightUi = tuiFacade();
    const actual = {
      working: new WorkingStatusIndicator(leftUi, "Working…", { frames: ["*"], intervalMs: 10_000 }),
      retry: new RetryStatusIndicator(leftUi, 2, 5, 2_500),
      compaction: new CompactionStatusIndicator(leftUi, "overflow"),
      branch: new BranchSummaryStatusIndicator(leftUi),
      idle: new IdleStatus(),
    };
    const upstream = {
      working: new pinned.WorkingStatusIndicator(rightUi, "Working…", { frames: ["*"], intervalMs: 10_000 }),
      retry: new pinned.RetryStatusIndicator(rightUi, 2, 5, 2_500),
      compaction: new pinned.CompactionStatusIndicator(rightUi, "overflow"),
      branch: new pinned.BranchSummaryStatusIndicator(rightUi),
      idle: new pinned.IdleStatus(),
    };
    try {
      for (const width of [24, 40, 72]) {
        for (const key of Object.keys(actual) as Array<keyof typeof actual>) {
          expect(actual[key].render(width), `${key} at ${width}`).toEqual(upstream[key].render(width));
        }
      }
      await vi.advanceTimersByTimeAsync(1_000);
      expect(actual.retry.render(40)).toEqual(upstream.retry.render(40));
      await vi.advanceTimersByTimeAsync(2_000);
      expect(actual.retry.render(40)).toEqual(upstream.retry.render(40));
    } finally {
      for (const value of Object.values(actual)) if ("dispose" in value) value.dispose();
      for (const value of Object.values(upstream)) if ("dispose" in value) value.dispose();
    }
  });
});
