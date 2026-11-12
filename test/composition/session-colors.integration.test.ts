import { fork, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runSessionColorCommand } from "../../src/cli/session-color.js";
import { PRODUCT_IDENTITY } from "../../src/product-identity.js";

const children: ChildProcess[] = [];
let root: string;
afterEach(async () => {
  for (const child of children.splice(0)) { if (child.exitCode === null) { const stopped = new Promise(done => child.once("exit", done)); child.kill(); await stopped; } }
  if (root) await rm(root, { recursive: true, force: true });
});
function message(child: ChildProcess): Promise<unknown> {
  return new Promise((done, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error("host IPC timed out")); }, 5000);
    const received = (value: unknown) => { cleanup(); done(value); };
    const exited = () => { cleanup(); reject(new Error("host stopped before IPC acknowledgement")); };
    function cleanup() { clearTimeout(timer); child.off("message", received); child.off("exit", exited); }
    child.once("message", received); child.once("exit", exited);
  });
}
async function host() {
  const sessionId = randomUUID(), runtimeId = randomUUID();
  const child = fork(resolve("test/composition/fixtures/session-color-host.ts"), [root, sessionId, runtimeId], { execArgv: ["--import", "tsx"], stdio: ["ignore", "ignore", "pipe", "ipc"] });
  children.push(child);
  let stderr = ""; child.stderr?.on("data", chunk => { stderr += chunk; });
  try { expect(await message(child)).toEqual({ ready: true }); } catch (error) { throw new Error(`${String(error)}: ${stderr}`); }
  return { sessionId, runtimeId, child, async send(input: object) { const result = message(child); child.send(input); return await result; } };
}
async function api(args: string[], environment: NodeJS.ProcessEnv = {}) {
  const output: string[] = [];
  const code = await runSessionColorCommand(args, { environment: { [PRODUCT_IDENTITY.environment.runtimeDir]: join(root, "runtime"), ...environment }, stdout: line => output.push(line) });
  expect(output).toHaveLength(1);
  return { code, body: JSON.parse(output[0]!) };
}

describe("external color control across independent runtimes", () => {
  it("targets current colors without peer/default propagation and honors default on replacement", async () => {
    root = await mkdtemp(join(tmpdir(), "session-color-api-"));
    const one = await host(), two = await host();
    expect(await api(["get", "--session", one.sessionId])).toEqual({ code: 0, body: { sessionId: one.sessionId, color: "blue" } });
    expect(await api(["set", "pink", "--session", one.sessionId])).toEqual({ code: 0, body: { sessionId: one.sessionId, color: "pink" } });
    expect(await api(["get", "--session", two.sessionId])).toMatchObject({ body: { color: "blue" } });
    expect(await two.send({ action: "current", color: "grey" })).toEqual({ color: "grey" });
    expect(await api(["get", "--session", two.sessionId])).toMatchObject({ body: { color: "grey" } });
    expect(await one.send({ action: "default", color: "green" })).toEqual({ color: "pink" });
    expect(await api(["set", "cyan", "--session", two.sessionId])).toMatchObject({ body: { color: "cyan" } });
    const third = await host();
    expect(await api(["get", "--session", third.sessionId])).toMatchObject({ body: { color: "green" } });
    const replacement = randomUUID();
    expect(await two.send({ action: "replace", sessionId: replacement })).toEqual({ color: "green" });
    await vi.waitFor(async () => expect(await api(["get", "--session", replacement])).toMatchObject({ code: 0, body: { color: "green" } }));
    expect(await api(["set", "orange", "--session", two.sessionId])).toMatchObject({ code: 1, body: { error: { code: "session-unavailable" } } });
    const concurrent = await Promise.all(["orange", "purple"].map(color => api(["set", color, "--session", one.sessionId])));
    expect(concurrent.map(result => result.body.color)).toEqual(["orange", "purple"]);
    expect(["orange", "purple"]).toContain((await api(["get", "--session", one.sessionId])).body.color);
    expect(await api(["get"], { PI_SESSION_ID: one.sessionId, PI_SESSION_FILE: "exact-session.jsonl", [PRODUCT_IDENTITY.environment.sessionRuntimeId]: one.runtimeId })).toMatchObject({ code: 0, body: { sessionId: one.sessionId } });
    expect(await api(["get"], { PI_SESSION_ID: one.sessionId, PI_SESSION_FILE: "exact-session.jsonl", [PRODUCT_IDENTITY.environment.sessionRuntimeId]: two.runtimeId })).toMatchObject({ code: 1 });
    expect(JSON.parse(await readFile(join(root, "profile", "settings.json"), "utf8"))[PRODUCT_IDENTITY.commandName]).toEqual({ defaultAccentColor: "green" });
    await one.send({ action: "stop" });
    expect(await api(["get", "--session", one.sessionId])).toMatchObject({ code: 1 });
  });
});
