// Provenance: exact-artifact fixture only; native Ghostty owns terminal interpretation. JavaScript supplies
// synthetic input and correlates completed semantic states with one local monotonic send clock.
const sampleCount = 40;
const cadenceMs = 30;
const stallMs = 1_000;
const overheadMs = 16 + 33;

/** Keep detached WMI roles on the exact fixture addon even without inherited overrides. */
export function fixtureRoleEntrySource(artifact) {
  return `const artifact = ${JSON.stringify(artifact)};\n`
    + `process.env.A1_DEV_INSTANCE_ID = "resident-parallel-validation";\n`
    + `process.env.A1_TERMINAL_HOST_PATH = artifact;\n`
    + `const addon = require(artifact);\n`
    + `process.exitCode = addon.runRole(process.argv.slice(2), { executable: process.execPath, entry: __filename, artifact });\n`;
}

/** Refuse a debug or unidentified native artifact instead of weakening the performance budget. */
export function assertOptimizedFixture(addon) {
  if (typeof addon?.fixtureBuildProfile !== "function" || addon.fixtureBuildProfile() !== "release") {
    throw new Error("performance certification requires a release-profile fixture addon");
  }
  return "release";
}

/** Reject unequal rendering work before comparing latency: both paths keep the same completed turn. */
export function assertMatchingInputBaseline(direct, resident, expectedMarkers = 60) {
  if (!Number.isSafeInteger(expectedMarkers) || expectedMarkers < 0
    || !direct.complete || !resident.complete
    || direct.markerOccurrences !== expectedMarkers || resident.markerOccurrences !== expectedMarkers
    || !/^[a-f0-9]{64}$/u.test(direct.markerDigest) || direct.markerDigest !== resident.markerDigest) {
    throw new Error(`unequal input baselines: direct=${direct.markerOccurrences}, resident=${resident.markerOccurrences}, expected=${expectedMarkers}`);
  }
  return { markerOccurrences: expectedMarkers, semanticDigest: direct.markerDigest, matched: true };
}

export function summarizeInputResponses(direct, resident) {
  const faults = [];
  const summarize = (values, name) => {
    if (values.length !== sampleCount) faults.push(`${name}: expected ${sampleCount} matched input responses`);
    const valid = values.filter(value => Number.isFinite(value) && value >= 0);
    if (valid.length !== values.length) faults.push(`${name}: invalid input response duration`);
    const sorted = [...valid].sort((a, b) => a - b);
    const p95Ms = sorted.length === 0 ? null : sorted[Math.ceil(sorted.length * 0.95) - 1];
    const maximumMs = sorted.length === 0 ? null : sorted.at(-1);
    if (maximumMs > stallMs) faults.push(`${name}: input response stalled beyond ${stallMs} ms`);
    return { count: valid.length, p95Ms, maximumMs };
  };
  const directSummary = summarize(direct, "direct");
  const residentSummary = summarize(resident, "resident");
  if (directSummary.p95Ms !== null && residentSummary.p95Ms !== null
    && residentSummary.p95Ms > directSummary.p95Ms + overheadMs) {
    faults.push(`resident input response p95 exceeds direct solo plus ${overheadMs} ms`);
  }
  return { direct: directSummary, resident: residentSummary, allowedOverheadMs: overheadMs,
    faults, passed: faults.length === 0 };
}

/** A later known semantic state acknowledges earlier inputs too: visual coalescing is legal,
 * but a stale, unrelated, or open frame cannot pretend to have processed a newer input. */
export function matchedResponseIndex(hashes, snapshot, lastMatched, sentCount) {
  if (!snapshot.complete || snapshot.markerOccurrences === 0) return lastMatched;
  const index = hashes.indexOf(snapshot.markerDigest);
  return index > lastMatched && index < sentCount ? index : lastMatched;
}

/** Select the first appearance of the final direct state, not an earlier torn ConPTY hash. */
export function firstCompletedResponse(frames, final) {
  if (!final.complete || final.markerOccurrences === 0) return undefined;
  return frames.find(frame => frame.snapshot.complete && frame.snapshot.markerOccurrences > 0
    && frame.snapshot.markerDigest === final.markerDigest);
}

class FrameOracle {
  #native;
  #listeners = new Set();
  #marker = "Type";
  #subscription;
  #error;
  constructor(addon, endpoint, resident) {
    this.#native = new addon.TerminalFrameObserver(100, resident ? 30 : 29, resident ? 1 : 0);
    // Rationale: cumulative fixture history can exceed the native per-call limit. Replay every
    // byte in order; Ghostty retains partial UTF-8 and escape sequences across bounded writes.
    const history = Buffer.from(endpoint.output(), "utf8");
    const chunkBytes = 64 * 1024;
    for (let offset = 0; offset < history.length; offset += chunkBytes) {
      this.#native.observe(history.subarray(offset, offset + chunkBytes), this.#marker);
    }
    this.#subscription = endpoint.terminal.onData(data => {
      const receivedAt = performance.now();
      try {
        const snapshot = this.#native.observe(Buffer.from(data, "utf8"), this.#marker);
        for (const listener of this.#listeners) listener(snapshot, receivedAt);
      } catch (error) { this.#error = error; }
    });
  }
  snapshot(marker) {
    if (this.#error !== undefined) throw this.#error;
    this.#marker = marker;
    return this.#native.observe(Buffer.alloc(0), marker);
  }
  listen(listener) { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  async echo(prompt) {
    if (this.#native.containsAsciiLiteral(prompt)) return;
    await new Promise((resolve, reject) => {
      const cancel = this.listen(snapshot => {
        if (!snapshot.complete || !this.#native.containsAsciiLiteral(prompt)) return;
        clearTimeout(timer);
        cancel();
        resolve();
      });
      const timer = setTimeout(() => { cancel(); reject(new Error("fixture prompt produced no complete input echo")); }, 10_000);
    });
  }
  async changed(before, timeout = stallMs) {
    return new Promise((resolve, reject) => {
      const cancel = this.listen((snapshot, receivedAt) => {
        if (!snapshot.complete || snapshot.markerOccurrences === 0 || snapshot.markerDigest === before) return;
        clearTimeout(timer);
        cancel();
        resolve({ snapshot, receivedAt });
      });
      const timer = setTimeout(() => { cancel(); reject(new Error("real A1 input produced no changed complete marker state")); }, timeout);
    });
  }
  close() { this.#subscription.dispose(); this.#listeners.clear(); }
}

async function waitMarker(oracle, marker) {
  const baseline = oracle.snapshot(marker);
  if (baseline.complete && baseline.markerOccurrences > 0) return baseline;
  return (await oracle.changed(baseline.markerDigest, 10_000)).snapshot;
}

/** Scenario setup is not timed: acknowledge the visible editor text before sending a separate Enter. */
export async function submitFixturePrompt(addon, endpoint, prompt, resident) {
  const oracle = new FrameOracle(addon, endpoint, resident);
  try {
    endpoint.terminal.write(prompt);
    await oracle.echo(prompt);
    endpoint.terminal.write("\r");
  } finally { oracle.close(); }
}

async function directSequence(endpoint, oracle, marker, bytes) {
  const hashes = [];
  const durations = [];
  let baseline = oracle.snapshot(marker).markerDigest;
  for (let index = 0; index < sampleCount; index += 1) {
    const frames = [];
    const stop = oracle.listen((snapshot, receivedAt) => frames.push({ snapshot, receivedAt }));
    try {
      const response = oracle.changed(baseline);
      const sentAt = performance.now();
      endpoint.terminal.write(bytes(index));
      await response;
      // Platform: ConPTY may relay END before all cells. Use the last semantic state in the
      // normal inter-input interval as the oracle, then measure its FIRST observed occurrence;
      // a transient partial menu hash must not become the resident path's expected final state.
      await delay(Math.max(2, cadenceMs - (performance.now() - sentAt)));
      const final = oracle.snapshot(marker);
      const first = firstCompletedResponse(frames, final);
      if (!final.complete || final.markerOccurrences === 0 || first === undefined || final.markerDigest === baseline
        || hashes.includes(final.markerDigest)) throw new Error("direct input states are not uniquely completed and ordered");
      hashes.push(final.markerDigest);
      durations.push(first.receivedAt - sentAt);
      baseline = final.markerDigest;
    } finally { stop(); }
  }
  return { hashes, durations };
}

async function residentSequence(endpoint, oracle, marker, bytes, hashes) {
  oracle.snapshot(marker);
  const sent = [];
  const durations = [];
  let lastMatched = -1;
  const cancel = oracle.listen((snapshot, receivedAt) => {
    const index = matchedResponseIndex(hashes, snapshot, lastMatched, sent.length);
    while (lastMatched < index) {
      lastMatched += 1;
      durations.push(receivedAt - sent[lastMatched]);
    }
  });
  try {
    for (let index = 0; index < sampleCount; index += 1) {
      sent.push(performance.now());
      endpoint.terminal.write(bytes(index));
      await delay(cadenceMs);
      if (lastMatched + 1 < sent.length && performance.now() - sent[lastMatched + 1] > stallMs) {
        throw new Error("resident input stalled during sustained input");
      }
    }
    const deadline = performance.now() + stallMs;
    while (durations.length < sampleCount && performance.now() < deadline) await delay(5);
    if (durations.length !== sampleCount) throw new Error(`resident missed semantic input states (${durations.length}/${sampleCount})`);
    return durations;
  } finally { cancel(); }
}

/** Uses real owned editor/model picker/transcript rendering, never an echo child or renderNow. */
export async function measureRealInputResponsiveness({ addon, direct, resident, prepareWheel }) {
  if (typeof addon.TerminalFrameObserver !== "function") throw new Error("fixture addon omitted incremental frame observer");
  const oracles = [new FrameOracle(addon, direct, false), new FrameOracle(addon, resident, true)];
  const [directOracle, residentOracle] = oracles;
  const reports = {};
  try {
    process.stderr.write("[input-responsiveness] typing\n");
    const typingBytes = index => `Type${String(index).padStart(2, "0")} `;
    const typing = await directSequence(direct, directOracle, "Type", typingBytes);
    reports.typing = summarizeInputResponses(typing.durations,
      await residentSequence(resident, residentOracle, "Type", typingBytes, typing.hashes));
    process.stderr.write("[input-responsiveness] model navigation\n");
    for (const endpoint of [direct, resident]) endpoint.terminal.write("\x03");
    await delay(150);
    for (const endpoint of [direct, resident]) endpoint.terminal.write("\x1b[17~");
    await Promise.all(oracles.map(oracle => waitMarker(oracle, "LatencyModel")));
    for (const endpoint of [direct, resident]) endpoint.terminal.write("LatencyModel");
    await delay(150);
    const navigation = await directSequence(direct, directOracle, "LatencyModel", () => "\x1b[B");
    reports.navigation = summarizeInputResponses(navigation.durations,
      await residentSequence(resident, residentOracle, "LatencyModel", () => "\x1b[B", navigation.hashes));
    for (const endpoint of [direct, resident]) endpoint.terminal.write("\x1b");
    await delay(150);
    process.stderr.write("[input-responsiveness] wheel scrolling\n");
    await prepareWheel(direct);
    await prepareWheel(resident);
    await Promise.all(oracles.map(oracle => waitMarker(oracle, "Wheel")));
    // Invariant: same child cell in both paths, with only the resident strip offset. Custom transcript
    // wheel distance is fixed by the owned viewport, so semantic states do not depend on cadence.
    const wheel = await directSequence(direct, directOracle, "Wheel", () => "\x1b[<64;50;10M");
    reports.wheel = summarizeInputResponses(wheel.durations,
      await residentSequence(resident, residentOracle, "Wheel", () => "\x1b[<64;50;11M", wheel.hashes));
    const faults = Object.entries(reports).flatMap(([name, report]) => report.faults.map(fault => `${name}: ${fault}`));
    return { samplesPerWorkload: sampleCount, cadenceMs, geometry: { columns: 100, childRows: 29 },
      workloads: reports, faults, passed: faults.length === 0 };
  } finally { for (const oracle of oracles) oracle.close(); }
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
