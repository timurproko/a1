import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export const progressObservationSchema = "a1-resident-progress-observation-v1";
export const progressStages = Object.freeze([
  "engine-delivery", "child-render-write", "pty-ingest", "holder-commit", "attach-receipt", "outer-paint",
]);
const stageSet = new Set(progressStages);
const sensitiveKeys = /content|cells|text|prompt|message|token|credential|header|clipboard|path|session/i;

export async function readProgressObservations(directory, runId) {
  const names = (await readdir(directory)).filter(name => name.endsWith(".jsonl")).sort();
  const records = [];
  const faults = [];
  for (const name of names) {
    const content = await readFile(join(directory, name), "utf8");
    const lines = content.split(/\r?\n/u);
    const completeLines = content.endsWith("\n") ? lines.length : Math.max(0, lines.length - 1);
    for (let index = 0; index < completeLines; index += 1) {
      if (!lines[index]) continue;
      try {
        const record = JSON.parse(lines[index]);
        records.push(record);
      } catch (error) {
        faults.push(`${name}:${index + 1}: invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  faults.push(...validateProgressObservations(records, runId));
  records.sort((left, right) => left.timestampUnixUs - right.timestampUnixUs || left.pid - right.pid || left.sequence - right.sequence);
  return { records, faults, files: names };
}

export function validateProgressObservations(records, runId) {
  const faults = [];
  const priorSequence = new Map();
  const priorTimestamp = new Map();
  const identities = new Set();
  for (const [index, record] of records.entries()) {
    const label = `record ${index + 1}`;
    if (record?.schema !== progressObservationSchema) faults.push(`${label}: invalid schema`);
    if (record?.runId !== runId) faults.push(`${label}: wrong run id`);
    if (!stageSet.has(record?.stage)) faults.push(`${label}: invalid stage`);
    if (!Number.isSafeInteger(record?.pid) || record.pid <= 0) faults.push(`${label}: invalid pid`);
    if (!Number.isSafeInteger(record?.sequence) || record.sequence <= 0) faults.push(`${label}: invalid sequence`);
    if (!Number.isSafeInteger(record?.timestampUnixUs) || record.timestampUnixUs <= 0) faults.push(`${label}: invalid timestamp`);
    if (!Number.isSafeInteger(record?.clockErrorUs) || record.clockErrorUs < 0 || record.clockErrorUs > 5_000) faults.push(`${label}: invalid clock error`);
    if (typeof record?.tabId !== "string" || record.tabId.length === 0 || record.tabId.length > 128) faults.push(`${label}: invalid tab id`);
    if (!Number.isSafeInteger(record?.incarnation) || record.incarnation < 0) faults.push(`${label}: invalid incarnation`);
    if (!Number.isSafeInteger(record?.lostBefore) || record.lostBefore < 0) faults.push(`${label}: invalid loss count`);
    else if (record.lostBefore > 0) faults.push(`${label}: ${record.lostBefore} observations lost before this record`);
    for (const key of Object.keys(record ?? {})) {
      if (sensitiveKeys.test(key) && key !== "eventKind") faults.push(`${label}: payload-bearing field ${key}`);
    }
    const processKey = `${record?.role ?? "unknown"}:${record?.pid ?? "unknown"}`;
    const previousSequence = priorSequence.get(processKey) ?? 0;
    if (record?.sequence <= previousSequence) faults.push(`${label}: duplicate or reordered process sequence`);
    priorSequence.set(processKey, record?.sequence);
    const previousTimestamp = priorTimestamp.get(processKey) ?? 0;
    if (record?.timestampUnixUs + (record?.clockErrorUs ?? 0) < previousTimestamp) faults.push(`${label}: process clock moved backwards`);
    priorTimestamp.set(processKey, record?.timestampUnixUs);
    const identity = `${processKey}:${record?.sequence}`;
    if (identities.has(identity)) faults.push(`${label}: duplicate observation identity`);
    identities.add(identity);
  }
  return faults;
}

export function evaluateProgressScenario(records, scenario) {
  const faults = [];
  const byTab = Object.fromEntries(scenario.tabIds.map(tabId => [tabId, {}]));
  const interval = records.filter(record => record.timestampUnixUs >= scenario.startedUnixUs
    && record.timestampUnixUs <= scenario.barrierUnixUs && scenario.tabIds.includes(record.tabId));
  for (const tabId of scenario.tabIds) {
    const tab = interval.filter(record => record.tabId === tabId);
    const engine = tab.filter(record => record.stage === "engine-delivery" && record.eventKind === "message_update");
    const renders = tab.filter(record => record.stage === "child-render-write" && record.eventSequence > scenario.engineBaselines[tabId]);
    const pty = tab.filter(record => record.stage === "pty-ingest");
    const commits = increasing(tab.filter(record => record.stage === "holder-commit"), "revision");
    const receipts = increasing(tab.filter(record => record.stage === "attach-receipt"), "revision");
    const paints = tab.filter(record => record.stage === "outer-paint");
    if (engine.length < 3) faults.push(`${scenario.id}/${tabId}: fewer than three engine partials before barrier`);
    if (renders.length < 3) faults.push(`${scenario.id}/${tabId}: fewer than three completed child writes before barrier`);
    if (pty.length < 3) faults.push(`${scenario.id}/${tabId}: fewer than three PTY ingestions before barrier`);
    if (commits.length < 3) faults.push(`${scenario.id}/${tabId}: fewer than three increasing holder commits before barrier`);
    if ((scenario.viewedTabIds ?? []).includes(tabId) && receipts.length < 1) faults.push(`${scenario.id}/${tabId}: no attach receipt while selected`);
    if ((scenario.viewedTabIds ?? []).includes(tabId) && paints.length < 1) faults.push(`${scenario.id}/${tabId}: no completed outer paint while selected`);
    const latestEngineAt = engine.at(-1)?.timestampUnixUs ?? scenario.startedUnixUs;
    // Invariant: the renderer write immediately following the last delta is content delivery; only later
    // writes with no new engine event are independent animation checkpoints.
    const animationWrites = renders.filter(record => record.timestampUnixUs > latestEngineAt + 50_000);
    if (animationWrites.length < 2) faults.push(`${scenario.id}/${tabId}: fewer than two post-partial animation writes`);
    byTab[tabId] = {
      enginePartials: engine.length,
      childWrites: renders.length,
      ptyIngestions: pty.length,
      holderCommits: commits.length,
      attachReceipts: receipts.length,
      outerPaints: paints.length,
      animationWrites: animationWrites.length,
    };
  }
  const observedOrder = scenario.tabIds
    .map(tabId => interval.find(record => record.tabId === tabId && record.stage === "engine-delivery" && record.eventKind === "message_update"))
    .filter(Boolean)
    .sort((left, right) => left.timestampUnixUs - right.timestampUnixUs)
    .map(record => record.tabId);
  if (observedOrder.join("\0") !== scenario.expectedFirstOrder.join("\0")) {
    faults.push(`${scenario.id}: first engine order ${observedOrder.join(",")} did not match ${scenario.expectedFirstOrder.join(",")}`);
  }
  return { id: scenario.id, passed: faults.length === 0, faults, byTab, observedFirstOrder: observedOrder };
}

export function progressLatencyReport(records, tabIds) {
  const perTab = {};
  const allFaults = [];
  for (const tabId of tabIds) {
    const tab = records.filter(record => record.tabId === tabId);
    const engine = new Map(tab.filter(record => record.stage === "engine-delivery").map(record => [record.eventSequence, record]));
    const render = tab.filter(record => record.stage === "child-render-write" && engine.has(record.eventSequence));
    const engineToRender = render.map(record => durationMs(engine.get(record.eventSequence), record)).filter(Number.isFinite);
    const pty = tab.filter(record => record.stage === "pty-ingest");
    const renderToPty = matchForward(render, pty);
    const commits = tab.filter(record => record.stage === "holder-commit");
    const paintsByRevision = new Map(tab.filter(record => record.stage === "outer-paint" && record.revision > 0)
      .map(record => [record.revision, record]));
    const commitToPaint = commits.map(record => paintsByRevision.has(record.revision)
      ? durationMs(record, paintsByRevision.get(record.revision)) : Number.NaN).filter(Number.isFinite);
    const commitTimes = tab.filter(record => record.stage === "holder-commit").map(record => record.timestampUnixUs)
      .sort((left, right) => left - right);
    const gaps = commitTimes.slice(1).map((value, index) => (value - commitTimes[index]) / 1_000);
    perTab[tabId] = {
      engineToRender: summary(engineToRender),
      renderToPty: summary(renderToPty),
      commitToPaint: summary(commitToPaint),
      holderWorstGapMs: gaps.length === 0 ? null : Math.max(...gaps),
    };
    if (engineToRender.length < 40) allFaults.push(`${tabId}: fewer than 40 matched engine-to-render samples`);
    if (renderToPty.length < 40) allFaults.push(`${tabId}: fewer than 40 matched renderer-to-PTY samples`);
    if (perTab[tabId].holderWorstGapMs !== null && perTab[tabId].holderWorstGapMs > 1_000) allFaults.push(`${tabId}: holder no-progress gap exceeded 1000 ms`);
  }
  return { perTab, faults: allFaults };
}

function increasing(records, field) {
  let previous = -1;
  return records.filter(record => {
    if (!Number.isSafeInteger(record[field]) || record[field] <= previous) return false;
    previous = record[field];
    return true;
  });
}

function durationMs(left, right) {
  const durationUs = right.timestampUnixUs - left.timestampUnixUs;
  const uncertaintyUs = left.clockErrorUs + right.clockErrorUs;
  return durationUs + uncertaintyUs < 0 ? Number.NaN : Math.max(0, durationUs) / 1_000;
}

function matchForward(source, target) {
  const sortedTarget = [...target].sort((left, right) => left.timestampUnixUs - right.timestampUnixUs);
  let targetIndex = 0;
  const durations = [];
  for (const item of [...source].sort((left, right) => left.timestampUnixUs - right.timestampUnixUs)) {
    while (targetIndex < sortedTarget.length
      && sortedTarget[targetIndex].timestampUnixUs + sortedTarget[targetIndex].clockErrorUs
        < item.timestampUnixUs - item.clockErrorUs) targetIndex += 1;
    if (targetIndex >= sortedTarget.length) break;
    durations.push(durationMs(item, sortedTarget[targetIndex]));
    targetIndex += 1;
  }
  return durations;
}

function summary(values) {
  if (values.length === 0) return { count: 0, p50Ms: null, p95Ms: null, maximumMs: null };
  const sorted = [...values].sort((left, right) => left - right);
  return {
    count: sorted.length,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    maximumMs: sorted.at(-1),
  };
}

function percentile(sorted, fraction) {
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}
