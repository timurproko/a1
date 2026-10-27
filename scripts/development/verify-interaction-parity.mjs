#!/usr/bin/env node
/**
 * Exact-artifact direct-versus-resident interaction parity.
 *
 * Drives the key-transport subset of the shared interaction matrix through a built terminal host
 * (server, holder, attach under a real pseudoterminal) and through the same certified parity
 * child launched directly under a pseudoterminal, then compares the bytes each child observed as
 * content-free observations. The verdict is per platform; one platform's result never certifies
 * another. Evidence names cases, sequences, and digests, never input content.
 */
import { spawnSync } from "node:child_process";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createResidentFixtureRoot, writeFixtureRoleEntry } from "./resident-input-responsiveness.mjs";
import { KEY_TRANSPORT_CASES } from "./interaction-parity/matrix.mjs";
import { compareCandidates, digestContent, validateObservations } from "./interaction-parity/observations.mjs";

export const PARITY_REPORT_SCHEMA = "a1-interaction-parity-v1";
const CASE_TIMEOUT_MS = 20_000;
const RECORD_PATTERN = /in#(\d+):([0-9a-f]*);/gu;
let hostEntry;

/**
 * The bytes a direct terminal sends for one matrix step; `null` for steps the key child cannot see.
 * `rowOffset` moves pointer rows below the resident strip so both children see the same cell.
 */
export function stepBytes(step, rowOffset = 0) {
  switch (step.kind) {
    case "text": return Buffer.from(step.text, "utf8");
    case "paste": return Buffer.from(`\u001b[200~${step.text}\u001b[201~`, "utf8");
    case "focus": return Buffer.from(step.gained ? "\u001b[I" : "\u001b[O", "utf8");
    case "mouse": {
      const code = step.action === "scroll-up" ? 64 : step.action === "scroll-down" ? 65 : step.action === "motion" ? 32 + ((step.button ?? 1) - 1) : (step.button ?? 1) - 1;
      const suffix = step.action === "release" ? "m" : "M";
      return Buffer.from(`\u001b[<${code};${step.column + 1};${step.row + 1 + rowOffset}${suffix}`, "utf8");
    }
    case "key": return keyBytes(step);
    default: return null;
  }
}

function modifierParameter(mods = []) {
  let bits = 0;
  if (mods.includes("shift")) bits |= 1;
  if (mods.includes("alt")) bits |= 2;
  if (mods.includes("ctrl")) bits |= 4;
  return bits === 0 ? null : bits + 1;
}

function keyBytes(step) {
  const parameter = modifierParameter(step.mods);
  const cursor = letter => Buffer.from(parameter === null ? `\u001b[${letter}` : `\u001b[1;${parameter}${letter}`, "utf8");
  const tilde = number => Buffer.from(parameter === null ? `\u001b[${number}~` : `\u001b[${number};${parameter}~`, "utf8");
  const control = (legacy, codepoint) => Buffer.from(parameter === null ? legacy : `\u001b[${codepoint};${parameter}u`, "utf8");
  switch (step.key) {
    case "enter": return control("\r", 13);
    case "tab": return parameter === 2 ? Buffer.from("\u001b[Z", "utf8") : control("\t", 9);
    case "backspace": return control("\u007f", 127);
    case "escape": return control("\u001b", 27);
    case "delete": return tilde(3);
    case "insert": return tilde(2);
    case "page-up": return tilde(5);
    case "page-down": return tilde(6);
    case "arrow-up": return cursor("A");
    case "arrow-down": return cursor("B");
    case "arrow-right": return cursor("C");
    case "arrow-left": return cursor("D");
    case "home": return cursor("H");
    case "end": return cursor("F");
    default: {
      const text = step.text ?? step.key;
      if (text.length !== 1) return null;
      const mods = step.mods ?? [];
      if (mods.includes("ctrl") && !mods.includes("shift") && !mods.includes("alt") && /^[a-z@[\\\]^_ ]$/u.test(text.toLowerCase())) {
        return Buffer.from([text === " " ? 0 : text.toLowerCase().charCodeAt(0) & 0x1f]);
      }
      if (mods.includes("ctrl")) return Buffer.from(`\u001b[${text.toLowerCase().codePointAt(0)};${parameter}u`, "utf8");
      return Buffer.from(`${mods.includes("alt") ? "\u001b" : ""}${text}`, "utf8");
    }
  }
}

/** Every `in#<n>:<hex>;` record a parity child printed, in order and without duplicates. */
export function recordsFromOutput(output) {
  const records = new Map();
  for (const match of output.matchAll(RECORD_PATTERN)) records.set(Number(match[1]), match[2]);
  return [...records.entries()].sort((left, right) => left[0] - right[0]).map(([seq, hex]) => ({ seq, hex }));
}

/** Observations for one candidate from the records a case produced after `offset` prior records. */
export function buildObservations(caseId, candidate, platform, records, sentAt, observedAt) {
  return records.map((record, index) => ({
    caseId,
    candidate,
    platform,
    kind: "key",
    seq: index + 1,
    sentAt,
    observedAt,
    digest: digestContent(record.hex),
    length: record.hex.length / 2,
  }));
}

/** The report written for CI: a per-platform verdict plus sanitized evidence. */
export function parityReport(platform, observations, cases, faults, failures = []) {
  // Rationale: input latency is certified by measure-resident-tabs; this report judges bytes.
  const verdict = compareCandidates(observations, cases, platform, { latency: false });
  return {
    schema: PARITY_REPORT_SCHEMA,
    platform,
    cases: cases.map(entry => entry.id),
    compared: verdict.compared,
    passed: verdict.passed && faults.length === 0 && failures.length === 0,
    divergences: verdict.divergences,
    declared: verdict.declared,
    faults,
    failures,
    observations: observations.map(observation => ({ ...observation, sentAt: Math.round(observation.sentAt), observedAt: Math.round(observation.observedAt) })),
  };
}

function run(host, arguments_, options = {}) {
  const result = spawnSync(process.execPath, [hostEntry, ...arguments_], {
    encoding: "utf8",
    ...options,
    env: { ...(options.env ?? process.env), A1_DEV_INSTANCE_ID: options.env?.A1_DEV_INSTANCE_ID ?? process.env.A1_DEV_INSTANCE_ID ?? "terminal-host-validation", A1_TERMINAL_HOST_PATH: resolve(host) },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${basename(host)} ${arguments_.slice(0, 2).join(" ")} failed (${result.status}): ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

async function prepareNodePty() {
  if (process.platform !== "darwin") return;
  for (const directory of ["build/Release", `prebuilds/darwin-${process.arch}`]) {
    try { await chmod(resolve("node_modules", "node-pty", directory, "spawn-helper"), 0o755); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
}

function terminalRecorder(terminal) {
  let output = "";
  const waiters = new Set();
  terminal.onData(data => {
    output = (output + data).slice(-4 * 1024 * 1024);
    if (data.includes("\u001b[?u")) terminal.write("\u001b[?0u");
    if (data.includes("\u001b[6n")) terminal.write("\u001b[24;100R");
    for (const waiter of waiters) waiter();
  });
  const waitFor = async (predicate, description, timeoutMs = CASE_TIMEOUT_MS) => {
    const started = Date.now();
    for (;;) {
      if (predicate(output)) return;
      if (Date.now() - started >= timeoutMs) throw new Error(`timed out waiting for ${description}`);
      await new Promise(resolvePromise => {
        const wake = () => { waiters.delete(wake); resolvePromise(); };
        waiters.add(wake);
        setTimeout(wake, 25);
      });
    }
  };
  return { waitFor, output: () => output };
}

/**
 * The bytes a case delivered to the child as one stream. A terminal may split or merge reads
 * differently on each path, so the comparison is over the concatenated bytes, not per read.
 */
export function caseStream(records) {
  return { seq: 1, hex: records.map(record => record.hex).join("") };
}

const QUIET_MS = 300;
const CASE_DEADLINE_MS = 5_000;
const STEP_GAP_MS = 30;
const HANDSHAKE_ATTEMPTS = 3;
const HANDSHAKE_WAIT_MS = 1_500;
const RAW_OUTPUT_TAIL = 16 * 1024;

/** Waits until the record count stops changing for `QUIET_MS`, so late input cannot spill forward. */
async function settleRecords(recorder) {
  let count = recordsFromOutput(recorder.output()).length;
  let changedAt = Date.now();
  while (Date.now() - changedAt < QUIET_MS) {
    await new Promise(resolvePromise => setTimeout(resolvePromise, 25));
    const next = recordsFromOutput(recorder.output()).length;
    if (next !== count) { count = next; changedAt = Date.now(); }
  }
  return count;
}

/**
 * Rationale: visible child output proves only that the output path is live. Before the first
 * measured case, each candidate must also report an uncompared warm-up input, retried so a
 * start-up hold or a late terminal reply is flushed instead of fusing into the first case.
 */
async function confirmInputPath(terminal, recorder) {
  for (let attempt = 0; attempt < HANDSHAKE_ATTEMPTS; attempt += 1) {
    const before = recordsFromOutput(recorder.output()).length;
    terminal.write(".");
    try {
      await recorder.waitFor(output => recordsFromOutput(output).length > before, "input handshake", HANDSHAKE_WAIT_MS);
      return;
    } catch { /* Invariant: a held warm-up is released by the next attempt's input. */ }
  }
  throw new Error(`no input reached the child after ${HANDSHAKE_ATTEMPTS} handshake attempts`);
}

async function driveCandidate(candidate, terminal, cases, platform) {
  const rowOffset = candidate === "resident" ? 1 : 0;
  const observations = [];
  const failures = [];
  const recorder = terminalRecorder(terminal);
  try {
    await recorder.waitFor(output => output.includes("fake-tab-ready"), `${candidate} child readiness`);
    await confirmInputPath(terminal, recorder);
  } catch (error) {
    failures.push({ caseId: "readiness", candidate, reason: String(error.message) });
    return { observations, failures, output: recorder.output() };
  }
  let seen = await settleRecords(recorder);
  for (const entry of cases) {
    const sentAt = performance.now();
    for (const chunk of entry.steps.map(step => stepBytes(step, rowOffset)).filter(Boolean)) {
      terminal.write(chunk.toString("latin1"));
      await new Promise(resolvePromise => setTimeout(resolvePromise, STEP_GAP_MS));
    }
    // Invariant: a case is complete once its child has gone quiet; a key no child can observe
    // on this platform yields an empty stream on both paths, which still compares.
    const deadline = Date.now() + CASE_DEADLINE_MS;
    let count = recordsFromOutput(recorder.output()).length;
    let changedAt = Date.now();
    while (Date.now() < deadline) {
      await new Promise(resolvePromise => setTimeout(resolvePromise, 25));
      const next = recordsFromOutput(recorder.output()).length;
      if (next !== count) { count = next; changedAt = Date.now(); }
      if (Date.now() - changedAt >= QUIET_MS && (count > seen || Date.now() - sentAt >= 1_500)) break;
    }
    const records = recordsFromOutput(recorder.output());
    const produced = records.slice(seen);
    seen = records.length;
    observations.push(...buildObservations(entry.id, candidate, platform, [caseStream(produced)], sentAt, performance.now()));
  }
  return { observations, failures, output: recorder.output() };
}

async function main() {
  const arguments_ = process.argv.slice(2);
  const option = name => { const index = arguments_.indexOf(name); return index === -1 ? null : arguments_[index + 1]; };
  const hostOption = option("--host") ?? process.env.A1_TERMINAL_HOST_PATH;
  const fakeTabOption = option("--fake-tab");
  const out = option("--out");
  if (!hostOption || !fakeTabOption) throw new Error("usage: verify-interaction-parity.mjs --host <terminal-host.node> --fake-tab <fake-tab> [--out <report.json>]");
  // Invariant: both candidates run from a temporary directory, so executables resolve first.
  const host = resolve(hostOption);
  const fakeTab = resolve(fakeTabOption);
  const platform = `${process.platform}-${process.arch}`;
  // Platform: ConPTY translates pointer, focus, and paste controls before they reach either
  // candidate as the same events, so Windows compares the key-only subset.
  const cases = process.platform === "win32"
    ? KEY_TRANSPORT_CASES.filter(entry => entry.steps.every(step => step.kind === "key" || step.kind === "text"))
    : KEY_TRANSPORT_CASES;
  await prepareNodePty();
  const { spawn } = await import("node-pty");
  const root = await createResidentFixtureRoot("a1-interaction-parity-");
  hostEntry = await writeFixtureRoleEntry(root, host);
  const context = { profile: join(root, "profile"), data: join(root, "data"), runtime: join(root, "runtime"), release: join(root, "release") };
  for (const directory of Object.values(context)) { await mkdir(directory, { recursive: true }); if (process.platform !== "win32") await chmod(directory, 0o700); }
  await mkdir(join(context.release, "bin"), { recursive: true });
  const endpoint = process.platform === "win32" ? `\\\\.\\pipe\\a1-interaction-parity-${process.pid}-${Date.now()}` : join(root, "resident.sock");
  const environment = { ...process.env, TERM: "xterm-256color", A1_TABS_ENDPOINT: endpoint, A1_DEV_INSTANCE_ID: process.env.A1_DEV_INSTANCE_ID ?? "terminal-host-validation", A1_TERMINAL_HOST_PATH: host, TERMINAL_HOST_FAKE_TAB_MODE: "parity", TERMINAL_HOST_FIXTURE_SIZE: "100x24" };
  const terminals = [];
  const observations = [];
  const failures = [];
  const rawOutput = {};
  try {
    const direct = spawn(fakeTab, [], { cols: 100, rows: 23, cwd: root, env: environment });
    terminals.push(direct);
    const directRun = await driveCandidate("direct", direct, cases, platform);
    observations.push(...directRun.observations); failures.push(...directRun.failures);
    rawOutput.direct = directRun.output;

    run(host, ["server", "--detach", "--profile", context.profile, "--data-dir", context.data, "--runtime-dir", context.runtime], { cwd: root, env: environment });
    const attach = spawn(process.execPath, [
      hostEntry, "attach", "--endpoint", endpoint, "--cwd", root, "--clear-exit-ms", "500", "--profile", context.profile,
      "--settings-file", join(context.profile, "settings.json"), "--data-dir", context.data, "--runtime-dir", context.runtime,
      "--release-root", context.release, "--node-executable", fakeTab,
    ], { cols: 100, rows: 24, cwd: root, env: environment });
    terminals.push(attach);
    const residentRun = await driveCandidate("resident", attach, cases, platform);
    observations.push(...residentRun.observations); failures.push(...residentRun.failures);
    rawOutput.resident = residentRun.output;
    attach.write("\u0003\u0003");
  } finally {
    for (const terminal of terminals) { try { terminal.kill(); } catch { /* Invariant: a terminal that already exited needs no signal. */ } }
    try { run(host, ["tabs", "host-stop", "--profile", context.profile, "--data-dir", context.data, "--runtime-dir", context.runtime], { env: environment }); } catch { /* Invariant: a host that already stopped leaves nothing to stop. */ }
    await rm(root, { recursive: true, force: true }).catch(() => {});
  }
  // Invariant: this harness observes the bytes each child received, one stream per case.
  const faults = validateObservations(observations, cases.map(entry => ({ ...entry, expects: ["key"] })));
  const report = parityReport(platform, observations, cases, faults, failures);
  // Rationale: CI keeps only this report, so a failing run carries each candidate's latest
  // terminal output; that is the evidence needed to place a divergence.
  if (!report.passed) {
    report.rawOutputTail = Object.fromEntries(Object.entries(rawOutput)
      .map(([candidate, output]) => [candidate, output.slice(-RAW_OUTPUT_TAIL)]));
  }
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (out) await writeFile(out, json);
  process.stdout.write(json);
  if (!report.passed) {
    console.error(`interaction parity failed: ${failures.map(failure => `${failure.candidate}: ${failure.reason}`).join("; ") || `${report.divergences.length} byte divergences`}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
