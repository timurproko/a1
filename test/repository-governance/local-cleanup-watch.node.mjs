import { test } from "node:test";
import assert from "node:assert/strict";
import { watchLocalCleanup } from "../../scripts/governance/local-cleanup-watch.mjs";

test("watch retries a later archive merge without another deletion prompt", async () => {
  const abort = new AbortController(), reports = []; let clock = 0, passes = 0;
  await watchLocalCleanup({ signal: abort.signal, now: () => clock,
    run: async () => ({ results: [{ disposition: ++passes === 1 ? "pending" : "removed" }] }),
    emit: report => { reports.push(report); if (passes === 2) abort.abort(); },
    wait: async milliseconds => { clock += milliseconds; } });
  assert.equal(clock, 300000); assert.deepEqual(reports.map(report => report.results[0].disposition), ["pending", "removed"]);
});

test("watch honors remote backoff and stops on disabled state", async () => {
  const abort = new AbortController(); let clock = 0, passes = 0;
  await watchLocalCleanup({ signal: abort.signal, now: () => clock, retryAt: () => 900000,
    run: async () => ++passes === 1 ? { results: [], error: "remote-unavailable" } : { error: "cleanup-disabled" },
    emit: () => {}, wait: async milliseconds => { clock += milliseconds; } });
  assert.equal(clock, 900000); assert.equal(passes, 2);
});

test("aborted worker performs no additional pass or waiting", async () => {
  const abort = new AbortController(); abort.abort(); let calls = 0;
  await watchLocalCleanup({ signal: abort.signal, run: async () => { calls++; }, emit: () => {}, wait: async () => { calls++; } });
  assert.equal(calls, 0);
});

test("long passes do not trigger overlapping catch-up bursts", async () => {
  const abort = new AbortController(); let clock = 0, passes = 0, waiting = -1;
  await watchLocalCleanup({ signal: abort.signal, now: () => clock,
    run: async () => { passes++; clock += 400000; return {}; }, emit: () => {},
    wait: async milliseconds => { waiting = milliseconds; abort.abort(); } });
  assert.equal(passes, 1); assert.equal(waiting, 0);
});
