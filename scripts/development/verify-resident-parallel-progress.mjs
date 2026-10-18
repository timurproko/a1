#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { createRequire } from "node:module";
import process from "node:process";
import { createHash, randomUUID } from "node:crypto";
import {
  evaluateProgressScenario,
  evaluateStoppedStageControl,
  progressLatencyReport,
  readProgressObservations,
} from "./resident-progress-observations.mjs";

const productIdentity = JSON.parse(await readFile(new URL("../../src/product-identity.json", import.meta.url), "utf8"));
const tabsEndpointEnvironment = productIdentity.environment.tabsEndpoint;
const hostEntry = resolve("dist/foundation/resident-tabs/host-entry.js");
const firstOrders = permutations([0, 1, 2]);
const scenarioTimeoutMs = 20_000;
const childStartupTimeoutMs = 60_000;

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
  let outputOffset = 0;
  const outputLimit = 2 * 1024 * 1024;
  const waiters = new Set();
  terminal.onData(data => {
    output += data;
    if (output.length > outputLimit) {
      const dropped = output.length - outputLimit;
      output = output.slice(dropped);
      outputOffset += dropped;
    }
    if (data.includes("\x1b[?u")) terminal.write("\x1b[?0u");
    if (data.includes("\x1b[6n")) terminal.write("\x1b[30;100R");
    for (const wake of waiters) wake();
  });
  const waitForOutput = async (token, description, after = 0, timeoutMs = scenarioTimeoutMs) => {
    await waitUntil(() => output.slice(Math.max(0, after - outputOffset)).includes(token),
      description, timeoutMs, waiters);
  };
  return { terminal, checkpoint: () => outputOffset + output.length, output: () => output, waitForOutput };
}

async function createDirect(spawnPty, context) {
  const environment = {
    ...context.environment,
    LAUNCH_CONTEXT_MODE: "solo",
    HOME: context.directProfile,
    USERPROFILE: context.directProfile,
    [productIdentity.environment.profileHome]: context.directProfile,
    [productIdentity.environment.configDir]: context.directProfile,
    [productIdentity.environment.dataDir]: context.directData,
    [productIdentity.environment.runtimeDir]: context.directRuntime,
    PI_CODING_AGENT_DIR: context.directProfile,
  };
  delete environment[tabsEndpointEnvironment];
  delete environment[productIdentity.environment.residentFixtureControlDir];
  delete environment[productIdentity.environment.residentProgressObservationDir];
  delete environment[productIdentity.environment.residentProgressRunId];
  const terminal = spawnPty(process.execPath, [join(context.release, "bin", "ui.js")], {
    name: "xterm-256color", cols: 100, rows: 29, cwd: context.root, env: environment,
  });
  let output = "";
  const waiters = new Set();
  terminal.onData(data => {
    output = (output + data).slice(-8 * 1024 * 1024);
    // Platform: Windows ConPTY answers keyboard queries internally; inject a reply only where the
    // pseudoterminal passes the query through to this outer-terminal fixture.
    if (process.platform !== "win32" && data.includes("\x1b[?u")) terminal.write("\x1b[?0u");
    if (data.includes("\x1b[6n")) terminal.write("\x1b[29;100R");
    for (const wake of waiters) wake();
  });
  await waitUntil(() => output.includes("\x1b[?2026l"), "direct real A1 initial paint", childStartupTimeoutMs, waiters);
  return { terminal, output: () => output, waiters };
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

  scenario(id, order, expectedTabs = 3) {
    const state = deferredScenario(id, order, expectedTabs);
    this.#scenarios.set(id, state);
    return state;
  }

  get requests() { return [...this.#requests]; }

  async stop() {
    for (const scenario of this.#scenarios.values()) {
      scenario.releaseEngine();
      scenario.release();
    }
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
      if (scenario.blockedEngineTab === tabIndex) await scenario.engineReleased;
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

function deferredScenario(id, order, expectedTabs) {
  let start;
  let release;
  let allRequests;
  let allPartial;
  let allComplete;
  let releaseEngine;
  const requests = new Map();
  const partial = new Set();
  const complete = new Set();
  const started = new Promise(resolvePromise => { start = resolvePromise; });
  const released = new Promise(resolvePromise => { release = resolvePromise; });
  const requestsReady = new Promise(resolvePromise => { allRequests = resolvePromise; });
  const partialReady = new Promise(resolvePromise => { allPartial = resolvePromise; });
  const completed = new Promise(resolvePromise => { allComplete = resolvePromise; });
  const engineReleased = new Promise(resolvePromise => { releaseEngine = resolvePromise; });
  return {
    id, order, requests, started, released, requestsReady, partialReady, completed, engineReleased,
    blockedEngineTab: null,
    start, release, releaseEngine,
    noteRequest() { if (requests.size === expectedTabs) allRequests(); },
    notePartial(index) { partial.add(index); if (partial.size === expectedTabs) allPartial(); },
    noteComplete(index) { complete.add(index); if (complete.size === expectedTabs) allComplete(); },
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
  const before = await currentObservations(context);
  if (before.faults.length > 0) throw new Error(before.faults.join("; "));
  const latestPaint = before.records
    .filter(record => record.stage === "outer-paint")
    .sort((left, right) => right.timestampUnixUs - left.timestampUnixUs)[0];
  // Invariant: selecting the already active tab is a no-op and correctly emits no completed paint.
  // Treat its latest completed presentation as activation instead of waiting for invented damage.
  if (latestPaint?.tabId === tabId) return;
  const sentUnixUs = epochUs();
  attach.terminal.write(`\x1b${index + 1}`);
  await waitUntil(async () => {
    const { records } = await currentObservations(context);
    return records.some(record => record.stage === "outer-paint" && record.tabId === tabId && record.timestampUnixUs >= sentUnixUs);
  }, `tab ${index + 1} activation paint`);
  await delay(50);
}

function tabsCommand(host, context, command) {
  return JSON.parse(run(host, ["tabs", command, "--profile", context.profile,
    "--data-dir", context.data, "--runtime-dir", context.runtime], {
    cwd: context.root, env: context.environment,
  }));
}

function terminateExactProcess(pid, serverId) {
  if (!Number.isSafeInteger(pid) || pid <= 0 || typeof serverId !== "string"
    || !serverId.startsWith(`${pid}:`)) throw new Error("fixture process identity is invalid");
  if (process.platform === "win32") {
    const result = spawnSync("taskkill", ["/pid", String(pid), "/f"], { stdio: "ignore", windowsHide: true });
    if (result.status !== 0) throw new Error(`could not terminate fixture process ${pid}`);
    return;
  }
  process.kill(pid, "SIGKILL");
}

function stopAttach(attach) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(attach.terminal.pid), "/t", "/f"], { stdio: "ignore", windowsHide: true });
    return;
  }
  attach.terminal.kill();
}

async function createRealTabs(host, context) {
  await waitUntil(() => JSON.parse(internal(host, context, "tab-list")).tabs.length === 1, "first real A1 tab");
  for (let count = 2; count <= 3; count += 1) {
    internal(host, context, "tab-create", [
      "--cwd", context.root, "--release-root", context.release, "--node-executable", process.execPath,
    ]);
    await waitUntil(() => JSON.parse(internal(host, context, "tab-list")).tabs.length === count, `${count} real A1 tabs`);
  }
  const tabs = JSON.parse(internal(host, context, "tab-list")).tabs;
  const tabIds = tabs.map(tab => tab.tabId);
  await waitUntil(async () => {
    const { records } = await currentObservations(context);
    return tabIds.every(tabId => records.some(record => record.stage === "child-render-write" && record.tabId === tabId));
  }, "all real A1 child renderers", childStartupTimeoutMs);
  await delay(500);
  return tabIds;
}

function currentEngineBaselines(records, tabIds) {
  return Object.fromEntries(tabIds.map(tabId => [tabId, Math.max(0, ...records
    .filter(record => record.tabId === tabId && record.stage === "engine-delivery")
    .map(record => record.eventSequence))]));
}

async function runScenarios(attach, context, provider, tabIds) {
  const results = [];
  let scenarioNumber = 0;
  for (const order of firstOrders) {
    for (let initialView = 0; initialView < 3; initialView += 1) {
      scenarioNumber += 1;
      const id = `s-${String(scenarioNumber).padStart(2, "0")}`;
      const scenario = provider.scenario(id, order);
      const before = await currentObservations(context);
      if (before.faults.length > 0) throw new Error(before.faults.join("; "));
      const engineBaselines = currentEngineBaselines(before.records, tabIds);
      const startedUnixUs = epochUs();
      for (let tabIndex = 0; tabIndex < 3; tabIndex += 1) {
        await selectTab(attach, context, tabIndex, tabIds[tabIndex]);
        attach.terminal.write(`scenario=${id};tab=${tabIndex}`);
        attach.terminal.write("\r");
        await waitUntil(() => scenario.requests.has(tabIndex), `${id} tab ${tabIndex + 1} provider request`);
      }
      await withTimeout(scenario.requestsReady, `${id} provider requests`);
      await selectTab(attach, context, initialView, tabIds[initialView]);
      const partialOutputCheckpoint = attach.checkpoint();
      scenario.start();
      await withTimeout(scenario.partialReady, `${id} unfinished partials`);
      // Invariant: leave each turn unfinished while every retained surface is activated and painted.
      // The initially viewed tab can finish its paint before this loop and selecting it is a no-op,
      // so all checks use the checkpoint immediately before partial output became possible.
      for (let tabIndex = 0; tabIndex < 3; tabIndex += 1) {
        await selectTab(attach, context, tabIndex, tabIds[tabIndex]);
        try {
          await attach.waitForOutput(`P${id.replaceAll("-", "").slice(-2)}T${tabIndex + 1}C11`, `${id} tab ${tabIndex + 1} partial surface`, partialOutputCheckpoint);
        } catch (error) {
          await writeFile(join(context.root, "attach-debug.bin"), attach.output(), "latin1");
          throw error;
        }
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

async function beginThreeTabScenario(attach, context, provider, tabIds, id, order) {
  const scenario = provider.scenario(id, order);
  for (let tabIndex = 0; tabIndex < 3; tabIndex += 1) {
    await selectTab(attach, context, tabIndex, tabIds[tabIndex]);
    attach.terminal.write(`scenario=${id};tab=${tabIndex}`);
    attach.terminal.write("\r");
    await waitUntil(() => scenario.requests.has(tabIndex), `${id} tab ${tabIndex + 1} provider request`);
  }
  await withTimeout(scenario.requestsReady, `${id} provider requests`);
  return scenario;
}

async function runSlowTransportVariant(attach, context, provider, tabIds) {
  const id = "slow-socket-outer-sink";
  const delayedTabId = tabIds[1];
  const delayMarker = join(context.controls, `${delayedTabId}.attach-receipt.delay`);
  const scenario = await beginThreeTabScenario(attach, context, provider, tabIds, id, [2, 0, 1]);
  // Invariant: attach receives surfaces for the viewed tab. Select the delayed target before the
  // provider starts so its receipt is guaranteed by topology rather than a stale-selection race.
  await selectTab(attach, context, 1, delayedTabId);
  const startedUnixUs = epochUs();
  await writeFile(delayMarker, "", { mode: 0o600 });
  scenario.start();
  let paused = false;
  try {
    await withTimeout(scenario.partialReady, `${id} unfinished partials`);
    attach.terminal.pause();
    paused = true;
    const pressuredUnixUs = epochUs();
    const finalOutputCheckpoint = attach.checkpoint();
    scenario.release();
    await delay(900);
    const pressured = await currentObservations(context);
    if (pressured.faults.length > 0) throw new Error(pressured.faults.join("; "));
    const hiddenProgress = Object.fromEntries(tabIds.map(tabId => {
      const records = pressured.records.filter(record => record.tabId === tabId
        && record.timestampUnixUs >= pressuredUnixUs);
      return [tabId, {
        childWrites: records.filter(record => record.stage === "child-render-write").length,
        ptyIngestions: records.filter(record => record.stage === "pty-ingest").length,
        holderCommits: records.filter(record => record.stage === "holder-commit").length,
      }];
    }));
    const faults = [];
    for (const [tabId, counts] of Object.entries(hiddenProgress)) {
      if (counts.childWrites < 3 || counts.ptyIngestions < 3 || counts.holderCommits < 3) {
        faults.push(`${id}: ${tabId} did not progress under transport pressure`);
      }
    }
    const delayedReceipts = pressured.records.filter(record => record.tabId === delayedTabId
      && record.stage === "attach-receipt" && record.timestampUnixUs >= startedUnixUs).length;
    if (delayedReceipts < 1) faults.push(`${id}: delayed attach received no surface`);
    attach.terminal.resume();
    paused = false;
    await rm(delayMarker, { force: true });
    await withTimeout(scenario.completed, `${id} completion`);
    for (let tabIndex = 0; tabIndex < 3; tabIndex += 1) {
      await selectTab(attach, context, tabIndex, tabIds[tabIndex]);
      await attach.waitForOutput(`P${id.replaceAll("-", "").slice(-2)}T${tabIndex + 1}C59`,
        `${id} tab ${tabIndex + 1} final output`, finalOutputCheckpoint);
    }
    const report = { id, socketReceiptDelayMs: 35, outerSinkPauseMs: 900, delayedTabId,
      delayedReceipts, hiddenProgress, finalOutput: true, faults, passed: faults.length === 0 };
    if (!report.passed) throw new Error(faults.join("; "));
    return report;
  } finally {
    if (paused) attach.terminal.resume();
    await rm(delayMarker, { force: true });
    scenario.releaseEngine();
    scenario.release();
  }
}

async function runInteractionPressureVariant(attach, context, provider, tabIds) {
  const id = "switch-input-overlay-resize";
  const scenario = await beginThreeTabScenario(attach, context, provider, tabIds, id, [1, 0, 2]);
  const before = await currentObservations(context);
  if (before.faults.length > 0) throw new Error(before.faults.join("; "));
  const geometryBaselines = Object.fromEntries(tabIds.map(tabId => [tabId, Math.max(0, ...before.records
    .filter(record => record.tabId === tabId && record.stage === "holder-commit")
    .map(record => record.geometryGeneration))]));
  const startedUnixUs = epochUs();
  const partialOutputCheckpoint = attach.checkpoint();
  scenario.start();
  try {
    await withTimeout(scenario.partialReady, `${id} unfinished partials`);
    const sizes = [[96, 28], [104, 32], [100, 30]];
    const appliedSizes = [];
    let switches = 0;
    let overlays = 0;
    const geometryGenerations = { ...geometryBaselines };
    for (let round = 0; round < sizes.length; round += 1) {
      const [columns, rows] = sizes[round];
      for (let tabIndex = 0; tabIndex < 3; tabIndex += 1) {
        const tabId = tabIds[tabIndex];
        await selectTab(attach, context, tabIndex, tabId);
        const priorGeneration = geometryGenerations[tabId];
        const resizedUnixUs = epochUs();
        const tabColumns = columns + tabIndex;
        attach.terminal.resize(tabColumns, rows);
        appliedSizes.push({ tabId, columns: tabColumns, rows });
        await waitUntil(async () => {
          const current = await currentObservations(context);
          const committed = current.records
            .filter(record => record.tabId === tabId && record.stage === "holder-commit"
              && record.timestampUnixUs >= resizedUnixUs
              && record.geometryGeneration > priorGeneration)
            .map(record => record.geometryGeneration);
          if (committed.length === 0) return false;
          geometryGenerations[tabId] = Math.max(...committed);
          return true;
        }, `${id} tab ${tabIndex + 1} round ${round + 1} resize commit`);
        switches += 1;
        attach.terminal.write("\x1b[D\x1b[C");
        attach.terminal.write("\x1bOQ");
        overlays += 1;
        await delay(35);
        attach.terminal.write("\x1b");
      }
    }
    for (let tabIndex = 0; tabIndex < 3; tabIndex += 1) {
      await selectTab(attach, context, tabIndex, tabIds[tabIndex]);
      await attach.waitForOutput(`P${id.replaceAll("-", "").slice(-2)}T${tabIndex + 1}C11`,
        `${id} tab ${tabIndex + 1} partial output`, partialOutputCheckpoint);
    }
    const partial = await currentObservations(context);
    const faults = [...partial.faults];
    for (const tabId of tabIds) {
      const records = partial.records.filter(record => record.tabId === tabId
        && record.timestampUnixUs >= startedUnixUs);
      if (!records.some(record => record.stage === "outer-paint")) {
        faults.push(`${id}: ${tabId} was not painted during interaction pressure`);
      }
    }
    const finalOutputCheckpoint = attach.checkpoint();
    scenario.release();
    await withTimeout(scenario.completed, `${id} completion`);
    for (let tabIndex = 0; tabIndex < 3; tabIndex += 1) {
      await selectTab(attach, context, tabIndex, tabIds[tabIndex]);
      await attach.waitForOutput(`P${id.replaceAll("-", "").slice(-2)}T${tabIndex + 1}C59`,
        `${id} tab ${tabIndex + 1} final output`, finalOutputCheckpoint);
    }
    const report = { id, switches, navigationInputs: switches * 2, overlays,
      sizes: appliedSizes, perViewResizeCommits: true,
      partialOutput: true, finalOutput: true, faults, passed: faults.length === 0 };
    if (!report.passed) throw new Error(faults.join("; "));
    return report;
  } finally {
    scenario.releaseEngine();
    scenario.release();
    try { attach.terminal.resize(100, 30); } catch { /* Invariant: cleanup cannot mask the verdict. */ }
  }
}

async function runDetachedReconnectVariant(spawnPty, host, attach, context, provider, tabIds) {
  const id = "detached-server-reconnect";
  const scenario = provider.scenario(id, [1, 2, 0]);
  for (let tabIndex = 0; tabIndex < 3; tabIndex += 1) {
    await selectTab(attach, context, tabIndex, tabIds[tabIndex]);
    attach.terminal.write(`scenario=${id};tab=${tabIndex}`);
    attach.terminal.write("\r");
    await waitUntil(() => scenario.requests.has(tabIndex), `${id} tab ${tabIndex + 1} provider request`);
  }
  await withTimeout(scenario.requestsReady, `${id} provider requests`);
  scenario.start();
  await withTimeout(scenario.partialReady, `${id} unfinished partials`);
  const status = tabsCommand(host, context, "host-status");
  const serverPid = status?.result?.pid;
  const detachedUnixUs = epochUs();
  stopAttach(attach);
  terminateExactProcess(serverPid, status?.result?.serverId);
  scenario.release();
  try {
    await withTimeout(scenario.completed, `${id} detached completion`, childStartupTimeoutMs);
    await waitUntil(async () => {
      const observations = await currentObservations(context);
      return tabIds.every(tabId => {
        const records = observations.records.filter(record => record.tabId === tabId
          && record.timestampUnixUs >= detachedUnixUs);
        return records.some(record => record.stage === "child-render-write")
          && records.some(record => record.stage === "pty-ingest")
          && records.some(record => record.stage === "holder-commit");
      });
    }, `${id} hidden progress`, childStartupTimeoutMs);
    await waitUntil(() => {
      try {
        const next = tabsCommand(host, context, "host-status");
        return next.host === "running" && next.result?.pid !== serverPid;
      } catch { return false; }
    }, `${id} replacement server`, childStartupTimeoutMs);
    const replacement = await createAttach(spawnPty, host, context);
    for (let tabIndex = 0; tabIndex < 3; tabIndex += 1) {
      await selectTab(replacement, context, tabIndex, tabIds[tabIndex]);
      await replacement.waitForOutput(`P${id.replaceAll("-", "").slice(-2)}T${tabIndex + 1}C59`,
        `${id} tab ${tabIndex + 1} retained final output`);
    }
    const replacementStatus = tabsCommand(host, context, "host-status");
    return {
      attach: replacement,
      report: { id, serverReplaced: replacementStatus.result?.pid !== serverPid,
        hiddenProgress: true, retainedFinalOutput: true, passed: true },
    };
  } finally {
    scenario.releaseEngine();
    scenario.release();
  }
}

async function compareDirectAndResidentTemporalState(spawnPty, host, attach, context, provider, tabIds) {
  const id = "temporal-parity";
  const marker = `P${id.replaceAll("-", "").slice(-2)}T1C`;
  const directScenario = provider.scenario(id, [0], 1);
  const direct = await createDirect(spawnPty, context);
  let directOutput;
  try {
    direct.terminal.write(`scenario=${id};tab=0`);
    direct.terminal.write("\r");
    await waitUntil(() => directScenario.requests.has(0), `${id} direct provider request`);
    directScenario.start();
    await withTimeout(directScenario.partialReady, `${id} direct unfinished partial`);
    await waitUntil(() => direct.output().includes(`${marker}11`), `${id} direct intermediate output`,
      scenarioTimeoutMs, direct.waiters);
    await delay(150);
    directOutput = direct.output();
    directScenario.release();
    await withTimeout(directScenario.completed, `${id} direct completion`);
  } finally {
    directScenario.releaseEngine();
    directScenario.release();
    try { stopAttach(direct); } catch { /* Invariant: direct fixture cleanup cannot mask its verdict. */ }
  }

  const residentScenario = provider.scenario(id, [0], 1);
  await selectTab(attach, context, 0, tabIds[0]);
  attach.terminal.write(`scenario=${id};tab=0`);
  attach.terminal.write("\r");
  await waitUntil(() => residentScenario.requests.has(0), `${id} resident provider request`);
  residentScenario.start();
  await withTimeout(residentScenario.partialReady, `${id} resident unfinished partial`);
  await waitUntil(() => attach.output().includes(`${marker}11`), `${id} resident intermediate output`);
  await delay(150);
  const residentOutput = attach.output();
  residentScenario.release();
  await withTimeout(residentScenario.completed, `${id} resident completion`);

  const addon = createRequire(import.meta.url)(resolve(host));
  if (typeof addon.inspectTerminalSnapshot !== "function") {
    throw new Error("exact native artifact omitted temporal snapshot inspection");
  }
  const directSnapshot = addon.inspectTerminalSnapshot(Buffer.from(directOutput, "utf8"), 100, 29, 0, marker);
  const residentSnapshot = addon.inspectTerminalSnapshot(Buffer.from(residentOutput, "utf8"), 100, 30, 1, marker);
  // Protocol: attach terminates kitty negotiation and selects its own outer flags rather than
  // forwarding the child's value. ConPTY also consumes mouse tracking before capture. Native mode
  // and input-fidelity contracts cover those owned boundaries; observable child modes stay here.
  const transportHiddenFields = [
    "kittyKeyboardFlags",
    ...(process.platform === "win32" ? ["mouseTracking"] : []),
  ];
  const comparableFields = [
    "markerDigest", "markerOccurrences", "cursorColumn", "cursorRow", "cursorVisible", "cursorStyle",
    "cursorBlink", "mouseTracking", "focusEvents", "bracketedPaste", "kittyKeyboardFlags", "alternateScreen",
  ].filter(field => !transportHiddenFields.includes(field));
  const mismatches = comparableFields.filter(field => directSnapshot[field] !== residentSnapshot[field]);
  const transactionFaults = [];
  for (const [name, snapshot] of [["direct", directSnapshot], ["resident", residentSnapshot]]) {
    if (snapshot.schema !== productIdentity.evidence.terminalTemporalSnapshotSchema) {
      transactionFaults.push(`${name} snapshot used the wrong schema`);
    }
    if (snapshot.markerOccurrences < 12) transactionFaults.push(`${name} snapshot omitted intermediate marker cells`);
    if (snapshot.synchronizedBegins !== snapshot.synchronizedEnds || snapshot.openSynchronizedOutput) {
      transactionFaults.push(`${name} snapshot ended inside synchronized output`);
    }
    if (snapshot.markerCountRegressions !== 0) transactionFaults.push(`${name} outer transaction cleared intermediate content`);
  }
  const faults = [
    ...mismatches.map(field => `direct/resident temporal ${field} mismatch (direct=${JSON.stringify(directSnapshot[field])}, resident=${JSON.stringify(residentSnapshot[field])})`),
    ...transactionFaults,
  ];
  return {
    id,
    geometry: { childColumns: 100, childRows: 29, residentStripRows: 1 },
    markerOccurrences: directSnapshot.markerOccurrences,
    semanticDigest: directSnapshot.markerDigest,
    directTransactions: { begins: directSnapshot.synchronizedBegins, ends: directSnapshot.synchronizedEnds,
      resets: directSnapshot.synchronizedResets },
    residentTransactions: { begins: residentSnapshot.synchronizedBegins, ends: residentSnapshot.synchronizedEnds,
      resets: residentSnapshot.synchronizedResets },
    compared: comparableFields,
    transportHiddenFields,
    faults,
    passed: faults.length === 0,
  };
}

async function characterizeFragmentedTransactions(attach, context, provider, tabIds) {
  const id = "fragmented-synchronized-output";
  const targetIndex = 1;
  const targetTabId = tabIds[targetIndex];
  const scenario = provider.scenario(id, [2, 0, 1]);
  for (let tabIndex = 0; tabIndex < 3; tabIndex += 1) {
    await selectTab(attach, context, tabIndex, tabIds[tabIndex]);
    attach.terminal.write(`scenario=${id};tab=${tabIndex}`);
    attach.terminal.write("\r");
    await waitUntil(() => scenario.requests.has(tabIndex), `${id} tab ${tabIndex + 1} provider request`);
  }
  await withTimeout(scenario.requestsReady, `${id} provider requests`);
  const before = await currentObservations(context);
  if (before.faults.length > 0) throw new Error(before.faults.join("; "));
  const engineBaselines = currentEngineBaselines(before.records, tabIds);
  const marker = join(context.controls, `${targetTabId}.child-render-fragments.enable`);
  await writeFile(marker, "", { mode: 0o600 });
  const startedUnixUs = epochUs();
  const partialOutputCheckpoint = attach.checkpoint();
  scenario.start();
  try {
    await withTimeout(scenario.partialReady, `${id} unfinished partials`);
    for (let tabIndex = 0; tabIndex < 3; tabIndex += 1) {
      await selectTab(attach, context, tabIndex, tabIds[tabIndex]);
      await attach.waitForOutput(`P${id.replaceAll("-", "").slice(-2)}T${tabIndex + 1}C11`,
        `${id} tab ${tabIndex + 1} partial output`, partialOutputCheckpoint);
    }
    await waitUntil(async () => {
      const current = await currentObservations(context);
      const target = current.records.filter(record => record.tabId === targetTabId
        && record.timestampUnixUs >= startedUnixUs);
      return target.filter(record => record.stage === "child-render-write"
        && record.eventSequence > engineBaselines[targetTabId]
        && record.transactionKind === "synchronized-output" && record.fragmentCount > 1).length >= 3
        && target.filter(record => record.stage === "pty-ingest").length >= 3
        && target.filter(record => record.stage === "holder-commit" && record.eventKind === "complete").length >= 3;
    }, `${id} fragmented transaction evidence`);
    const barrierUnixUs = epochUs();
    const observed = await currentObservations(context);
    if (observed.faults.length > 0) throw new Error(observed.faults.join("; "));
    const target = observed.records.filter(record => record.tabId === targetTabId
      && record.timestampUnixUs >= startedUnixUs && record.timestampUnixUs <= barrierUnixUs);
    const writes = target.filter(record => record.stage === "child-render-write"
      && record.eventSequence > engineBaselines[targetTabId]
      && record.transactionKind === "synchronized-output" && record.fragmentCount > 1);
    const pty = target.filter(record => record.stage === "pty-ingest");
    const commits = target.filter(record => record.stage === "holder-commit");
    const recoveryCommits = commits.filter(record => record.eventKind === "recovery");
    const result = {
      id,
      targetTabId,
      transaction: "DEC-private-mode-2026",
      fragmentedChildWrites: writes.length,
      maximumFragmentsPerWrite: Math.max(0, ...writes.map(record => record.fragmentCount)),
      ptyIngestions: pty.length,
      completeHolderCommits: commits.filter(record => record.eventKind === "complete").length,
      recoveryCommits: recoveryCommits.length,
      passed: writes.length >= 3 && pty.length >= 3
        && commits.filter(record => record.eventKind === "complete").length >= 3
        && recoveryCommits.length === 0,
    };
    if (!result.passed) throw new Error(`${id}: fragmented synchronized output did not commit coherently`);
    await rm(marker, { force: true });
    const finalOutputCheckpoint = attach.checkpoint();
    scenario.release();
    await withTimeout(scenario.completed, `${id} completion`);
    await waitUntil(async () => {
      const next = await currentObservations(context);
      return tabIds.every(tabId => next.records.some(record => record.tabId === tabId
        && record.stage === "engine-delivery" && record.eventKind === "agent_settled"
        && record.timestampUnixUs >= barrierUnixUs));
    }, `${id} engine settlement`);
    for (let tabIndex = 0; tabIndex < 3; tabIndex += 1) {
      await selectTab(attach, context, tabIndex, tabIds[tabIndex]);
      await attach.waitForOutput(`P${id.replaceAll("-", "").slice(-2)}T${tabIndex + 1}C59`,
        `${id} tab ${tabIndex + 1} final output`, finalOutputCheckpoint);
    }
    return { ...result, finalOutput: true };
  } finally {
    await rm(marker, { force: true });
    scenario.releaseEngine();
    scenario.release();
  }
}

async function runStoppedStageControls(attach, context, provider, tabIds) {
  const controls = [];
  const targetIndex = 1;
  const targetTabId = tabIds[targetIndex];
  for (const [controlIndex, stage] of [
    "engine-delivery", "child-render-write", "holder-commit", "outer-paint",
  ].entries()) {
    const id = `control-${controlIndex + 1}-${stage}`;
    const scenario = provider.scenario(id, [0, 1, 2]);
    if (stage === "engine-delivery") scenario.blockedEngineTab = targetIndex;
    for (let tabIndex = 0; tabIndex < 3; tabIndex += 1) {
      await selectTab(attach, context, tabIndex, tabIds[tabIndex]);
      attach.terminal.write(`scenario=${id};tab=${tabIndex}`);
      attach.terminal.write("\r");
      await waitUntil(() => scenario.requests.has(tabIndex), `${id} tab ${tabIndex + 1} provider request`);
    }
    await withTimeout(scenario.requestsReady, `${id} provider requests`);
    await selectTab(attach, context, targetIndex, targetTabId);
    const before = await currentObservations(context);
    if (before.faults.length > 0) throw new Error(before.faults.join("; "));
    const engineBaselines = currentEngineBaselines(before.records, tabIds);
    const marker = stage === "engine-delivery" ? null : join(context.controls, `${targetTabId}.${stage}.stop`);
    if (marker !== null) await writeFile(marker, "", { mode: 0o600 });
    const startedUnixUs = epochUs();
    scenario.start();
    try {
      await waitUntil(async () => {
        const observations = await currentObservations(context);
        return evaluateStoppedStageControl(observations.records, {
          id, stage, targetTabId, tabIds, startedUnixUs, barrierUnixUs: epochUs(), engineBaselines,
        }).passed;
      }, `${id} isolated stop`);
      await delay(250);
      const barrierUnixUs = epochUs();
      const stopped = await currentObservations(context);
      if (stopped.faults.length > 0) throw new Error(stopped.faults.join("; "));
      const result = evaluateStoppedStageControl(stopped.records, {
        id, stage, targetTabId, tabIds, startedUnixUs, barrierUnixUs, engineBaselines,
      });
      if (!result.passed) throw new Error(result.faults.join("; "));
      if (marker !== null) await rm(marker, { force: true });
      scenario.releaseEngine();
      await withTimeout(scenario.partialReady, `${id} released partials`);
      const finalOutputCheckpoint = attach.checkpoint();
      scenario.release();
      await withTimeout(scenario.completed, `${id} completion`);
      await waitUntil(async () => {
        const next = await currentObservations(context);
        return tabIds.every(tabId => next.records.some(record => record.tabId === tabId
          && record.stage === "engine-delivery" && record.eventKind === "agent_settled"
          && record.timestampUnixUs >= barrierUnixUs));
      }, `${id} engine settlement`);
      for (let tabIndex = 0; tabIndex < 3; tabIndex += 1) {
        await selectTab(attach, context, tabIndex, tabIds[tabIndex]);
        await attach.waitForOutput(`P${id.replaceAll("-", "").slice(-2)}T${tabIndex + 1}C59`,
          `${id} tab ${tabIndex + 1} final output`, finalOutputCheckpoint);
      }
      controls.push({ ...result, finalOutput: true });
    } finally {
      if (marker !== null) await rm(marker, { force: true });
      scenario.releaseEngine();
      scenario.release();
    }
  }
  return controls;
}

async function writeFixtureProfile(profile, baseUrl) {
  await mkdir(profile, { recursive: true });
  await writeFile(join(profile, "models.json"), `${JSON.stringify({
    providers: { fixture: { baseUrl, api: "openai-completions", apiKey: "fixture", models: [{
      id: "parallel-stream", name: "Parallel stream fixture", contextWindow: 32_000, maxTokens: 4_096,
    }] } },
  }, null, 2)}\n`);
  const fallbackAgentDir = join(profile, ".pi", "agent");
  await mkdir(fallbackAgentDir, { recursive: true });
  await writeFile(join(profile, "auth.json"), "{}\n");
  await writeFile(join(fallbackAgentDir, "auth.json"), "{}\n");
  await writeFile(join(profile, "settings.json"), `${JSON.stringify({
    defaultProvider: "fixture",
    defaultModel: "parallel-stream",
    defaultProjectTrust: "always",
    promptSuggestions: false,
    lastChangelogVersion: "0.2.7-dev",
  }, null, 2)}\n`);
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
    directProfile: join(root, "direct-profile"),
    directData: join(root, "direct-data"),
    directRuntime: join(root, "direct-runtime"),
    observations: join(root, "observations"),
    controls: join(root, "controls"),
    release: resolve("."),
    runId,
    endpoint: process.platform === "win32" ? `\\\\.\\pipe\\a1-resident-parallel-${process.pid}-${Date.now()}` : join(root, "resident.sock"),
  };
  const provider = new LoopbackProvider();
  const baseUrl = await provider.start();
  context.environment = {
    ...process.env,
    TERM: "xterm-256color",
    LAUNCH_CONTEXT_PROFILE: "a1",
    LAUNCH_CONTEXT_MODE: "tabs",
    LAUNCH_CONTEXT_RELEASE_ROOT: context.release,
    HOME: context.profile,
    USERPROFILE: context.profile,
    [tabsEndpointEnvironment]: context.endpoint,
    [productIdentity.environment.profileHome]: context.profile,
    [productIdentity.environment.configDir]: context.profile,
    [productIdentity.environment.dataDir]: context.data,
    [productIdentity.environment.runtimeDir]: context.runtime,
    PI_CODING_AGENT_DIR: context.profile,
    [productIdentity.environment.skipVersionCheck]: "1",
    [productIdentity.environment.residentFixtureControlDir]: context.controls,
    [productIdentity.environment.residentProgressObservationDir]: context.observations,
    [productIdentity.environment.residentProgressRunId]: runId,
  };
  for (const directory of [context.profile, context.data, context.runtime, context.directProfile,
    context.directData, context.directRuntime, context.observations, context.controls]) {
    await mkdir(directory, { recursive: true });
    if (process.platform !== "win32") await chmod(directory, 0o700);
  }
  await writeFixtureProfile(context.profile, baseUrl);
  await writeFixtureProfile(context.directProfile, baseUrl);
  let attach;
  let tabIds = [];
  try {
    run(host, ["server", "--detach", "--profile", context.profile, "--data-dir", context.data, "--runtime-dir", context.runtime], {
      cwd: root, env: context.environment,
    });
    attach = await createAttach(spawn, host, context);
    tabIds = await createRealTabs(host, context);
    const temporalParity = await compareDirectAndResidentTemporalState(spawn, host, attach, context, provider, tabIds);
    if (!temporalParity.passed) throw new Error(temporalParity.faults.join("; "));
    const scenarios = await runScenarios(attach, context, provider, tabIds);
    const slowTransport = await runSlowTransportVariant(attach, context, provider, tabIds);
    const interactionPressure = await runInteractionPressureVariant(attach, context, provider, tabIds);
    const detachedReconnect = await runDetachedReconnectVariant(spawn, host, attach, context, provider, tabIds);
    attach = detachedReconnect.attach;
    const transactionCharacterization = await characterizeFragmentedTransactions(attach, context, provider, tabIds);
    const stoppedStageControls = await runStoppedStageControls(attach, context, provider, tabIds);
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
      fixture: { scenarios: scenarios.length, firstResponseOrders: firstOrders.length, initialViews: 3,
        temporalParityComparisons: 1, slowTransportVariants: 1, interactionPressureVariants: 1,
        detachedReconnectVariants: 1, transactionCharacterizations: 1,
        stoppedStageControls: stoppedStageControls.length, chunksPerTurn: 60 },
      tabs: tabIds,
      temporalParity,
      scenarios,
      slowTransport,
      interactionPressure,
      detachedReconnect: detachedReconnect.report,
      transactionCharacterization,
      stoppedStageControls,
      latency: latency.perTab,
      requests: provider.requests,
      observations: { files: observations.files.length, records: observations.records.length, faults: observations.faults },
      faults,
      passed: faults.length === 0 && temporalParity.passed && scenarios.every(scenario => scenario.passed)
        && slowTransport.passed && interactionPressure.passed && detachedReconnect.report.passed
        && transactionCharacterization.passed && transactionCharacterization.finalOutput
        && stoppedStageControls.every(control => control.passed && control.finalOutput),
    };
  } finally {
    for (const tabId of tabIds) {
      try { internal(host, context, "tab-close", ["--tab", tabId]); } catch { /* Invariant: a tab that already exited needs no cleanup. */ }
    }
    try { if (attach !== undefined) stopAttach(attach); } catch { /* Invariant: cleanup never masks the fixture result. */ }
    try {
      run(host, ["tabs", "host-stop", "--profile", context.profile, "--data-dir", context.data, "--runtime-dir", context.runtime], {
        env: context.environment,
      });
    } catch { /* Invariant: a host that already stopped leaves nothing to stop. */ }
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
