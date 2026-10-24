import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export const progressObservationSchema = "a1-resident-progress-observation-v1";
export const progressStages = Object.freeze([
  "engine-delivery", "child-render-write", "pty-ingest", "holder-commit", "attach-receipt", "outer-paint",
  "pipe-frame-read", "pipe-write-complete", "outer-write-complete", "wake-gap", "wake-repaint-requested",
]);
const connectionStages = new Set(["pipe-frame-read", "pipe-write-complete", "outer-write-complete", "wake-gap", "wake-repaint-requested"]);
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
  records.sort((left, right) => left.timestampUnixUs - right.timestampUnixUs
    || String(left.processInstance).localeCompare(String(right.processInstance)) || left.sequence - right.sequence);
  return { records, faults, files: names };
}

export function validateProgressObservations(records, runId) {
  const faults = [];
  const priorSequence = new Map();
  const priorTimestamp = new Map();
  const priorClock = new Map();
  const identities = new Set();
  for (const [index, record] of records.entries()) {
    const label = `record ${index + 1}`;
    if (record?.schema !== progressObservationSchema) faults.push(`${label}: invalid schema`);
    if (record?.runId !== runId) faults.push(`${label}: wrong run id`);
    if (!stageSet.has(record?.stage)) faults.push(`${label}: invalid stage`);
    if (!Number.isSafeInteger(record?.pid) || record.pid <= 0) faults.push(`${label}: invalid pid`);
    if (typeof record?.processInstance !== "string" || !/^[a-z0-9-]{1,128}$/iu.test(record.processInstance)) faults.push(`${label}: invalid process instance`);
    if (!Number.isSafeInteger(record?.sequence) || record.sequence <= 0) faults.push(`${label}: invalid sequence`);
    if (!Number.isSafeInteger(record?.timestampUnixUs) || record.timestampUnixUs <= 0) faults.push(`${label}: invalid timestamp`);
    if (!Number.isSafeInteger(record?.clockErrorUs) || record.clockErrorUs < 0 || record.clockErrorUs > 5_000) faults.push(`${label}: invalid clock error`);
    if (!(record?.tabId === undefined && connectionStages.has(record?.stage))
      && (typeof record?.tabId !== "string" || record.tabId.length === 0 || record.tabId.length > 128)) faults.push(`${label}: invalid tab id`);
    for (const field of ["durationUs", "idleWaitUs", "monotonicUs", "clockEpoch"]) {
      if (record?.[field] !== undefined && (!Number.isSafeInteger(record[field]) || record[field] < 0)) faults.push(`${label}: invalid ${field}`);
    }
    if ((record?.monotonicUs === undefined) !== (record?.clockEpoch === undefined)) faults.push(`${label}: incomplete monotonic clock`);
    if (record?.clockDiscontinuity !== undefined && typeof record.clockDiscontinuity !== "boolean") faults.push(`${label}: invalid clock discontinuity`);
    if (!Number.isSafeInteger(record?.incarnation) || record.incarnation < 0) faults.push(`${label}: invalid incarnation`);
    if (!Number.isSafeInteger(record?.lostBefore) || record.lostBefore < 0) faults.push(`${label}: invalid loss count`);
    else if (record.lostBefore > 0) faults.push(`${label}: ${record.lostBefore} observations lost before this record`);
    if (record?.fragmentCount !== undefined
      && (!Number.isSafeInteger(record.fragmentCount) || record.fragmentCount < 1 || record.fragmentCount > 4_096)) {
      faults.push(`${label}: invalid fragment count`);
    }
    if (record?.transactionKind !== undefined
      && !["synchronized-output", "ordinary"].includes(record.transactionKind)) faults.push(`${label}: invalid transaction kind`);
    for (const key of Object.keys(record ?? {})) {
      if (sensitiveKeys.test(key) && key !== "eventKind") faults.push(`${label}: payload-bearing field ${key}`);
    }
    const processKey = `${record?.role ?? "unknown"}:${record?.pid ?? "unknown"}:${record?.processInstance ?? "unknown"}`;
    const previousSequence = priorSequence.get(processKey) ?? 0;
    if (record?.sequence <= previousSequence) faults.push(`${label}: duplicate or reordered process sequence`);
    priorSequence.set(processKey, record?.sequence);
    const previousTimestamp = priorTimestamp.get(processKey) ?? 0;
    const previousClock = priorClock.get(processKey);
    const declaredBoundary = record?.clockDiscontinuity === true && Number.isSafeInteger(record?.clockEpoch)
      && record.clockEpoch > (previousClock?.epoch ?? 0);
    if (record?.timestampUnixUs + (record?.clockErrorUs ?? 0) < previousTimestamp && !declaredBoundary) faults.push(`${label}: process clock moved backwards`);
    if (record?.clockDiscontinuity === true && !declaredBoundary) faults.push(`${label}: clock discontinuity without a new epoch`);
    if (previousClock && (record?.clockEpoch < previousClock.epoch || record?.monotonicUs < previousClock.monotonic)) faults.push(`${label}: monotonic clock moved backwards`);
    if (record?.clockEpoch !== undefined) priorClock.set(processKey, { epoch: record.clockEpoch, monotonic: record.monotonicUs });
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

export function evaluateStoppedStageControl(records, control) {
  const faults = [];
  const interval = records.filter(record => record.timestampUnixUs >= control.startedUnixUs
    && record.timestampUnixUs <= control.barrierUnixUs && control.tabIds.includes(record.tabId));
  const counts = Object.fromEntries(control.tabIds.map(tabId => {
    const tab = interval.filter(record => record.tabId === tabId);
    return [tabId, {
      engine: tab.filter(record => record.stage === "engine-delivery" && record.eventKind === "message_update").length,
      renderer: tab.filter(record => record.stage === "child-render-write"
        && record.eventSequence > control.engineBaselines[tabId]).length,
      pty: tab.filter(record => record.stage === "pty-ingest").length,
      holder: tab.filter(record => record.stage === "holder-commit").length,
      receipt: tab.filter(record => record.stage === "attach-receipt").length,
      painter: tab.filter(record => record.stage === "outer-paint").length,
    }];
  }));
  const target = counts[control.targetTabId];
  if (target === undefined) faults.push(`${control.id}: target tab is absent`);
  const stoppedField = {
    "engine-delivery": "engine", "child-render-write": "renderer", "holder-commit": "holder", "outer-paint": "painter",
  }[control.stage];
  if (stoppedField === undefined) faults.push(`${control.id}: unsupported stopped stage ${control.stage}`);
  else if (target?.[stoppedField] !== 0) faults.push(`${control.id}: stopped ${control.stage} still advanced`);
  const prerequisites = {
    "engine-delivery": [],
    "child-render-write": ["engine"],
    "holder-commit": ["engine", "renderer", "pty"],
    "outer-paint": ["engine", "renderer", "pty", "holder", "receipt"],
  }[control.stage] ?? [];
  for (const field of prerequisites) {
    const minimum = field === "receipt" ? 1 : 3;
    if ((target?.[field] ?? 0) < minimum) faults.push(`${control.id}: target prerequisite ${field} did not advance`);
  }
  for (const tabId of control.tabIds) {
    if (tabId === control.targetTabId) continue;
    for (const field of ["engine", "renderer", "pty", "holder"]) {
      if (counts[tabId][field] < 3) faults.push(`${control.id}/${tabId}: unaffected ${field} did not advance`);
    }
  }
  return { id: control.id, stage: control.stage, targetTabId: control.targetTabId,
    passed: faults.length === 0, faults, counts };
}

export function progressLatencyReport(records, tabIds, activeWindows = null) {
  const perTab = {};
  const allFaults = [];
  const boundaries = clockBoundaries(records);
  for (const tabId of tabIds) {
    const tab = records.filter(record => record.tabId === tabId);
    const engine = new Map(tab.filter(record => record.stage === "engine-delivery").map(record => [record.eventSequence, record]));
    const render = tab.filter(record => record.stage === "child-render-write" && engine.has(record.eventSequence));
    const engineToRender = render.map(record => durationMs(engine.get(record.eventSequence), record, boundaries)).filter(Number.isFinite);
    const pty = tab.filter(record => record.stage === "pty-ingest");
    const renderToPty = matchForward(render, pty, boundaries);
    const commits = tab.filter(record => record.stage === "holder-commit");
    const paintsByRevision = new Map(tab.filter(record => record.stage === "outer-paint" && record.revision > 0)
      .map(record => [record.revision, record]));
    const commitToPaint = commits.map(record => paintsByRevision.has(record.revision)
      ? durationMs(record, paintsByRevision.get(record.revision), boundaries) : Number.NaN).filter(Number.isFinite);
    const commitTimes = tab.filter(record => record.stage === "holder-commit")
      .sort((left, right) => left.timestampUnixUs - right.timestampUnixUs);
    // Invariant: a holder owes commits only while its child has new output. Settled turns, stopped-stage
    // controls, server replacement, and paused sinks are idle by design, so gaps are measured only
    // inside the supplied windows where every tab streams and animates.
    const gaps = (activeWindows ?? [{ startedUnixUs: -Infinity, barrierUnixUs: Infinity }]).flatMap(window => {
      const inside = commitTimes.filter(value => value.timestampUnixUs >= window.startedUnixUs && value.timestampUnixUs <= window.barrierUnixUs);
      return inside.slice(1).map((value, index) => durationMs(inside[index], value, boundaries)).filter(Number.isFinite);
    });
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
  // Rationale: local I/O completion durations are not physical presentation or idle-read latency.
  const localCompletions = Object.fromEntries(["pipe-frame-read", "pipe-write-complete", "outer-write-complete"].map(stage => [stage,
    summary(records.filter(record => record.stage === stage && Number.isSafeInteger(record.durationUs) && record.durationUs >= 0)
      .map(record => record.durationUs / 1_000)),
  ]));
  return { perTab, faults: allFaults, localCompletions };
}

function increasing(records, field) {
  let previous = -1;
  return records.filter(record => {
    if (!Number.isSafeInteger(record[field]) || record[field] <= previous) return false;
    previous = record[field];
    return true;
  });
}

function processKey(record) { return `${record.role}:${record.pid}:${record.processInstance}`; }

function clockBoundaries(records) {
  const previous = new Map();
  const boundaries = [];
  for (const record of [...records].sort((left, right) => left.sequence - right.sequence)) {
    const key = processKey(record);
    const prior = previous.get(key);
    const backwards = prior && record.timestampUnixUs + record.clockErrorUs < prior.timestampUnixUs;
    if (record.clockDiscontinuity === true || record.stage === "wake-gap" || backwards
      || (prior?.clockEpoch !== undefined && record.clockEpoch !== prior.clockEpoch)) {
      boundaries.push(backwards
        ? { start: record.timestampUnixUs, end: prior.timestampUnixUs, backwards: true }
        : { start: record.timestampUnixUs, end: record.timestampUnixUs, backwards: false });
    }
    previous.set(key, record);
  }
  return boundaries;
}

function durationMs(left, right, boundaries) {
  const durationUs = right.timestampUnixUs - left.timestampUnixUs;
  if (!Number.isFinite(durationUs) || durationUs < 0 || left.incarnation !== right.incarnation) return Number.NaN;
  if (boundaries.some(boundary => boundary.backwards
    ? left.timestampUnixUs <= boundary.end && right.timestampUnixUs >= boundary.start
    : left.timestampUnixUs < boundary.start && right.timestampUnixUs >= boundary.start)) return Number.NaN;
  if (processKey(left) === processKey(right)) {
    if (left.clockEpoch !== right.clockEpoch) return Number.NaN;
    if (left.monotonicUs !== undefined && right.monotonicUs !== undefined) {
      const local = right.monotonicUs - left.monotonicUs;
      return Number.isSafeInteger(local) && local >= 0 ? local / 1_000 : Number.NaN;
    }
  }
  return durationUs / 1_000;
}

function matchForward(source, target, boundaries) {
  const sortedTarget = [...target].sort((left, right) => left.timestampUnixUs - right.timestampUnixUs);
  let targetIndex = 0;
  const durations = [];
  for (const item of [...source].sort((left, right) => left.timestampUnixUs - right.timestampUnixUs)) {
    while (targetIndex < sortedTarget.length
      && sortedTarget[targetIndex].timestampUnixUs + sortedTarget[targetIndex].clockErrorUs
        < item.timestampUnixUs - item.clockErrorUs) targetIndex += 1;
    if (targetIndex >= sortedTarget.length) break;
    const duration = durationMs(item, sortedTarget[targetIndex], boundaries);
    if (Number.isFinite(duration)) durations.push(duration);
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
