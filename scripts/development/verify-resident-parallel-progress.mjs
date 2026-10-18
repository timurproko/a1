#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import process from "node:process";
import { createHash, randomUUID } from "node:crypto";
import {
  evaluateProgressScenario,
  progressLatencyReport,
  readProgressObservations,
} from "./resident-progress-observations.mjs";

const productIdentity = JSON.parse(await readFile(new URL("../../src/product-identity.json", import.meta.url), "utf8"));
const tabsEndpointEnvironment = productIdentity.environment.tabsEndpoint;
const hostEntry = resolve("dist/foundation/resident-tabs/host-entry.js");
const firstOrders = permutations([0, 1, 2]);
const scenarioTimeoutMs = 20_000;

function argument(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : process.argv[index + 1] ?? null;
}

function hostEnvironment(host, environment) {
  return {
    ...environment,
    A1_DEV_INSTANCE_ID: environment.A1_DEV_INSTANCE_ID ?? "resident-parallel-validation",
    A1_TERMINAL_HOST_PATH: resolve(host),
  };
}

function run(host, arguments_, options = {}) {
  const result = spawnSync(process.execPath, [hostEntry, ...arguments_], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 30_000,
    ...options,
    env: hostEnvironment(host, options.env ?? process.env),
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${basename(host)} ${arguments_.slice(0, 2).join(" ")} failed (${result.status}): ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

function internal(host, context, operation, extra = []) {
  return run(host, [
    "internal", operation, "--profile", context.profile, "--data-dir", context.data,
    "--runtime-dir", context.runtime, ...extra,
  ], { cwd: context.root, env: context.environment });
}

async function prepareNodePty() {
  if (process.platform !== "darwin") return;
  for (const directory of ["build/Release", `prebuilds/darwin-${process.arch}`]) {
    try { await chmod(resolve("node_modules", "node-pty", directory, "spawn-helper"), 0o755); } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

async function createAttach(spawnPty, host, context) {
  const terminal = spawnPty(process.execPath, [hostEntry,
    "attach", "--endpoint", context.endpoint, "--cwd", context.root,
    "--clear-exit-ms", "500", "--profile", context.profile,
    "--settings-file", join(context.profile, "settings.json"),
    "--data-dir", context.data, "--runtime-dir", context.runtime,
    "--release-root", context.release, "--node-executable", process.execPath,
  ], {
    name: "xterm-256color", cols: 100, rows: 30, cwd: context.root,
    env: hostEnvironment(host, context.environment),
  });
  let output = "";
  const waiters = new Set();
  terminal.onData(data => {
    output = (output + data).slice(-2 * 1024 * 1024);
    if (data.includes("\x1b[?u")) terminal.write("\x1b[?0u");
    if (data.includes("\x1b[6n")) terminal.write("\x1b[30;100R");
    for (const wake of waiters) wake();
  });
  const waitForOutput = async (token, description, after = 0, timeoutMs = scenarioTimeoutMs) => {
    await waitUntil(() => output.slice(after).includes(token), description, timeoutMs, waiters);
  };
  return { terminal, checkpoint: () => output.length, output: () => output, waitForOutput };
}

async function waitUntil(probe, description, timeoutMs = scenarioTimeoutMs, waiters = null) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await probe()) return;
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${description}`);
    await new Promise(resolvePromise => {
      const wake = () => { waiters?.delete(wake); resolvePromise(); };
      waiters?.add(wake);
      setTimeout(wake, 25).unref();
    });
  }
}

class LoopbackProvider {
  #server;
  #scenarios = new Map();
  #requests = [];

  async start() {
    this.#server = createServer((request, response) => { void this.#handle(request, response); });
    await new Promise((resolvePromise, reject) => {
      this.#server.once("error", reject);
      this.#server.listen(0, "127.0.0.1", resolvePromise);
    });
    const address = this.#server.address();
    if (address === null || typeof address === "string") throw new Error("loopback provider address is unavailable");
    return `http://127.0.0.1:${address.port}/v1`;
  }

  scenario(id, order) {
    const state = deferredScenario(id, order);
    this.#scenarios.set(id, state);
    return state;
  }

  get requests() { return [...this.#requests]; }

  async stop() {
    for (const scenario of this.#scenarios.values()) scenario.release();
    if (this.#server === undefined) return;
    await new Promise(resolvePromise => this.#server.close(resolvePromise));
  }

  async #handle(request, response) {
    if (request.method !== "POST" || request.url !== "/v1/chat/completions") {
      response.writeHead(404).end();
      return;
    }
    try {
      const body = await readRequestBody(request);
      const prompt = lastUserText(body.messages);
      const match = /scenario=([a-z0-9-]+);tab=([0-2])/u.exec(prompt);
      if (match === null) throw new Error("fixture prompt identity is missing");
      const scenario = this.#scenarios.get(match[1]);
      const tabIndex = Number(match[2]);
      if (scenario === undefined || scenario.requests.has(tabIndex)) throw new Error("fixture scenario request is invalid");
      const requestRecord = { scenario: scenario.id, tabIndex, receivedUnixUs: epochUs(), firstChunkUnixUs: null, completedUnixUs: null };
      scenario.requests.set(tabIndex, requestRecord);
      this.#requests.push(requestRecord);
      scenario.noteRequest();
      response.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });
      await scenario.started;
      await delay(scenario.order.indexOf(tabIndex) * 100);
      for (let index = 0; index < 12; index += 1) {
        if (index === 0) requestRecord.firstChunkUnixUs = epochUs();
        sendChunk(response, scenario.id, tabIndex, index, false);
        await delay(45);
      }
      scenario.notePartial(tabIndex);
      await scenario.released;
      for (let index = 12; index < 60; index += 1) {
        sendChunk(response, scenario.id, tabIndex, index, false);
        await delay(16);
      }
      sendChunk(response, scenario.id, tabIndex, 60, true);
      response.write("data: [DONE]\n\n");
      response.end();
      requestRecord.completedUnixUs = epochUs();
      scenario.noteComplete(tabIndex);
    } catch (error) {
      if (!response.headersSent) response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { message: error instanceof Error ? error.message : String(error) } }));
    }
  }
}

function deferredScenario(id, order) {
  let start;
  let release;
  let allRequests;
  let allPartial;
  let allComplete;
  const requests = new Map();
  const partial = new Set();
  const complete = new Set();
  const started = new Promise(resolvePromise => { start = resolvePromise; });
  const released = new Promise(resolvePromise => { release = resolvePromise; });
  const requestsReady = new Promise(resolvePromise => { allRequests = resolvePromise; });
  const partialReady = new Promise(resolvePromise => { allPartial = resolvePromise; });
  const completed = new Promise(resolvePromise => { allComplete = resolvePromise; });
  return {
    id, order, requests, started, released, requestsReady, partialReady, completed,
    start, release,
    noteRequest() { if (requests.size === 3) allRequests(); },
    notePartial(index) { partial.add(index); if (partial.size === 3) allPartial(); },
    noteComplete(index) { complete.add(index); if (complete.size === 3) allComplete(); },
  };
}

function sendChunk(response, scenarioId, tabIndex, index, finished) {
  const marker = ` P${scenarioId.replaceAll("-", "").slice(-2)}T${tabIndex + 1}C${String(index).padStart(2, "0")}`;
  response.write(`data: ${JSON.stringify({
    id: `fixture-${scenarioId}-${tabIndex}`,
    object: "chat.completion.chunk",
    created: 1,
    model: "parallel-stream",
    choices: [{ index: 0, delta: finished ? {} : { content: marker }, finish_reason: finished ? "stop" : null }],
  })}\n\n`);
}

async function readRequestBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 1024 * 1024) throw new Error("fixture request exceeds one MiB");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function lastUserText(messages) {
  const message = [...(Array.isArray(messages) ? messages : [])].reverse().find(value => value?.role === "user");
  if (typeof message?.content === "string") return message.content;
  if (Array.isArray(message?.content)) return message.content.map(part => typeof part?.text === "string" ? part.text : "").join("");
  return "";
}

async function currentObservations(context) {
  try { return await readProgressObservations(context.observations, context.runId); } catch (error) {
    if (error?.code === "ENOENT") return { records: [], faults: [], files: [] };
    throw error;
  }
}

async function selectTab(attach, context, index, tabId) {
  const sentUnixUs = epochUs();
  attach.terminal.write(`\x1b${index + 1}`);
  await waitUntil(async () => {
    const { records } = await currentObservations(context);
    return records.some(record => record.stage === "outer-paint" && record.tabId === tabId && record.timestampUnixUs >= sentUnixUs);
  }, `tab ${index + 1} activation paint`);
  await delay(50);
}

async function createRealTabs(attach, host, context) {
  await waitUntil(() => JSON.parse(internal(host, context, "tab-list")).tabs.length === 1, "first real A1 tab");
  for (let count = 2; count <= 3; count += 1) {
    attach.terminal.write("\x1ba");
    await waitUntil(() => JSON.parse(internal(host, context, "tab-list")).tabs.length === count, `${count} real A1 tabs`);
  }
  const tabs = JSON.parse(internal(host, context, "tab-list")).tabs;
  const tabIds = tabs.map(tab => tab.tabId);
  await waitUntil(async () => {
    const { records } = await currentObservations(context);
    return tabIds.every(tabId => records.some(record => record.stage === "child-render-write" && record.tabId === tabId));
  }, "all real A1 child renderers");
  return tabIds;
}

async function runScenarios(attach, host, context, provider, tabIds) {
  const results = [];
  let scenarioNumber = 0;
  for (const order of firstOrders) {
    for (let initialView = 0; initialView < 3; initialView += 1) {
      scenarioNumber += 1;
      const id = `s-${String(scenarioNumber).padStart(2, "0")}`;
      const scenario = provider.scenario(id, order);
      const before = await currentObservations(context);
      if (before.faults.length > 0) throw new Error(before.faults.join("; "));
      const engineBaselines = Object.fromEntries(tabIds.map(tabId => [tabId, Math.max(0, ...before.records
        .filter(record => record.tabId === tabId && record.stage === "engine-delivery").map(record => record.eventSequence))]));
      const startedUnixUs = epochUs();
      for (let tabIndex = 0; tabIndex < 3; tabIndex += 1) {
        await selectTab(attach, context, tabIndex, tabIds[tabIndex]);
        attach.terminal.write(`scenario=${id};tab=${tabIndex}`);
        attach.terminal.write("\r");
      }
      await withTimeout(scenario.requestsReady, `${id} provider requests`);
      await selectTab(attach, context, initialView, tabIds[initialView]);
      scenario.start();
      await withTimeout(scenario.partialReady, `${id} unfinished partials`);
      // Leave each turn unfinished while every retained surface is activated and painted.
      for (let tabIndex = 0; tabIndex < 3; tabIndex += 1) {
        const checkpoint = attach.checkpoint();
        await selectTab(attach, context, tabIndex, tabIds[tabIndex]);
        await attach.waitForOutput(`P${id.replaceAll("-", "").slice(-2)}T${tabIndex + 1}C11`, `${id} tab ${tabIndex + 1} partial surface`, checkpoint);
      }
      await delay(350);
      const barrierUnixUs = epochUs();
      const observations = await currentObservations(context);
      const result = evaluateProgressScenario(observations.records, {
        id,
        tabIds,
        viewedTabIds: tabIds,
        startedUnixUs,
        barrierUnixUs,
        engineBaselines,
        expectedFirstOrder: order.map(index => tabIds[index]),
      });
      const requestOrder = [...scenario.requests.values()].sort((left, right) => left.firstChunkUnixUs - right.firstChunkUnixUs).map(value => value.tabIndex);
      if (requestOrder.join(",") !== order.join(",")) result.faults.push(`${id}: provider first order ${requestOrder.join(",")} did not match ${order.join(",")}`);
      result.passed = result.faults.length === 0;
      scenario.release();
      await withTimeout(scenario.completed, `${id} completion`);
      await waitUntil(async () => {
        const next = await currentObservations(context);
        return tabIds.every(tabId => next.records.some(record => record.tabId === tabId && record.stage === "engine-delivery"
          && record.eventKind === "agent_settled" && record.timestampUnixUs >= barrierUnixUs));
      }, `${id} engine settlement`);
      results.push({ ...result, order, initialView: tabIds[initialView] });
      if (!result.passed) throw new Error(result.faults.join("; "));
    }
  }
  return results;
}

async function collect(host) {
  await prepareNodePty();
  const { spawn } = await import("node-pty");
  const root = await mkdtemp(join(tmpdir(), "a1-resident-parallel-"));
  const runId = randomUUID();
  const context = {
    root,
    profile: join(root, "profile"),
    data: join(root, "data"),
    runtime: join(root, "runtime"),
    observations: join(root, "observations"),
    release: resolve("."),
    runId,
    endpoint: process.platform === "win32" ? `\\\\.\\pipe\\a1-resident-parallel-${process.pid}-${Date.now()}` : join(root, "resident.sock"),
  };
  const provider = new LoopbackProvider();
  const baseUrl = await provider.start();
  context.environment = {
    ...process.env,
    TERM: "xterm-256color",
    [tabsEndpointEnvironment]: context.endpoint,
    A1_PROFILE_HOME: context.profile,
    A1_CONFIG_DIR: context.profile,
    A1_DATA_DIR: context.data,
    A1_RUNTIME_DIR: context.runtime,
    PI_CODING_AGENT_DIR: context.profile,
    A1_SKIP_VERSION_CHECK: "1",
    A1_RESIDENT_PROGRESS_OBSERVATION_DIR: context.observations,
    A1_RESIDENT_PROGRESS_RUN_ID: runId,
  };
  for (const directory of [context.profile, context.data, context.runtime, context.observations]) {
    await mkdir(directory, { recursive: true });
    if (process.platform !== "win32") await chmod(directory, 0o700);
  }
  await writeFile(join(context.profile, "models.json"), `${JSON.stringify({
    providers: { fixture: { baseUrl, api: "openai-completions", apiKey: "fixture", models: [{
      id: "parallel-stream", name: "Parallel stream fixture", contextWindow: 32_000, maxTokens: 4_096,
    }] } },
  }, null, 2)}\n`);
  await writeFile(join(context.profile, "settings.json"), `${JSON.stringify({
    defaultProvider: "fixture",
    defaultModel: "parallel-stream",
    defaultProjectTrust: "always",
    promptSuggestions: false,
    lastChangelogVersion: "0.2.7-dev",
  }, null, 2)}\n`);
  let attach;
  let tabIds = [];
  try {
    run(host, ["server", "--detach", "--profile", context.profile, "--data-dir", context.data, "--runtime-dir", context.runtime], {
      cwd: root, env: context.environment,
    });
    attach = await createAttach(spawn, host, context);
    tabIds = await createRealTabs(attach, host, context);
    const scenarios = await runScenarios(attach, host, context, provider, tabIds);
    const observations = await currentObservations(context);
    const latency = progressLatencyReport(observations.records, tabIds);
    const faults = [...observations.faults, ...latency.faults];
    return {
      schema: "a1-resident-parallel-progress-v1",
      platform: `${process.platform}-${process.arch}`,
      runId,
      artifact: {
        host: resolve(host),
        hostSha256: createHash("sha256").update(await readFile(resolve(host))).digest("hex"),
        release: context.release,
        releaseHead: gitHead(context.release),
      },
      fixture: { scenarios: scenarios.length, firstResponseOrders: firstOrders.length, initialViews: 3, chunksPerTurn: 60 },
      tabs: tabIds,
      scenarios,
      latency: latency.perTab,
      requests: provider.requests,
      observations: { files: observations.files.length, records: observations.records.length, faults: observations.faults },
      faults,
      passed: faults.length === 0 && scenarios.every(scenario => scenario.passed),
    };
  } finally {
    for (const tabId of tabIds) {
      try { internal(host, context, "tab-close", ["--tab", tabId]); } catch {}
    }
    try { attach?.terminal.kill(); } catch {}
    await provider.stop();
  }
}

function permutations(values) {
  if (values.length <= 1) return [values];
  return values.flatMap((value, index) => permutations(values.filter((_, candidate) => candidate !== index)).map(rest => [value, ...rest]));
}

function gitHead(cwd) {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(`could not identify fixture release: ${result.stderr}`);
  return result.stdout.trim();
}

function epochUs() { return Math.round(Date.now() * 1_000); }
function delay(milliseconds) { return new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds)); }
async function withTimeout(promise, description, timeoutMs = scenarioTimeoutMs) {
  let timeout;
  try {
    await Promise.race([promise, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error(`timed out waiting for ${description}`)), timeoutMs); })]);
  } finally { clearTimeout(timeout); }
}

async function main() {
  const host = argument("--host") ?? process.env.A1_TERMINAL_HOST_PATH;
  if (!host) throw new Error("usage: verify-resident-parallel-progress.mjs --host <terminal-host.node>");
  const report = await collect(resolve(host));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) process.exitCode = 1;
}

if (process.argv[1]?.endsWith("verify-resident-parallel-progress.mjs")) await main();
