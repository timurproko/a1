#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

// Rationale: a bounded randomized run against the release-built terminal host. It kills servers,
// holders, and agents, churns tabs, and checks after every action that no tab or holder is
// duplicated; at the end it stops the host and requires that no resident process survives.

export const CHAOS_SCHEMA = "a1-resident-chaos-v1";
const DEFAULT_SECONDS = 600;
const MAX_OPEN_TABS = 6;
// Invariant: the third restart in a window waits the longest 30-second backoff step, then the
// holder must start the child, so a replacement is due within the backoff plus a start bound.
const RESTART_DEADLINE_MS = 30_000 + 30_000;
const SERVER_RECOVERY_DEADLINE_MS = 20_000;
const MAX_DIAGNOSTIC_LINES = 120;

export function percentile(values, fraction) {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * fraction) - 1)];
}

/** Invariants over one maintenance listing: unique tab ids and no holder shared by two tabs. */
export function listingViolations(tabs) {
  const violations = [];
  const ids = new Set();
  const holders = new Map();
  for (const tab of tabs) {
    if (ids.has(tab.tabId)) violations.push(`duplicate tab ${tab.tabId}`);
    ids.add(tab.tabId);
    if (typeof tab.holderPid === "number") {
      const owner = holders.get(tab.holderPid);
      if (owner !== undefined) violations.push(`holder ${tab.holderPid} serves ${owner} and ${tab.tabId}`);
      holders.set(tab.holderPid, tab.tabId);
    }
  }
  return violations;
}

export function summarize(samples) {
  return Object.fromEntries(Object.entries(samples).map(([metric, values]) => [metric, {
    samples: values.length,
    p50Ms: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
    maxMs: values.length === 0 ? null : Math.max(...values),
  }]));
}

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1] ?? fallback;
}

function random(limit) {
  return randomBytes(4).readUInt32LE(0) % limit;
}

async function sleep(milliseconds) {
  await new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));
}

function alive(pid) {
  try { process.kill(pid, 0); } catch (error) { return error?.code === "EPERM"; }
  if (process.platform === "win32") return true;
  // Platform: signal 0 succeeds for an unreaped zombie, which can no longer replace a server.
  const state = spawnSync("ps", ["-o", "stat=", "-p", String(pid)], { encoding: "utf8" });
  return state.status === 0 && state.stdout.trim() !== "" && !state.stdout.trim().startsWith("Z");
}

/** The fields of one registry record that explain a missed replacement. */
export function recordContext(record) {
  if (record === undefined) return { present: false };
  const { lifecycle, desired, incarnation, restarts, holderPid, childPid, lastExit } = record;
  return { present: true, lifecycle, desired, incarnation, restarts, holderPid, childPid, lastExit };
}

/** The last bounded lines of every terminal-host diagnostics log under `root`. */
async function diagnosticTails(root) {
  const tails = {};
  const visit = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (/^terminal-host-.*\.log/u.test(entry.name)) {
        const lines = (await readFile(path, "utf8").catch(() => "")).split("\n");
        tails[relative(root, path)] = lines.slice(-MAX_DIAGNOSTIC_LINES);
      }
    }
  };
  await visit(root);
  return tails;
}

function kill(pid) {
  try { process.kill(pid, "SIGKILL"); } catch { /* Rationale: the target may already be gone. */ }
}

function processesUsing(paths) {
  const wanted = paths.map(path => resolve(path));
  if (process.platform === "win32") {
    const script = "Get-CimInstance Win32_Process | Select-Object ProcessId, ExecutablePath | ConvertTo-Json -Compress";
    const listing = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", windowsHide: true });
    const rows = JSON.parse(listing.stdout || "[]");
    return (Array.isArray(rows) ? rows : [rows])
      .filter(row => typeof row.ExecutablePath === "string" && wanted.some(path => path.toLowerCase() === row.ExecutablePath.toLowerCase()))
      .map(row => row.ProcessId);
  }
  const listing = spawnSync("ps", ["-axo", "pid=,command="], { encoding: "utf8" });
  return listing.stdout.split("\n")
    .filter(line => wanted.some(path => line.includes(path)))
    .map(line => Number(line.trim().split(/\s+/u)[0]))
    .filter(pid => Number.isInteger(pid) && pid !== process.pid);
}

/** Builds the release terminal host and the fixture agent, returning their paths. */
function buildArtifacts() {
  const executable = process.platform === "win32" ? ".exe" : "";
  const node = spawnSync(process.execPath, [resolve("scripts/development/build-terminal-host.mjs")], { stdio: "inherit", windowsHide: true });
  if (node.status !== 0) throw new Error("release terminal host build failed");
  const cargo = process.env.CARGO ?? "cargo";
  const fixture = spawnSync(cargo, ["build", "--release", "--locked", "--manifest-path", resolve("native/terminal-host/Cargo.toml"), "--features", "resident-fixtures", "--bin", "fake-tab"], { stdio: "inherit", windowsHide: true });
  if (fixture.status !== 0) throw new Error("fixture agent build failed");
  return {
    host: resolve("dist/native", `${process.platform}-${process.arch}`, `terminal-host${executable}`),
    fakeTab: resolve("native/terminal-host/target/release", `fake-tab${executable}`),
  };
}

async function main() {
  const built = process.argv.includes("--build") ? buildArtifacts() : null;
  const host = built?.host ?? resolve(option("--host", ""));
  const fakeTab = built?.fakeTab ?? resolve(option("--fake-tab", ""));
  const seconds = Number(option("--seconds", process.env.RESIDENT_CHAOS_SECONDS ?? String(DEFAULT_SECONDS)));
  const resultPath = option("--result", built ? `.artifacts/validation/resident-chaos-${process.platform}-${process.arch}.json` : null);
  if ((!built && (!option("--host", "") || !option("--fake-tab", ""))) || !Number.isFinite(seconds) || seconds <= 0 || seconds > 900) {
    throw new Error("usage: run-resident-chaos.mjs (--build | --host <terminal-host> --fake-tab <fake-tab>) [--seconds 1-900] [--result <path>]");
  }
  const root = await mkdtemp(join(tmpdir(), "a1-chaos-"));
  const [profile, data, runtime, release] = ["profile", "data", "runtime", "release"].map(name => join(root, name));
  for (const directory of [profile, data, runtime, release]) await mkdir(directory, { recursive: true, mode: 0o700 });
  const endpoint = process.platform === "win32" ? `\\\\.\\pipe\\a1-tabs-chaos-${process.pid}-${randomBytes(4).toString("hex")}` : join(runtime, "resident.sock");
  const environment = { ...process.env, A1_TABS_ENDPOINT: endpoint };
  const common = ["--profile", profile, "--data-dir", data, "--runtime-dir", runtime];
  const run = (arguments_, extra = {}) => spawnSync(host, arguments_, { encoding: "utf8", env: { ...environment, ...extra }, windowsHide: true, timeout: 120_000 });
  const tabs = command => {
    const result = run(["tabs", ...command, ...common]);
    return JSON.parse(result.stdout.trim().split("\n").at(-1) || "{}");
  };
  const probe = () => run(["probe", ...common]).status === 0;
  const stateDir = () => tabs(["host-status"]).stateDir;
  const marker = async () => JSON.parse(await readFile(join(await stateDirOnce(), "server.json"), "utf8").catch(() => "{}"));
  let cachedState;
  const stateDirOnce = async () => (cachedState ??= stateDir());
  const registry = async () => JSON.parse(await readFile(join(await stateDirOnce(), "registry.json"), "utf8").catch(() => "{\"tabs\":[]}"));
  const until = async (condition, timeoutMs) => {
    const started = performance.now();
    while (performance.now() - started < timeoutMs) {
      if (await condition()) return performance.now() - started;
      await sleep(25);
    }
    return null;
  };

  const samples = { coldTabCreateMs: [], serverRecoveryMs: [], holderRestartMs: [], childRestartMs: [], tabStopMs: [] };
  const counts = {};
  const violations = [];
  const count = name => { counts[name] = (counts[name] ?? 0) + 1; };

  for (let attempt = 0; attempt < 50 && run(["server", "--detach", ...common]).status !== 0; attempt++) await sleep(100);
  if (!probe()) throw new Error("the resident server did not start");
  const deadline = Date.now() + seconds * 1_000;
  const startServer = async () => {
    for (let attempt = 0; attempt < 50 && run(["server", "--detach", "--restart", ...common]).status !== 0; attempt++) await sleep(100);
  };
  while (Date.now() < deadline) {
    if (!probe()) {
      // Invariant: with no tab left to replace it, a server is started by the next launch, as `a1` does.
      await startServer();
      count("start-server");
      if (!probe()) { violations.push("the resident server could not be started again"); break; }
    }
    const listing = tabs(["list"]);
    const open = listing.result?.tabs ?? [];
    violations.push(...listingViolations(open));
    const action = open.length === 0 ? 0 : random(6);
    if (action === 0 && open.length < MAX_OPEN_TABS) {
      const mode = random(2) === 0 ? "stream" : "echo";
      const started = performance.now();
      const created = run(["internal", "tab-create", ...common, "--cwd", release, "--release-root", release, "--node-executable", fakeTab], {
        TERMINAL_HOST_FAKE_TAB_MODE: mode,
        TERMINAL_HOST_FAKE_TAB_STREAM_BYTES: String(1 + random(64 * 1024)),
      });
      const tabId = created.status === 0 ? JSON.parse(created.stdout).tabId : null;
      const ready = tabId === null ? null : await until(async () => (await registry()).tabs.some(tab => tab.tabId === tabId && tab.childPid), 15_000);
      if (ready !== null) samples.coldTabCreateMs.push(performance.now() - started);
      else await sleep(250);
      count(tabId === null ? "create-refused" : `create-${mode}`);
    } else if (action === 1) {
      const { pid } = await marker();
      // Invariant: holders replace a killed server, so it is killed only while a tab has a live holder.
      const holders = (await registry()).tabs.filter(tab => typeof tab.holderPid === "number" && alive(tab.holderPid));
      if (typeof pid === "number" && holders.length > 0) {
        kill(pid);
        const recovered = await until(async () => probe(), SERVER_RECOVERY_DEADLINE_MS);
        if (recovered === null) violations.push({ violation: "server was not replaced after it was killed", killedPid: pid, holders: holders.map(recordContext) });
        else samples.serverRecoveryMs.push(recovered);
        count("kill-server");
      }
    } else if (action === 2 || action === 3) {
      const tab = open[random(open.length)];
      const record = (await registry()).tabs.find(candidate => candidate.tabId === tab.tabId);
      const pid = action === 2 ? record?.holderPid : record?.childPid;
      if (typeof pid === "number") {
        kill(pid);
        const field = action === 2 ? "holderPid" : "childPid";
        const restarted = await until(async () => {
          const next = (await registry()).tabs.find(candidate => candidate.tabId === tab.tabId);
          return next === undefined || ["failed", "stopped"].includes(next.lifecycle) || (typeof next[field] === "number" && next[field] !== pid);
        }, RESTART_DEADLINE_MS);
        if (restarted === null) {
          const now = (await registry()).tabs.find(candidate => candidate.tabId === tab.tabId);
          violations.push({ violation: `${field} of ${tab.tabId} was not replaced after it was killed`, killedPid: pid, before: recordContext(record), after: recordContext(now), serverRunning: probe() });
        }
        else samples[action === 2 ? "holderRestartMs" : "childRestartMs"].push(restarted);
        count(action === 2 ? "kill-holder" : "kill-child");
      }
    } else if (action === 4) {
      const tab = open[random(open.length)];
      const started = performance.now();
      const stopped = tabs(["stop", tab.tabId]);
      if (stopped.result?.accepted === true) samples.tabStopMs.push(performance.now() - started);
      count("stop-tab");
    } else {
      await sleep(50 + random(500));
      count("idle");
    }
  }

  const finalListing = tabs(["list"]);
  violations.push(...listingViolations(finalListing.result?.tabs ?? []));
  const stopped = tabs(["host-stop"]);
  if (!["stopped", "none"].includes(stopped.host)) violations.push(`host stop reported ${stopped.host}`);
  const orphanDeadline = Date.now() + 15_000;
  let orphans = processesUsing([host, fakeTab]);
  while (orphans.length > 0 && Date.now() < orphanDeadline) {
    await sleep(250);
    orphans = processesUsing([host, fakeTab]).filter(alive);
  }
  if (orphans.length > 0) violations.push(`orphaned resident processes: ${orphans.join(", ")}`);
  for (const pid of orphans) kill(pid);

  const report = {
    schema: CHAOS_SCHEMA,
    platform: `${process.platform}-${process.arch}`,
    seconds,
    counts,
    violations,
    measurements: summarize(samples),
    ...(violations.length > 0 ? { diagnostics: await diagnosticTails(data) } : {}),
  };
  if (resultPath) {
    await mkdir(dirname(resolve(resultPath)), { recursive: true });
    await writeFile(resolve(resultPath), `${JSON.stringify(report, null, 2)}\n`);
  }
  process.stdout.write(`${JSON.stringify(report)}\n`);
  await rm(root, { recursive: true, force: true }).catch(() => undefined);
  if (violations.length > 0) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
