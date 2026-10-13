#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

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
  const result = spawnSync(host, arguments_, { encoding: "utf8", windowsHide: true, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${basename(host)} ${arguments_.slice(0, 2).join(" ")} failed (${result.status}): ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

async function waitUntil(probe, description, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await probe();
    if (value) return value;
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
process.stdin.setRawMode?.(true);
if (standby) await new Promise((resolve, reject) => {
  let buffered = Buffer.alloc(0);
  process.stdin.on("error", reject);
  process.stdin.on("data", chunk => {
    buffered = Buffer.concat([buffered, chunk]).subarray(-marker.length);
    if (buffered.equals(marker)) { process.stdin.removeAllListeners("data"); resolve(); }
  });
  process.stdin.resume();
});
const credentials = { tabId: process.env.A1_TAB_ID, token: process.env.A1_TAB_TOKEN, endpoint: process.env.A1_TAB_ENDPOINT };
for (const name of ["A1_TAB_ID", "A1_TAB_TOKEN", "A1_TAB_ENDPOINT"]) delete process.env[name];
const bridge = new TabBridgeClient({ credentials });
if (!await bridge.start()) throw new Error("fixture bridge did not connect");
bridge.onCommand(command => { if (command.type === "stop") { bridge.close(); process.exit(0); } });
const dataIndex = process.argv.indexOf("--tab-data-dir");
const dataDir = process.argv[dataIndex + 1];
mkdirSync(dataDir, { recursive: true });
const session = join(dataDir, "measurement-session.jsonl");
writeFileSync(session, "{}\\n", { flag: "a" });
bridge.session(session, "measurement", "default");
process.stdin.setRawMode?.(true);
process.stdout.write(\`measurement-ready:\${process.hrtime.bigint()}\\r\\n\`);
let pending = "";
process.stdin.on("data", chunk => {
  pending += bridge.consumeControllerBoundaryInput(chunk.toString("utf8")).replaceAll("\\x03", "");
  for (;;) {
    const newline = pending.indexOf("\\n");
    if (newline < 0) break;
    const line = pending.slice(0, newline).replace(/\\r$/u, "");
    pending = pending.slice(newline + 1);
    const match = /^measure:([a-z0-9-]+):(\\d+)$/u.exec(line);
    if (match) process.stdout.write(\`measurement:\${match[1]}:\${match[2]}:\${process.hrtime.bigint()}\\r\\n\`);
  }
});
`;
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
    env: { ...process.env, A1_TABS_ENDPOINT: context.endpoint },
  });
  let output = "";
  const waiters = new Set();
  terminal.onData(data => {
    output = (output + data).slice(-512 * 1024);
    if (data.includes("\x1b[?u")) terminal.write("\x1b[?0u");
    if (data.includes("\x1b[6n")) terminal.write("\x1b[24;100R");
    for (const waiter of waiters) waiter();
  });
  const waitFor = async (pattern, description, timeoutMs = 15_000) => {
    const started = Date.now();
    for (;;) {
      const match = pattern.exec(output);
      if (match) return { match, receivedNs: process.hrtime.bigint() };
      if (Date.now() - started >= timeoutMs) throw new Error(`timed out waiting for ${description}; output=${JSON.stringify(output.slice(-2_000))}`);
      await new Promise(resolvePromise => {
        const wake = () => { waiters.delete(wake); resolvePromise(); };
        waiters.add(wake);
        setTimeout(wake, 25).unref();
      });
    }
  };
  return { terminal, waitFor, output: () => output };
}

async function countHolderMarkers(data) {
  const roots = await import("node:fs/promises").then(({ readdir }) => readdir(join(data, "tabs"), { withFileTypes: true }).catch(() => []));
  let count = 0;
  for (const root of roots.filter(entry => entry.isDirectory())) {
    const processes = join(data, "tabs", root.name, "processes");
    const entries = await import("node:fs/promises").then(({ readdir }) => readdir(processes).catch(() => []));
    for (const entry of entries) {
      try {
        const value = JSON.parse(await readFile(join(processes, entry), "utf8"));
        if (value.role === "holder") count++;
      } catch {}
    }
  }
  return count;
}

function internal(host, context, operation, extra = []) {
  return run(host, [
    "internal", operation, "--profile", context.profile, "--data-dir", context.data,
    "--runtime-dir", context.runtime, ...extra,
  ], { cwd: context.root, env: { ...process.env, A1_TABS_ENDPOINT: context.endpoint } });
}

async function collectMeasurements(host) {
  const { spawn } = await import("node-pty");
  const root = await mkdtemp(join(tmpdir(), "a1-resident-measure-"));
  const context = {
    root,
    profile: join(root, "profile"), data: join(root, "data"), runtime: join(root, "runtime"),
    release: join(root, "release"),
    endpoint: process.platform === "win32" ? `\\\\.\\pipe\\a1-resident-measure-${process.pid}-${Date.now()}` : join(root, "resident.sock"),
  };
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
      cwd: root, env: { ...process.env, A1_TABS_ENDPOINT: context.endpoint },
    });
    const first = await createAttach(spawn, host, context);
    attachments.push(first);
    await first.waitFor(/measurement-ready:(\d+)/u, "cold tab paint");
    const cold = await measureInput(first, "cold");
    sample.coldLaunchMs = milliseconds(cold.processedNs - coldStartNs);

    await waitUntil(async () => await countHolderMarkers(context.data) >= 2, "matching standby holder");
    const warmStartNs = process.hrtime.bigint();
    const created = JSON.parse(internal(host, context, "tab-create", [
      "--cwd", root, "--release-root", context.release, "--node-executable", process.execPath,
    ]));
    const second = await createAttach(spawn, host, context, created.tabId);
    attachments.push(second);
    await second.waitFor(/measurement-ready:(\d+)/u, "promoted standby paint");
    const warm = await measureInput(second, "warm");
    sample.warmCreateMs = milliseconds(warm.processedNs - warmStartNs);

    const hot = [];
    for (let index = 0; index < 20; index++) hot.push(await measureInput(second, `hot-${index}`));
    second.terminal.write("\x03\x03");
    await new Promise(resolvePromise => second.terminal.onExit(resolvePromise));

    const reattachStartNs = process.hrtime.bigint();
    const reattached = await createAttach(spawn, host, context, created.tabId);
    attachments.push(reattached);
    const paint = await reattached.waitFor(/measurement-ready:(\d+)/u, "reattach first paint");
    sample.reattachPaintMs = milliseconds(paint.receivedNs - reattachStartNs);
    const reattach = await measureInput(reattached, "reattach");
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

async function measureInput(attach, id) {
  const sentNs = process.hrtime.bigint();
  attach.terminal.write(`measure:${id}:${sentNs}\n`);
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const observed = await attach.waitFor(new RegExp(`measurement:${escaped}:(\\d+):(\\d+)`, "u"), `processed input ${id}`);
  return { sentNs: BigInt(observed.match[1]), processedNs: BigInt(observed.match[2]), receivedNs: observed.receivedNs };
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
  if (Object.values(summary.measurements).some(result => !result.passed)) process.exitCode = 1;
}

if (process.argv[1]?.endsWith("measure-resident-tabs.mjs")) await main();
