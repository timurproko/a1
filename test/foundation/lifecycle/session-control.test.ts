import { randomUUID } from "node:crypto";
import { mkdtemp, rm, readdir, writeFile, mkdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { requestSessionControl, serveSessionControl } from "../../../src/foundation/lifecycle/index.js";

let runtimeDir: string;
const hosts: Array<{ dispose(): Promise<void> }> = [];
beforeEach(async () => { runtimeDir = await mkdtemp(join(tmpdir(), "session-control-")); });
afterEach(async () => { await Promise.all(hosts.splice(0).map(host => host.dispose())); await rm(runtimeDir, { recursive: true, force: true }); });

async function host(sessionId = randomUUID(), handle: (payload: unknown) => Promise<unknown> = async value => value) {
  const state = { sessionId, binding: 1 };
  const runtimeId = randomUUID();
  const control = await serveSessionControl({ runtimeDir, runtimeId, identity: () => state, handle });
  hosts.push(control);
  return { state, runtimeId, ...control };
}

describe("bounded local session control", () => {
  it("routes exact sessions, checks runtime selectors, and releases discovery on disposal", async () => {
    const one = await host(), two = await host();
    expect(await requestSessionControl({ runtimeDir, sessionId: one.state.sessionId, payload: "one" })).toBe("one");
    await expect(requestSessionControl({ runtimeDir, sessionId: one.state.sessionId, runtimeId: two.runtimeId, payload: null })).rejects.toMatchObject({ code: "session-unavailable" });
    await one.dispose();
    await expect(requestSessionControl({ runtimeDir, sessionId: one.state.sessionId, payload: null })).rejects.toMatchObject({ code: "session-unavailable" });
  });

  it("rejects malformed, ambiguous, stopped, and unverifiable selectors", async () => {
    await expect(requestSessionControl({ runtimeDir, sessionId: "prefix", payload: null })).rejects.toMatchObject({ code: "invalid-session" });
    const one = await host();
    await host(one.state.sessionId);
    await expect(requestSessionControl({ runtimeDir, sessionId: one.state.sessionId, payload: null })).rejects.toMatchObject({ code: "ambiguous-session" });
    await expect(requestSessionControl({ runtimeDir, sessionId: one.state.sessionId, payload: null, inspectProcess: async () => null })).rejects.toMatchObject({ code: "session-unavailable" });
    expect(await requestSessionControl({ runtimeDir, sessionId: one.state.sessionId, runtimeId: one.runtimeId, payload: "exact" })).toBe("exact");
  });

  it("serializes requests and expires a queued write before it can apply", async () => {
    let release!: () => void;
    const gate = new Promise<void>(done => { release = done; });
    const applied: unknown[] = [];
    const target = await host(undefined, async value => { applied.push(value); if (value === "hold") await gate; return value; });
    const first = requestSessionControl({ runtimeDir, sessionId: target.state.sessionId, payload: "hold" });
    while (!applied.length) await new Promise(done => setTimeout(done, 5));
    const expired = requestSessionControl({ runtimeDir, sessionId: target.state.sessionId, payload: "late", timeoutMs: 30 });
    await expect(expired).rejects.toMatchObject({ code: "request-expired" });
    release();
    expect(await first).toBe("hold");
    expect(await requestSessionControl({ runtimeDir, sessionId: target.state.sessionId, payload: "last" })).toBe("last");
    expect(applied).toEqual(["hold", "last"]);
  });

  it("rejects oversized or malformed discovery records without reading arbitrary payloads", async () => {
    const target = await host();
    const directory = join(runtimeDir, "session-controls");
    const name = (await readdir(directory)).find(name => name.endsWith(".json"))!;
    await writeFile(join(directory, name), "x".repeat(9000));
    await expect(requestSessionControl({ runtimeDir, sessionId: target.state.sessionId, payload: null })).rejects.toMatchObject({ code: "control-boundary" });
    await writeFile(join(directory, name), "not JSON, never echo these bytes");
    await expect(requestSessionControl({ runtimeDir, sessionId: target.state.sessionId, payload: null })).rejects.toMatchObject({ code: "control-boundary", message: "Malformed session control record." });
  });

  it("refuses linked discovery directories", async () => {
    const external = join(runtimeDir, "external");
    await mkdir(external);
    await symlink(external, join(runtimeDir, "session-controls"), process.platform === "win32" ? "junction" : "dir");
    await expect(serveSessionControl({ runtimeDir, runtimeId: randomUUID(), identity: () => ({ sessionId: randomUUID(), binding: 1 }), handle: async () => null })).rejects.toMatchObject({ code: "control-boundary" });
  });

  it("rejects old identity requests after replacement even before the new record publishes", async () => {
    const target = await host();
    const previous = target.state.sessionId;
    target.state.sessionId = randomUUID(); target.state.binding++;
    await expect(requestSessionControl({ runtimeDir, sessionId: previous, payload: "old" })).rejects.toMatchObject({ code: "session-unavailable" });
    await target.publish();
    expect(await requestSessionControl({ runtimeDir, sessionId: target.state.sessionId, payload: "new" })).toBe("new");
  });
});
