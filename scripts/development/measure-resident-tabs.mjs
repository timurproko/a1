#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

const productIdentity = JSON.parse(await readFile(new URL("../../src/product-identity.json", import.meta.url), "utf8"));
const tabsEndpointEnvironment = productIdentity.environment.tabsEndpoint;

const budgets = Object.freeze({
  warmCreateMs: 250,
  reattachPaintMs: 300,
  reattachInputMs: 400,
  inputToProcessMs: 16,
  outputToPresentMs: 33,
});

function argument(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : process.argv[index + 1] ?? null;
}

function percentile(values, fraction) {
  if (values.length === 0) return null;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * fraction) - 1)];
}

export function summarizeResidentTabMeasurements(samples, directStartupBudgetMs) {
  const definitions = { coldLaunchMs: directStartupBudgetMs + 800, ...budgets };
  const measurements = Object.fromEntries(Object.entries(definitions).map(([metric, budgetMs]) => {
    const values = samples.map(sample => sample[metric]).filter(value => Number.isFinite(value) && value >= 0);
    const p95Ms = percentile(values, 0.95);
    return [metric, { samples: values.length, p95Ms, budgetMs, passed: p95Ms !== null && p95Ms <= budgetMs }];
  }));
  return { platform: `${process.platform}-${process.arch}`, directStartupBudgetMs, measurements };
}

function run(host, arguments_, options = {}) {
  const result = spawnSync(host, arguments_, { encoding: "utf8", windowsHide: true, timeout: 30_000, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${basename(host)} ${arguments_.slice(0, 2).join(" ")} failed (${result.status}): ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

async function waitUntil(probe, description, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await probe()) return;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 25));
  }
  throw new Error(`timed out waiting for ${description}`);
}

function milliseconds(nanoseconds) {
  return Number(nanoseconds) / 1_000_000;
}

async function fixtureSource(bridgeUrl) {
  return `import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TabBridgeClient } from ${JSON.stringify(bridgeUrl)};
const marker = Buffer.from("\\x1b]a1;standby-promote\\x07");
const standby = process.argv.includes("--tab-standby");
const dataIndex = process.argv.indexOf("--tab-data-dir");
const dataDir = process.argv[dataIndex + 1];
mkdirSync(dataDir, { recursive: true });
process.stdin.setRawMode?.(true);
if (standby) {
  writeFileSync(join(dataDir, "standby-ready"), "ready\\n");
  await new Promise((resolve, reject) => {
  let buffered = Buffer.alloc(0);
  process.stdin.on("error", reject);
  process.stdin.on("data", chunk => {
    buffered = Buffer.concat([buffered, chunk]).subarray(-marker.length);
    if (buffered.equals(marker)) { process.stdin.removeAllListeners("data"); resolve(); }
  });
    process.stdin.resume();
  });
}
const credentials = { tabId: process.env.A1_TAB_ID, token: process.env.A1_TAB_TOKEN, endpoint: process.env.A1_TAB_ENDPOINT };
for (const name of ["A1_TAB_ID", "A1_TAB_TOKEN", "A1_TAB_ENDPOINT"]) delete process.env[name];
const bridge = new TabBridgeClient({ credentials });
if (!await bridge.start()) throw new Error("fixture bridge did not connect");
bridge.onCommand(command => { if (command.type === "stop") { bridge.close(); process.exit(0); } });
const session = join(dataDir, "measurement-session.jsonl");
writeFileSync(session, "{}\\n", { flag: "a" });
bridge.session(session, "measurement", "default");
process.stdin.setRawMode?.(true);
let pending = "";
process.stdin.on("data", chunk => {
  pending += bridge.consumeControllerBoundaryInput(chunk.toString("utf8")).replaceAll("\\x03", "");
  for (const token of pending.match(/[a-z]/gu) ?? []) {
    process.stdout.write(\`measurement:\${token}:\${process.hrtime.bigint()}\\r\\n\`);
  }
  pending = "";
});
process.stdout.write(\`measurement-ready:\${process.hrtime.bigint()}\\r\\n\`);
`;
}

async function prepareNodePty() {
  if (process.platform !== "darwin") return;
  let helpers = 0;
  for (const directory of ["build/Release", `prebuilds/darwin-${process.arch}`]) {
    try {
      await chmod(resolve("node_modules", "node-pty", directory, "spawn-helper"), 0o755);
      helpers += 1;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  if (helpers === 0) throw new Error("node-pty macOS spawn helper is missing");
}

async function createAttach(spawnPty, host, context, viewTab = null) {
  const arguments_ = [
    "attach", "--endpoint", context.endpoint, "--cwd", context.root,
    "--clear-exit-ms", "500", "--profile", context.profile, "--data-dir", context.data,
    "--runtime-dir", context.runtime, "--release-root", context.release,
    "--node-executable", process.execPath,
  ];
  if (viewTab) arguments_.push("--view", viewTab);
  const terminal = spawnPty(host, arguments_, {
    cols: 100, rows: 24, cwd: context.root,
    env: context.environment,
  });
  let output = "";
  const waiters = new Set();
  terminal.onData(data => {
    output = (output + data).slice(-512 * 1024);
    if (data.includes("\x1b[?u")) terminal.write("\x1b[?0u");
    if (data.includes("\x1b[6n")) terminal.write("\x1b[24;100R");
    for (const waiter of waiters) waiter();
  });
  const waitFor = async (pattern, description, timeoutMs = 15_000, after = 0) => {
    const started = Date.now();
    for (;;) {
      const match = pattern.exec(output.slice(after));
      if (match) return { match, receivedNs: process.hrtime.bigint() };
      if (Date.now() - started >= timeoutMs) throw new Error(`timed out waiting for ${description}; output=${JSON.stringify(output.slice(-2_000))}`);
      await new Promise(resolvePromise => {
        const wake = () => { waiters.delete(wake); resolvePromise(); };
        waiters.add(wake);
        setTimeout(wake, 25).unref();
      });
    }
  };
  return { terminal, waitFor, checkpoint: () => output.length, output: () => output };
}

function internal(host, context, operation, extra = []) {
  return run(host, [
    "internal", operation, "--profile", context.profile, "--data-dir", context.data,
    "--runtime-dir", context.runtime, ...extra,
  ], { cwd: context.root, env: context.environment });
}

async function killAttach(terminal) {
  await new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(() => reject(new Error("timed out stopping measurement attach client")), 5_000);
    terminal.onExit(() => {
      clearTimeout(timeout);
      resolvePromise();
    });
    terminal.kill();
  });
}

async function collectMeasurements(host) {
  // Platform: node-pty publishes its macOS spawn helper without executable mode,
  // which makes every PTY launch fail in posix_spawnp before the host can start.
  await prepareNodePty();
  const { spawn } = await import("node-pty");
  const root = await mkdtemp(join(tmpdir(), "a1-resident-measure-"));
  const context = {
    root,
    profile: join(root, "profile"), data: join(root, "data"), runtime: join(root, "runtime"),
    release: join(root, "release"),
    endpoint: process.platform === "win32" ? `\\\\.\\pipe\\a1-resident-measure-${process.pid}-${Date.now()}` : join(root, "resident.sock"),
  };
  context.environment = { ...process.env, TERM: "xterm-256color", [tabsEndpointEnvironment]: context.endpoint };
  for (const directory of [context.profile, context.data, context.runtime, join(context.release, "bin")]) {
    await mkdir(directory, { recursive: true });
    if (process.platform !== "win32") await chmod(directory, 0o700);
  }
  const bridgeUrl = pathToFileURL(resolve("dist/foundation/resident-tabs/bridge-client.js")).href;
  await writeFile(join(context.release, "package.json"), "{\"type\":\"module\"}\n");
  await writeFile(join(context.release, "bin", "ui.js"), await fixtureSource(bridgeUrl));
  const attachments = [];
  const sample = {};
  try {
    const coldStartNs = process.hrtime.bigint();
    run(host, ["server", "--detach", "--profile", context.profile, "--data-dir", context.data, "--runtime-dir", context.runtime], {
      cwd: root, env: context.environment,
    });
    const first = await createAttach(spawn, host, context);
    attachments.push(first);
    const coldPaint = await first.waitFor(/measurement-ready:(\d+)/u, "cold tab paint");
    const cold = await measureInput(first, "a", "cold");
    sample.coldLaunchMs = milliseconds(coldPaint.receivedNs - coldStartNs);

    // Performance: the fixture marks readiness below the session boundary, so only matching
    // standby promotion—not standby startup—is included in the warm measurement. Creating the
    // tab through the already attached client also measures the real shortcut-to-paint path and
    // excludes an unrelated second terminal's startup negotiation.
    await waitUntil(async () => (await readdir(context.data, { recursive: true })).some(path => path.endsWith("standby-ready")), "matching standby readiness");
    const existingTabIds = new Set(JSON.parse(internal(host, context, "tab-list")).tabs.map(tab => tab.tabId));
    const warmCheckpoint = first.checkpoint();
    const warmStartNs = process.hrtime.bigint();
    first.terminal.write("\x1ba");
    const warmPaint = await first.waitFor(/measurement-ready:(\d+)/u, "promoted standby paint", 15_000, warmCheckpoint);
    const warm = await measureInput(first, "b", "warm");
    sample.warmCreateMs = milliseconds(warmPaint.receivedNs - warmStartNs);
    const created = JSON.parse(internal(host, context, "tab-list")).tabs.find(tab => !existingTabIds.has(tab.tabId));
    if (!created) throw new Error("promoted standby was absent from the tab list");

    const hot = [];
    for (let index = 0; index < 20; index++) {
      hot.push(await measureInput(first, String.fromCharCode("c".charCodeAt(0) + index), `hot-${index}`));
    }
    await killAttach(first.terminal);

    const reattachStartNs = process.hrtime.bigint();
    const reattached = await createAttach(spawn, host, context, created.tabId);
    attachments.push(reattached);
    const paint = await reattached.waitFor(/measurement-ready:(\d+)/u, "reattach first paint");
    sample.reattachPaintMs = milliseconds(paint.receivedNs - reattachStartNs);
    const reattach = await measureInput(reattached, "w", "reattach");
    sample.reattachInputMs = milliseconds(reattach.processedNs - reattachStartNs);

    const all = [cold, warm, reattach, ...hot];
    const samples = all.map(value => ({
      inputToProcessMs: milliseconds(value.processedNs - value.sentNs),
      outputToPresentMs: milliseconds(value.receivedNs - value.processedNs),
    }));
    samples[0] = { ...samples[0], ...sample };
    return { samples, context, tabIds: JSON.parse(internal(host, context, "tab-list")).tabs.map(tab => tab.tabId) };
  } finally {
    for (const attachment of attachments) {
      try { attachment.terminal.kill(); } catch {}
    }
  }
}

async function measureInput(attach, token, description) {
  const sentNs = process.hrtime.bigint();
  attach.terminal.write(token);
  const observed = await attach.waitFor(new RegExp(`measurement:${token}:(\\d+)`, "u"), `processed input ${description}`);
  return { sentNs, processedNs: BigInt(observed.match[1]), receivedNs: observed.receivedNs };
}

async function main() {
  const directStartupBudgetMs = Number(argument("--direct-startup-budget-ms"));
  if (!Number.isFinite(directStartupBudgetMs) || directStartupBudgetMs < 0) throw new Error("a non-negative direct startup budget is required");
  const host = argument("--host") ?? process.env.A1_TERMINAL_HOST_PATH;
  let samples;
  if (host) {
    const collected = await collectMeasurements(resolve(host));
    samples = collected.samples;
    for (const tabId of collected.tabIds) {
      try { internal(resolve(host), collected.context, "tab-close", ["--tab", tabId]); } catch {}
    }
  } else {
    const samplesFile = argument("--samples");
    if (!samplesFile) throw new Error("usage: measure-resident-tabs.mjs --host <a1-terminal-host> --direct-startup-budget-ms N");
    const parsed = JSON.parse(await readFile(samplesFile, "utf8"));
    if (!Array.isArray(parsed)) throw new Error("measurement input must be a JSON array");
    samples = parsed;
  }
  const summary = { schema: "a1-resident-tabs-performance-v1", ...summarizeResidentTabMeasurements(samples, directStartupBudgetMs), samples };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  const failed = Object.entries(summary.measurements).filter(([, result]) => !result.passed);
  if (failed.length > 0) {
    console.error(`resident latency budgets exceeded: ${failed.map(([metric, result]) => `${metric}=${result.p95Ms}ms>${result.budgetMs}ms`).join(", ")}`);
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("measure-resident-tabs.mjs")) await main();
