import { setTimeout as delay } from "node:timers/promises";

/** Cooperative local polling: no hidden daemon, CI wait, or catch-up burst. */
export async function watchLocalCleanup({ run, emit, signal, now = Date.now, retryAt = () => 0,
  wait = (milliseconds, signal) => delay(milliseconds, undefined, { signal }) }) {
  while (!signal.aborted) {
    const started = now();
    const report = await run();
    const nextRetry = Math.max(started + 300000, retryAt(), now());
    await emit({ ...report, nextRetry });
    if (signal.aborted || report.error === "cleanup-disabled") return;
    try { await wait(Math.max(0, nextRetry - now()), signal); }
    catch (error) { if (signal.aborted) return; throw error; }
  }
}
