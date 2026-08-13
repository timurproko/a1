#!/usr/bin/env node

import { closeSync, createReadStream, openSync, readFileSync, writeSync } from "node:fs";
import { StringDecoder } from "node:string_decoder";

const ACTION_KINDS = new Set([
  "key-down", "key-up", "key-repeat", "text", "paste", "focus", "mouse-move",
  "mouse-button", "wheel", "resize", "query-response", "signal", "exit",
]);
const options = parseArguments(process.argv.slice(2));
const logFd = openSync(options.log, "a", 0o600);
let sequence = 0;
let currentAction = null;
let finished = false;
const pendingQueries = new Set();
const textDecoder = new StringDecoder("utf8");

record("recorder-started", {
  pid: process.pid,
  parentPid: process.ppid,
  platform: process.platform,
  architecture: process.arch,
  cwd: process.cwd(),
  argv: process.argv.slice(2),
  terminal: terminalState(),
  environment: selectedEnvironment(),
});

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
  try {
    process.on(signal, () => {
      record("signal", { signal, actionId: currentAction?.id ?? null });
      finish(128 + signalNumber(signal), `signal:${signal}`);
    });
  } catch {
    // Node does not expose every signal on every supported operating system.
  }
}

try {
  process.on("SIGWINCH", () => record("terminal-size", { trigger: "SIGWINCH", actionId: currentAction?.id ?? null, ...terminalState() }));
} catch {
  // Resize is also sampled when the independent action driver sends its marker.
}

process.stdin.on("data", chunk => {
  const bytes = Buffer.from(chunk);
  const decodedText = textDecoder.write(bytes);
  record("input-bytes", {
    actionId: currentAction?.id ?? null,
    physicalActionKind: currentAction?.kind ?? null,
    pendingQueryIds: [...pendingQueries],
    byteLength: bytes.length,
    dataBase64: bytes.toString("base64"),
    dataHex: bytes.toString("hex"),
    decodedText,
  });
});
process.stdin.on("end", () => {
  const decodedText = textDecoder.end();
  if (decodedText) record("input-text-final", { decodedText });
  record("stdin-ended", {});
});
process.stdin.on("error", error => record("stdin-error", { message: error.message, code: error.code ?? null }));
process.stdin.resume();

if (options.actionFd !== null) attachActionMarkers(options.actionFd);
await emitPlan(options.plan);
record("recorder-ready", { terminal: terminalState() });

process.on("beforeExit", code => {
  if (!finished) finish(code, "before-exit");
});

function attachActionMarkers(fd) {
  const input = createReadStream(null, { fd, autoClose: false });
  let buffer = "";
  input.setEncoding("utf8");
  input.on("data", chunk => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).replace(/\r$/, "");
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      try {
        handleControl(JSON.parse(line));
      } catch (error) {
        record("action-marker-error", { message: error instanceof Error ? error.message : String(error), line });
      }
    }
  });
  input.on("end", () => record("action-channel-ended", {}));
  input.on("error", error => record("action-channel-error", { message: error.message, code: error.code ?? null }));
}

function handleControl(value) {
  if (!value || typeof value !== "object" || typeof value.type !== "string") throw new Error("control record must be an object with a type");
  if (value.type === "action") {
    if (typeof value.id !== "string" || !value.id || typeof value.kind !== "string" || !ACTION_KINDS.has(value.kind)) {
      throw new Error("action marker has an invalid id or kind");
    }
    currentAction = { id: value.id, kind: value.kind };
    record("physical-action-marker", {
      actionId: value.id,
      physicalActionKind: value.kind,
      dispatchedAtNs: typeof value.dispatchedAtNs === "string" ? value.dispatchedAtNs : null,
      parameters: value.parameters && typeof value.parameters === "object" ? value.parameters : {},
    });
    if (value.kind === "resize") record("terminal-size", { trigger: "action-marker", actionId: value.id, ...terminalState() });
    return;
  }
  if (value.type === "query-complete") {
    if (typeof value.id !== "string") throw new Error("query completion requires an id");
    pendingQueries.delete(value.id);
    record("query-completed", { queryId: value.id, actionId: currentAction?.id ?? null });
    return;
  }
  if (value.type === "checkpoint") {
    record("checkpoint", { id: typeof value.id === "string" ? value.id : null, actionId: currentAction?.id ?? null });
    return;
  }
  if (value.type === "finish") {
    const exitCode = Number.isInteger(value.exitCode) && value.exitCode >= 0 && value.exitCode <= 255 ? value.exitCode : 0;
    finish(exitCode, "action-channel");
    return;
  }
  throw new Error(`unsupported control record type ${value.type}`);
}

async function emitPlan(path) {
  if (path === null) return;
  const plan = JSON.parse(readFileSync(path, "utf8"));
  if (!plan || plan.schemaVersion !== 1 || !Array.isArray(plan.steps)) throw new Error("output plan must use schemaVersion 1 with steps");
  for (const step of plan.steps) {
    if (!step || typeof step.id !== "string" || !step.id || !["output", "query"].includes(step.kind) || typeof step.dataBase64 !== "string") {
      throw new Error("output plan step is malformed");
    }
    const bytes = Buffer.from(step.dataBase64, "base64");
    if (bytes.toString("base64") !== step.dataBase64) throw new Error(`output plan step ${step.id} is not canonical base64`);
    if (step.kind === "query") pendingQueries.add(step.id);
    await new Promise((resolvePromise, rejectPromise) => process.stdout.write(bytes, error => error ? rejectPromise(error) : resolvePromise()));
    record(step.kind === "query" ? "terminal-query-emitted" : "output-protocol-emitted", {
      id: step.id,
      byteLength: bytes.length,
      dataBase64: step.dataBase64,
    });
  }
}

function finish(exitCode, reason) {
  if (finished) return;
  finished = true;
  record("recorder-exit", { exitCode, reason, terminal: terminalState() });
  closeSync(logFd);
  process.exit(exitCode);
}

function record(kind, fields) {
  const event = {
    schemaVersion: 1,
    sequence: sequence++,
    kind,
    wallTime: new Date().toISOString(),
    monotonicNs: process.hrtime.bigint().toString(),
    ...fields,
  };
  writeSync(logFd, `${JSON.stringify(event)}\n`);
}

function terminalState() {
  return {
    stdinIsTTY: Boolean(process.stdin.isTTY),
    stdoutIsTTY: Boolean(process.stdout.isTTY),
    stderrIsTTY: Boolean(process.stderr.isTTY),
    columns: Number.isInteger(process.stdout.columns) ? process.stdout.columns : null,
    rows: Number.isInteger(process.stdout.rows) ? process.stdout.rows : null,
  };
}

function selectedEnvironment() {
  return Object.fromEntries(["TERM", "COLORTERM", "WT_SESSION", "TERM_PROGRAM", "LANG", "LC_ALL"].map(name => [name, process.env[name] ?? null]));
}

function parseArguments(arguments_) {
  let log = null;
  let plan = null;
  let actionFd = null;
  for (let index = 0; index < arguments_.length; index++) {
    const value = arguments_[index];
    if (value === "--log") log = arguments_[++index] ?? null;
    else if (value === "--plan") plan = arguments_[++index] ?? null;
    else if (value === "--action-fd") {
      const parsed = Number(arguments_[++index]);
      if (!Number.isInteger(parsed) || parsed < 3) throw new Error("--action-fd must be an inherited descriptor >= 3");
      actionFd = parsed;
    } else throw new Error(`unknown argument ${value}`);
  }
  if (!log) throw new Error("Usage: generic-child-recorder.mjs --log PATH [--plan PATH] [--action-fd FD]");
  return { log, plan, actionFd };
}

function signalNumber(signal) {
  return { SIGHUP: 1, SIGINT: 2, SIGTERM: 15, SIGBREAK: 21 }[signal] ?? 1;
}
