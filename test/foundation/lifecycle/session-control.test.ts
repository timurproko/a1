import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdtemp, rm, readdir, realpath, writeFile, mkdir, symlink, unlink } from "node:fs/promises";
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
  it("routes and removes private endpoints even beneath long multibyte runtime paths", async () => {
    const longRuntime = join(runtimeDir, "runtime-" + "色".repeat(40), "nested-runtime");
    const sessionId = randomUUID();
    const target = await serveSessionControl({ runtimeDir: longRuntime, runtimeId: randomUUID(), identity: () => ({ sessionId, binding: 1 }), handle: async value => value });
    hosts.push(target);
    expect(await requestSessionControl({ runtimeDir: longRuntime, sessionId, payload: "long-path" })).toBe("long-path");
    const directory = await realpath(join(longRuntime, "session-controls"));
    const [record] = (await readdir(directory)).filter(name => name.endsWith(".json"));
    let endpoint: string | undefined;
    if (process.platform !== "win32") {
      const transport = join(await realpath("/tmp"), `session-control-${process.getuid!()}`);
      const id = record!.slice(0, -5);
      const digest = createHash("sha256").update(`${directory}\0${id}`).digest("hex").slice(0, 32);
      endpoint = join(transport, `${digest}.sock`);
      expect(Buffer.byteLength(endpoint)).toBeLessThan(104);
      const socket = await lstat(endpoint), parent = await lstat(transport);
      expect(socket.isSocket()).toBe(true);
      expect(socket.mode & 0o777).toBe(0o600);
      expect(parent.mode & 0o077).toBe(0);
      expect(parent.uid).toBe(process.getuid!());
    }
    await target.dispose();
    expect(await readdir(directory)).toEqual([]);
    if (endpoint) await expect(lstat(endpoint)).rejects.toMatchObject({ code: "ENOENT" });
  });

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

  // Provenance: a synthetic registration in this build's record format for a process that no longer exists.
  const staleRecord = (pid: number) => ({ version: 1, id: randomUUID(), nonce: randomUUID(), runtimeId: randomUUID(), owner: { pid, startIdentity: "pid-liveness" }, sessionId: randomUUID(), binding: 1 });
  async function seedRecords(directory: string, count: number, pid: number) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const ids: string[] = [];
    for (let index = 0; index < count; index++) {
      const record = staleRecord(pid);
      ids.push(record.id);
      await writeFile(join(directory, `${record.id}.json`), JSON.stringify(record), { mode: 0o600 });
    }
    return ids;
  }
  // Platform: above any real pid range on Windows, macOS and Linux, so the real probe reports it gone.
  const DEAD_PID = 2_000_000_000;
  const records = async (directory: string) => (await readdir(directory)).filter(name => name.endsWith(".json"));

  it("prunes records of dead owners when a session starts and keeps live and unreadable ones", async () => {
    const directory = join(runtimeDir, "session-controls");
    const dead = await seedRecords(directory, 12, DEAD_PID);
    const [liveForeign] = await seedRecords(directory, 1, process.pid);
    const malformed = `${randomUUID()}.json`;
    await writeFile(join(directory, malformed), "not JSON", { mode: 0o600 });
    const target = await host();
    const remaining = await records(directory);
    expect(remaining).toHaveLength(3);
    expect(remaining).toContain(`${liveForeign}.json`);
    expect(remaining).toContain(malformed);
    for (const id of dead) expect(remaining).not.toContain(`${id}.json`);
    // Invariant: unreadable records remain a lookup refusal (unchanged); only dead owners are pruned.
    await expect(requestSessionControl({ runtimeDir, sessionId: target.state.sessionId, payload: null })).rejects.toMatchObject({ code: "control-boundary" });
    await unlink(join(directory, malformed));
    expect(await requestSessionControl({ runtimeDir, sessionId: target.state.sessionId, payload: "after-sweep" })).toBe("after-sweep");
  });

  it("resolves a live session past 256 stale records and prunes them while looking", async () => {
    const target = await host();
    const directory = join(runtimeDir, "session-controls");
    await seedRecords(directory, 300, DEAD_PID);
    expect((await records(directory)).length).toBe(301);
    expect(await requestSessionControl({ runtimeDir, sessionId: target.state.sessionId, payload: "still-reachable" })).toBe("still-reachable");
    expect((await records(directory)).length).toBe(1);
  });

  it("still fails closed on a flooded directory or too many live candidates, and an injected probe never deletes", async () => {
    const target = await host();
    const directory = join(runtimeDir, "session-controls");
    await seedRecords(directory, 300, process.pid);
    await expect(requestSessionControl({ runtimeDir, sessionId: target.state.sessionId, payload: null })).rejects.toMatchObject({ code: "control-limit" });
    expect((await records(directory)).length).toBe(301);
    await expect(requestSessionControl({ runtimeDir, sessionId: target.state.sessionId, payload: null, inspectProcess: async () => null })).rejects.toMatchObject({ code: "session-unavailable" });
    expect((await records(directory)).length).toBe(301);
    await seedRecords(directory, 4096 - 300, DEAD_PID);
    await expect(requestSessionControl({ runtimeDir, sessionId: target.state.sessionId, payload: null })).rejects.toMatchObject({ code: "control-limit" });
    expect((await records(directory)).length).toBe(4097);
  });

  it("bounds the start-time sweep and leaves the remainder for later", async () => {
    const directory = join(runtimeDir, "session-controls");
    await seedRecords(directory, 40, DEAD_PID);
    let probes = 0;
    const slow = async (pid: number) => { probes++; if (pid === process.pid) return { pid, startIdentity: "pid-liveness" }; await new Promise(done => setTimeout(done, 60)); return null; };
    const control = await serveSessionControl({ runtimeDir, runtimeId: randomUUID(), identity: () => ({ sessionId: randomUUID(), binding: 1 }), handle: async value => value, inspectProcess: slow });
    hosts.push(control);
    const left = (await records(directory)).length;
    expect(left).toBeGreaterThan(1);
    expect(left).toBeLessThan(41);
    expect(probes).toBeLessThan(41);
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
