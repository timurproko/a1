/**
 * The persistent-overrun verdict for first-attempt startup measurements. One hosted Windows
 * sample says little: the same bytes measure 1.2 to 2.7 seconds against 2.0 and 2.5 second
 * budgets, so a scheduled channel records every measurement and judges a lane, profile, and
 * launch kind regressed only when its three most recent consecutive `develop` runs of the same
 * workflow all overran. The inputs are the uploaded `a1-startup-performance-evidence-v1` files
 * of those runs, newest first; nothing here measures, retries, or reads the network.
 */

export const STARTUP_EVIDENCE_SCHEMA = "a1-startup-performance-evidence-v1";
/** Consecutive runs that must all overrun before a key is judged regressed. */
export const TREND_WINDOW = 3;

/** True when the JSON is a startup evidence file written by the exact-package startup gate. */
export function isStartupEvidence(value) {
  return value !== null && typeof value === "object" && value.schema === STARTUP_EVIDENCE_SCHEMA && Array.isArray(value.measurements);
}

function keyOf(lane, measurement) {
  return `${lane}/${measurement.profileId}/${measurement.launchKind}`;
}

/**
 * Judge every lane, profile, and launch kind across the newest-first runs. Each run is
 * `{ runId, number?, headSha?, url?, lanes: [{ lane, evidence }] }` where `evidence` is the parsed
 * startup file or null when the lane produced none. A key with fewer than `window` measurements is
 * `insufficient`, never `persistent`; a run whose lane lacks the key simply contributes nothing.
 */
export function evaluateStartupTrend(runs, { window = TREND_WINDOW } = {}) {
  const keys = new Map();
  for (const run of runs.slice(0, window)) {
    for (const lane of run.lanes ?? []) {
      if (!isStartupEvidence(lane.evidence)) continue;
      for (const measurement of lane.evidence.measurements) {
        const key = keyOf(lane.lane, measurement);
        const entry = keys.get(key) ?? { key, lane: lane.lane, profileId: measurement.profileId, launchKind: measurement.launchKind, budgetMs: measurement.budgetMs, samples: [] };
        entry.samples.push({ runId: run.runId, number: run.number ?? null, headSha: run.headSha ?? null, url: run.url ?? null, elapsedMs: measurement.elapsedMs, budgetMs: measurement.budgetMs, overrun: measurement.elapsedMs > measurement.budgetMs });
        keys.set(key, entry);
      }
    }
  }
  const entries = [...keys.values()].sort((a, b) => a.key.localeCompare(b.key)).map(entry => {
    const insufficient = entry.samples.length < window;
    const persistent = !insufficient && entry.samples.every(sample => sample.overrun);
    const overruns = entry.samples.filter(sample => sample.overrun).length;
    return { ...entry, insufficient, persistent, overruns, verdict: persistent ? "persistent" : insufficient ? (overruns ? "insufficient-overrun" : "insufficient") : overruns ? "single" : "within-budget" };
  });
  const current = runs[0];
  const currentOverruns = entries.filter(entry => entry.samples[0]?.runId === current?.runId && entry.samples[0].overrun);
  return {
    window,
    persistent: entries.filter(entry => entry.persistent),
    currentOverruns,
    entries,
    summary: entries.length === 0 ? "startup: no measurements"
      : entries.some(entry => entry.persistent) ? `startup: persistent overrun on ${entries.filter(entry => entry.persistent).map(entry => entry.key).join(", ")}`
      : currentOverruns.length ? `startup: single overrun on ${currentOverruns.map(entry => entry.key).join(", ")}, not persistent`
      : "startup: within budget",
  };
}

/** The trend table for a candidate's evidence: one row per key, newest run first. */
export function renderStartupTrend(trend, { onlyPersistent = true } = {}) {
  const rows = onlyPersistent ? trend.persistent : trend.entries;
  if (rows.length === 0) return [];
  const lines = ["| Lane | Profile | Launch kind | Budget | " + Array.from({ length: trend.window }, (_, index) => index === 0 ? "This run" : `Run -${index}`).join(" | ") + " |",
    "| --- | --- | --- | ---: | " + Array.from({ length: trend.window }, () => "---:").join(" | ") + " |"];
  for (const entry of rows) {
    const cells = Array.from({ length: trend.window }, (_, index) => {
      const sample = entry.samples[index];
      if (!sample) return "n/a";
      const label = `${Math.round(sample.elapsedMs)}ms${sample.overrun ? " (over)" : ""}`;
      return sample.number ? `${label} #${sample.number}` : label;
    });
    lines.push(`| ${entry.lane} | ${entry.profileId} | ${entry.launchKind} | ${entry.budgetMs}ms | ${cells.join(" | ")} |`);
  }
  return lines;
}
