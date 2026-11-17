import { fork, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runApiCommand } from "../../src/cli/api.js";
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
async function api(type: string, session: { sessionId: string; runtimeId: string }, value?: string) {
  const output: string[] = [];
  const request = { version: 1, id: randomUUID(), type, target: { scope: "session", sessionId: session.sessionId, runtimeId: session.runtimeId }, setting: "accentColor", ...(value === undefined ? {} : { value }) };
  const code = await runApiCommand([JSON.stringify(request)], { environment: { [PRODUCT_IDENTITY.environment.runtimeDir]: join(root, "runtime") }, stdout: line => output.push(line) });
  expect(output).toHaveLength(1);
  const response = JSON.parse(output[0]!);
  expect(response).toMatchObject({ version: 1, id: request.id, command: type, type: "response" });
  return { code, body: response.success ? response.data : response };
}

describe("external color control across independent runtimes", () => {
  it("routes name reads and guarded renames through exact-runtime transport without peer or replacement writes", async () => {
    root = await mkdtemp(join(tmpdir(), "session-name-api-"));
    const one = await host(), two = await host();
    const names = async (session: { sessionId: string; runtimeId: string }, fields: Record<string, unknown> = {}) => {
      const output: string[] = [];
      const code = await runApiCommand([JSON.stringify({ version: 1, id: randomUUID(), type: "session.get", target: { scope: "session", sessionId: session.sessionId, runtimeId: session.runtimeId }, ...fields })],
        { environment: { [PRODUCT_IDENTITY.environment.runtimeDir]: join(root, "runtime") }, stdout: line => output.push(line) });
      return { code, response: JSON.parse(output[0]!) };
    };
    const before = await names(one);
    const rename = { type: "session.rename", name: "Sidebar", expectedNameRevision: before.response.data.nameRevision };
    expect(await names(one, rename)).toMatchObject({ code: 0, response: { data: { name: "Sidebar", status: "applied" } } });
    expect(await names(two)).toMatchObject({ response: { data: { name: null } } });
    expect(await names(one, { ...rename, name: "Stale" })).toMatchObject({ code: 1, response: { error: { code: "name-conflict" } } });
    const replacement = randomUUID();
    await one.send({ action: "replace", sessionId: replacement });
    await vi.waitFor(async () => expect(await names({ sessionId: replacement, runtimeId: one.runtimeId })).toMatchObject({ code: 0, response: { data: { name: null } } }));
    expect(await names(one, rename)).toMatchObject({ code: 1, response: { error: { code: "session-unavailable" } } });
    expect(await names({ sessionId: replacement, runtimeId: two.runtimeId })).toMatchObject({ code: 1 });
  });

  it("routes boolean naming policy to only the exact runtime and isolates replacement sessions", async () => {
    root = await mkdtemp(join(tmpdir(), "session-auto-name-api-"));
    const one = await host(), two = await host();
    const policy = async (session: { sessionId: string; runtimeId: string }, value?: boolean) => {
      const output: string[] = [];
      const code = await runApiCommand([JSON.stringify({ version: 1, id: randomUUID(), type: value === undefined ? "settings.get" : "settings.update",
        target: { scope: "session", sessionId: session.sessionId, runtimeId: session.runtimeId }, setting: "sessionAutoName", ...(value === undefined ? {} : { value }) })],
        { environment: { [PRODUCT_IDENTITY.environment.runtimeDir]: join(root, "runtime") }, stdout: line => output.push(line) });
      expect(output).toHaveLength(1);
      return { code, response: JSON.parse(output[0]!) };
    };
    expect(await policy(one)).toMatchObject({ code: 0, response: { data: { storedValue: null, effectiveValue: true, origin: "profile" } } });
    expect(await policy(one, false)).toMatchObject({ code: 0, response: { data: { storedValue: false, effectiveValue: false, origin: "session", status: "applied" } } });
    expect(await policy(two)).toMatchObject({ response: { data: { storedValue: null, effectiveValue: true } } });
    expect(await policy(one, true)).toMatchObject({ code: 0, response: { data: { storedValue: true, effectiveValue: true } } });
    const replacement = randomUUID(); await one.send({ action: "replace", sessionId: replacement });
    await vi.waitFor(async () => expect(await policy({ sessionId: replacement, runtimeId: one.runtimeId })).toMatchObject({ code: 0, response: { data: { storedValue: null, effectiveValue: true } } }));
    expect(await policy(one, false)).toMatchObject({ code: 1, response: { error: { code: "session-unavailable" } } });
    expect(await policy({ sessionId: replacement, runtimeId: two.runtimeId }, false)).toMatchObject({ code: 1 });
  });

  it("targets current colors without peer/default propagation and honors default on replacement", async () => {
    root = await mkdtemp(join(tmpdir(), "session-color-api-"));
    const one = await host(), two = await host();
    expect(await api("settings.get", one)).toMatchObject({ code: 0, body: { target: { sessionId: one.sessionId, runtimeId: one.runtimeId }, effectiveValue: "blue" } });
    expect(await api("settings.update", one, "pink")).toMatchObject({ code: 0, body: { effectiveValue: "pink", status: "applied" } });
    expect(await api("settings.get", two)).toMatchObject({ body: { effectiveValue: "blue" } });
    expect(await two.send({ action: "current", color: "grey" })).toEqual({ color: "grey" });
    expect(await api("settings.get", two)).toMatchObject({ body: { effectiveValue: "grey" } });
    expect(await one.send({ action: "default", color: "green" })).toEqual({ color: "pink" });
    expect(await api("settings.update", two, "cyan")).toMatchObject({ body: { effectiveValue: "cyan" } });
    const third = await host();
    expect(await api("settings.get", third)).toMatchObject({ body: { effectiveValue: "green" } });
    const replacement = randomUUID();
    expect(await two.send({ action: "replace", sessionId: replacement })).toEqual({ color: "green" });
    await vi.waitFor(async () => expect(await api("settings.get", { sessionId: replacement, runtimeId: two.runtimeId })).toMatchObject({ code: 0, body: { effectiveValue: "green" } }));
    expect(await api("settings.update", two, "orange")).toMatchObject({ code: 1, body: { error: { code: "session-unavailable" } } });
    const concurrent = await Promise.all(["orange", "purple"].map(color => api("settings.update", one, color)));
    expect(concurrent.map(result => result.body.effectiveValue)).toEqual(["orange", "purple"]);
    expect(["orange", "purple"]).toContain((await api("settings.get", one)).body.effectiveValue);
    expect(await api("settings.get", { sessionId: one.sessionId, runtimeId: two.runtimeId })).toMatchObject({ code: 1 });
    expect(JSON.parse(await readFile(join(root, "profile", "settings.json"), "utf8"))[PRODUCT_IDENTITY.commandName]).toEqual({ defaultAccentColor: "green" });
    await one.send({ action: "stop" });
    expect(await api("settings.get", one)).toMatchObject({ code: 1 });
  });
});
