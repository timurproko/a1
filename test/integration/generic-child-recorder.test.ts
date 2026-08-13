import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
const recorder = resolve("test/physical-host/generic-child-recorder.mjs");
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("standalone generic child recorder launched directly", () => {
  it("records externally identified physical actions and exact raw child bytes", async () => {
    const root = await fixtureRoot();
    const log = resolve(root, "observations.jsonl");
    const child = launch(log);
    await eventInLog(log, "recorder-ready");

    action(child, { type: "action", id: "ctrl-c-down", kind: "key-down", dispatchedAtNs: "100", parameters: { physicalKey: "C", modifiers: ["Control"] } });
    await eventInLog(log, "physical-action-marker", event => event.actionId === "ctrl-c-down");
    child.stdin.write(Buffer.from([0x03]));
    await eventInLog(log, "input-bytes", event => event.actionId === "ctrl-c-down");

    action(child, { type: "action", id: "utf8-text", kind: "text", dispatchedAtNs: "200", parameters: { source: "os-text-input" } });
    await eventInLog(log, "physical-action-marker", event => event.actionId === "utf8-text");
    const bytes = Buffer.from("e\u0301🙂\u0000", "utf8");
    child.stdin.write(bytes);
    await eventInLog(log, "input-bytes", event => event.actionId === "utf8-text");

    action(child, { type: "action", id: "resize-1", kind: "resize", dispatchedAtNs: "300", parameters: { columns: 132, rows: 43 } });
    await eventInLog(log, "terminal-size", event => event.actionId === "resize-1");
    action(child, { type: "finish", exitCode: 0 });
    await exited(child);

    const events = await eventsFrom(log);
    expect(events.find(event => event.kind === "input-bytes" && event.actionId === "ctrl-c-down")).toMatchObject({
      physicalActionKind: "key-down", dataHex: "03", dataBase64: "Aw==", byteLength: 1,
    });
    expect(events.find(event => event.kind === "input-bytes" && event.actionId === "utf8-text")).toMatchObject({
      physicalActionKind: "text", dataHex: bytes.toString("hex"), dataBase64: bytes.toString("base64"), byteLength: bytes.length,
    });
    expect(events.find(event => event.kind === "terminal-size" && event.actionId === "resize-1")).toBeDefined();
    expect(events.at(-1)).toMatchObject({ kind: "recorder-exit", exitCode: 0, reason: "action-channel" });
    expect(events.map(event => event.sequence)).toEqual(events.map((_, index) => index));
  });

  it("emits configured output protocols and queries byte-for-byte and correlates responses", async () => {
    const root = await fixtureRoot();
    const log = resolve(root, "observations.jsonl");
    const output = Buffer.from("plain e\u0301 🙂\u001b[31mred\u001b[0m\n", "utf8");
    const query = Buffer.from("\u001b[6n", "binary");
    const plan = resolve(root, "plan.json");
    await writeFile(plan, JSON.stringify({ schemaVersion: 1, steps: [
      { id: "render-corpus", kind: "output", dataBase64: output.toString("base64") },
      { id: "cursor-position", kind: "query", dataBase64: query.toString("base64") },
    ] }));
    const child = launch(log, plan);
    const stdout: Buffer[] = [];
    child.stdout.on("data", chunk => stdout.push(Buffer.from(chunk)));
    await eventInLog(log, "recorder-ready");

    action(child, { type: "action", id: "query-response-1", kind: "query-response", dispatchedAtNs: "400", parameters: { queryId: "cursor-position" } });
    await eventInLog(log, "physical-action-marker", event => event.actionId === "query-response-1");
    const response = Buffer.from("\u001b[12;34R", "binary");
    child.stdin.write(response);
    await eventInLog(log, "input-bytes", event => event.actionId === "query-response-1");
    action(child, { type: "query-complete", id: "cursor-position" });
    action(child, { type: "finish", exitCode: 0 });
    await exited(child);

    expect(Buffer.concat(stdout)).toEqual(Buffer.concat([output, query]));
    const events = await eventsFrom(log);
    expect(events.find(event => event.kind === "output-protocol-emitted")).toMatchObject({ id: "render-corpus", dataBase64: output.toString("base64") });
    expect(events.find(event => event.kind === "terminal-query-emitted")).toMatchObject({ id: "cursor-position", dataBase64: query.toString("base64") });
    expect(events.find(event => event.kind === "input-bytes")).toMatchObject({
      actionId: "query-response-1", pendingQueryIds: ["cursor-position"], dataHex: response.toString("hex"),
    });
    expect(events.find(event => event.kind === "query-completed")).toMatchObject({ queryId: "cursor-position" });
  });

  it("records a directly delivered process signal and exact exit outcome", async () => {
    const root = await fixtureRoot();
    const log = resolve(root, "observations.jsonl");
    const child = launch(log);
    await eventInLog(log, "recorder-ready");
    action(child, { type: "action", id: "terminate", kind: "signal", dispatchedAtNs: "500", parameters: { signal: "SIGTERM" } });
    await eventInLog(log, "physical-action-marker", event => event.actionId === "terminate");
    child.kill("SIGTERM");
    const outcome = await exited(child);

    const events = await eventsFrom(log);
    if (process.platform === "win32") {
      // Windows termination does not dispatch a catchable SIGTERM event to Node;
      // the independent launcher outcome remains the authoritative evidence.
      expect(outcome).toMatchObject({ code: null, signal: "SIGTERM" });
      expect(events.find(event => event.kind === "physical-action-marker")).toMatchObject({ actionId: "terminate" });
    } else {
      expect(outcome).toMatchObject({ code: 143, signal: null });
      expect(events.find(event => event.kind === "signal")).toMatchObject({ signal: "SIGTERM", actionId: "terminate" });
      expect(events.at(-1)).toMatchObject({ kind: "recorder-exit", exitCode: 143, reason: "signal:SIGTERM" });
    }
  });
});

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "addone-child-recorder-"));
  roots.push(root);
  return root;
}

type RecorderChild = ChildProcessWithoutNullStreams & { readonly actionStream: NodeJS.WritableStream };

function launch(log: string, plan?: string): RecorderChild {
  const arguments_ = [recorder, "--log", log, "--action-fd", "3", ...(plan ? ["--plan", plan] : [])];
  const child = spawn(process.execPath, arguments_, { stdio: ["pipe", "pipe", "pipe", "pipe"], windowsHide: true }) as ChildProcessWithoutNullStreams;
  const actionStream = (child as unknown as { stdio: Array<NodeJS.ReadableStream | NodeJS.WritableStream | null> }).stdio[3];
  if (!actionStream || !("write" in actionStream)) throw new Error("recorder action stream was not created");
  return Object.assign(child, { actionStream });
}

function action(child: RecorderChild, value: object): void {
  child.actionStream.write(`${JSON.stringify(value)}\n`);
}

async function eventInLog(path: string, kind: string, predicate: (event: Record<string, unknown>) => boolean = () => true): Promise<Record<string, unknown>> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const match = (await eventsFrom(path)).find(event => event.kind === kind && predicate(event));
    if (match) return match;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 10));
  }
  throw new Error(`timed out waiting for ${kind} in ${path}`);
}

async function eventsFrom(path: string): Promise<Record<string, any>[]> {
  try {
    const source = await readFile(path, "utf8");
    return source.trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

async function exited(child: ReturnType<typeof launch>): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return await new Promise((resolvePromise, rejectPromise) => {
    child.once("error", rejectPromise);
    child.once("exit", (code, signal) => resolvePromise({ code, signal }));
  });
}
