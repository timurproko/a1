import { EventEmitter } from "node:events";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TabBridgeClient } from "../../../src/foundation/resident-tabs/bridge-client.js";
import { encodeResidentFrame, ResidentFrameDecoder, type ResidentEnvelope } from "../../../src/foundation/resident-tabs/protocol.js";
import { ensureTerminalHost } from "../../../src/foundation/resident-tabs/ensure-terminal-host.js";
import { readResidentTabLaunchSettings, readResidentTabsSetting } from "../../../src/foundation/resident-tabs/settings.js";
import { selectResidentHost } from "../../../src/foundation/resident-tabs/routing.js";

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { while (cleanups.length) await cleanups.pop()!(); });
async function temporaryDirectory(prefix: string) {
  const path = await mkdtemp(join(tmpdir(), prefix));
  return { path, cleanup: () => rm(path, { recursive: true, force: true }) };
}

describe("resident tab launch contracts", () => {
  it("resolves only an explicit valid profile setting", async () => {
    const root = await temporaryDirectory("resident-setting-"); cleanups.push(root.cleanup);
    await mkdir(join(root.path, "settings"), { recursive: true });
    await writeFile(join(root.path, "settings", "a1.json"), JSON.stringify({ version: 15, values: { residentTabs: true } }));
    expect(await readResidentTabsSetting(root.path)).toBe(true);
    expect(await readResidentTabLaunchSettings(root.path)).toEqual({
      residentTabs: true,
      maxConcurrentStarts: 2,
      unresponsiveRestartSeconds: 120,
      stallNoticeSeconds: 300,
    });
    await writeFile(join(root.path, "settings", "a1.json"), JSON.stringify({
      version: 15,
      values: {
        residentTabs: true,
        tabsMaxConcurrentStarts: 8,
        tabsUnresponsiveRestartSeconds: 600,
        tabsStallNoticeSeconds: 1800,
      },
    }));
    expect(await readResidentTabLaunchSettings(root.path)).toEqual({
      residentTabs: true,
      maxConcurrentStarts: 8,
      unresponsiveRestartSeconds: 600,
      stallNoticeSeconds: 1800,
    });
    await writeFile(join(root.path, "settings", "a1.json"), JSON.stringify({ version: 14, values: { residentTabs: true } }));
    expect(await readResidentTabsSetting(root.path)).toBe(false);
    await writeFile(join(root.path, "settings", "a1.json"), JSON.stringify({ version: 15, values: { residentTabs: "yes" } }));
    expect(await readResidentTabsSetting(root.path)).toBe(false);
  });

  it("never probes or starts a host for setting-off, comparison, or selected-session launches", async () => {
    const readSetting = vi.fn(async () => false);
    const ensureHost = vi.fn(async () => ({ status: "ready" as const, executable: "host", endpoint: "endpoint" }));
    await expect(selectResidentHost({
      profileId: "a1", hasSessionSelection: false, currentLaunchContract: true, readSetting, ensureHost,
    })).resolves.toBeNull();
    expect(readSetting).toHaveBeenCalledOnce();
    expect(ensureHost).not.toHaveBeenCalled();

    readSetting.mockClear();
    for (const selection of [
      { profileId: "pi" as const, hasSessionSelection: false, currentLaunchContract: true },
      { profileId: "a1" as const, hasSessionSelection: true, currentLaunchContract: true },
      { profileId: "a1" as const, hasSessionSelection: false, currentLaunchContract: false },
    ]) {
      await expect(selectResidentHost({ ...selection, readSetting, ensureHost })).resolves.toBeNull();
    }
    expect(readSetting).not.toHaveBeenCalled();
    expect(ensureHost).not.toHaveBeenCalled();
  });

  it("frames bridge metadata without terminal or prompt content", () => {
    const frame = encodeResidentFrame({ type: "bridge.status", body: { seq: 1, state: "working" } });
    const decoder = new ResidentFrameDecoder();
    expect(decoder.push(frame.subarray(0, 3))).toEqual([]);
    expect(decoder.push(frame.subarray(3))).toEqual([{ type: "bridge.status", body: { seq: 1, state: "working" } }]);
    expect(frame.toString("utf8")).not.toContain("prompt");
  });

  it("reconnects the metadata bridge and replays only current status and session metadata", async () => {
    class Transport extends EventEmitter {
      readonly sent: ResidentEnvelope[] = [];
      write(bytes: Uint8Array) { this.sent.push(...new ResidentFrameDecoder().push(bytes)); return true; }
      destroy() { this.emit("close"); }
    }
    const transports: Transport[] = [];
    const bridge = new TabBridgeClient({
      credentials: { tabId: "tab-1", token: Buffer.alloc(32, 7).toString("base64"), endpoint: "fixture" },
      connect: () => { const transport = new Transport(); transports.push(transport); return transport; },
    });
    const firstStart = bridge.start();
    transports[0]!.emit("connect");
    expect(transports[0]!.sent[0]).toMatchObject({ type: "hello", body: { role: "bridge", tabId: "tab-1" } });
    transports[0]!.emit("data", encodeResidentFrame({ type: "welcome", body: { generation: 1, build: "host", features: [] } }));
    await expect(firstStart).resolves.toBe(true);
    bridge.status("working"); bridge.session("session.jsonl", "agent");
    transports[0]!.emit("close");
    const secondStart = bridge.start();
    transports[1]!.emit("connect");
    transports[1]!.emit("data", encodeResidentFrame({ type: "welcome", body: { generation: 1, build: "host", features: [] } }));
    await expect(secondStart).resolves.toBe(true);
    expect(transports[1]!.sent.map(message => message.type)).toEqual(["hello", "bridge.status", "bridge.session"]);
    expect(JSON.stringify(transports[1]!.sent)).not.toContain("prompt");
    bridge.close();
  });

  it("emits event-loop heartbeats and sends an authenticated restart request", async () => {
    class Transport extends EventEmitter {
      readonly sent: ResidentEnvelope[] = [];
      write(bytes: Uint8Array) { this.sent.push(...new ResidentFrameDecoder().push(bytes)); return true; }
      destroy() { this.emit("close"); }
    }
    const transport = new Transport();
    let heartbeat: (() => void) | undefined;
    const bridge = new TabBridgeClient({
      credentials: { tabId: "tab-1", token: Buffer.alloc(32, 4).toString("base64"), endpoint: "fixture" },
      connect: () => transport,
      setInterval: callback => { heartbeat = callback; return callback; },
      clearInterval: () => { heartbeat = undefined; },
    });
    const start = bridge.start(); transport.emit("connect");
    transport.emit("data", encodeResidentFrame({ type: "welcome", body: { generation: 1 } }));
    await start;
    heartbeat?.(); heartbeat?.();
    expect(transport.sent.filter(message => message.type === "bridge.heartbeat").map(message => message.body.seq)).toEqual([1, 2]);
    transport.emit("data", encodeResidentFrame({ type: "attachment", body: { clientId: "client", controllerRevision: 7 } }));
    const restarting = bridge.requestRestart();
    const request = transport.sent.at(-1)!;
    expect(request).toMatchObject({ type: "bridge.request", body: { action: "restart", clientId: "client", controllerRevision: 7 } });
    if (request.requestId === undefined) throw new Error("restart request id missing");
    transport.emit("data", encodeResidentFrame({ type: "bridge.result", requestId: request.requestId, body: { accepted: true } }));
    await expect(restarting).resolves.toBe(true);
    bridge.close();
  });

  it("returns an existing verified generation-1 host without starting another", async () => {
    const root = await temporaryDirectory("resident-existing-"); cleanups.push(root.cleanup);
    const executable = join(root.path, process.platform === "win32" ? "host.exe" : "host");
    await writeFile(executable, "fixture"); await chmod(executable, 0o700);
    const observed: string[][] = [];
    const result = await ensureTerminalHost({
      releaseRoot: root.path, profileRoot: root.path, dataDir: root.path, runtimeDir: root.path,
      environment: { A1_TERMINAL_HOST_PATH: executable }, platform: "linux", architecture: "x64",
      run: async (_file, arguments_) => {
        observed.push([...arguments_]);
        return { code: 0, stdout: '{"outcome":"ready","generation":1,"endpoint":"/existing"}', stderr: "" };
      },
    });
    expect(result).toEqual({ status: "ready", executable, endpoint: "/existing" });
    expect(observed.map(arguments_ => arguments_[0])).toEqual(["probe"]);
  });

  it("starts a missing host and waits for a verified generation-1 probe", async () => {
    const root = await temporaryDirectory("resident-host-"); cleanups.push(root.cleanup);
    const executable = join(root.path, process.platform === "win32" ? "host.exe" : "host");
    await writeFile(executable, "fixture"); await chmod(executable, 0o700);
    let probe = 0;
    const result = await ensureTerminalHost({
      releaseRoot: root.path, profileRoot: root.path, dataDir: root.path, runtimeDir: root.path,
      environment: { A1_TERMINAL_HOST_PATH: executable }, platform: "linux", architecture: "x64", timeoutMs: 100,
      run: async (_file, arguments_) => arguments_[0] === "server"
        ? { code: 0, stdout: '{"verified":true,"endpoint":"/host"}', stderr: "" }
        : ++probe === 1
          ? { code: 2, stdout: '{"outcome":"not-running"}', stderr: "" }
          : { code: 0, stdout: '{"outcome":"ready","generation":1,"endpoint":"/host"}', stderr: "" },
    });
    expect(result).toEqual({ status: "ready", executable, endpoint: "/host" });
  });

  it.each([
    ["registry-unreadable", "registry unreadable"],
    ["blocked", "recovery blocked"],
  ] as const)("preserves the typed %s startup failure", async (reason, expected) => {
    const root = await temporaryDirectory("resident-failure-"); cleanups.push(root.cleanup);
    const executable = join(root.path, process.platform === "win32" ? "host.exe" : "host");
    await writeFile(executable, "fixture"); await chmod(executable, 0o700);
    const result = await ensureTerminalHost({
      releaseRoot: root.path, profileRoot: root.path, dataDir: root.path, runtimeDir: root.path,
      environment: { A1_TERMINAL_HOST_PATH: executable }, platform: "linux", architecture: "x64",
      run: async (_file, arguments_) => arguments_[0] === "probe"
        ? { code: 2, stdout: '{"outcome":"not-running"}', stderr: "" }
        : { code: 2, stdout: JSON.stringify({ outcome: "blocked", verified: false, reason }), stderr: "" },
    });
    expect(result).toEqual({ status: "fallback", reason: expected });
  });

  it("falls back for unsupported, missing, incompatible, unverified, failed, and timed-out hosts", async () => {
    const root = await temporaryDirectory("resident-outcomes-"); cleanups.push(root.cleanup);
    const executable = join(root.path, process.platform === "win32" ? "host.exe" : "host");
    const registry = join(root.path, "registry.json");
    await writeFile(registry, "existing-holder-sentinel");
    const base = {
      releaseRoot: root.path, profileRoot: root.path, dataDir: root.path, runtimeDir: root.path,
      environment: { A1_TERMINAL_HOST_PATH: executable },
    };
    await expect(ensureTerminalHost({ ...base, platform: "freebsd", architecture: "x64" }))
      .resolves.toEqual({ status: "fallback", reason: "unsupported platform" });
    await expect(ensureTerminalHost({ ...base, platform: "linux", architecture: "x64" }))
      .resolves.toEqual({ status: "fallback", reason: "terminal host not installed" });
    await writeFile(executable, "fixture"); await chmod(executable, 0o700);
    await expect(ensureTerminalHost({ ...base, platform: "linux", architecture: "x64", run: async () => ({
      code: 2, stdout: '{"outcome":"incompatible-generation"}', stderr: "",
    }) })).resolves.toEqual({ status: "fallback", reason: "incompatible generation" });
    await expect(ensureTerminalHost({ ...base, platform: "linux", architecture: "x64", run: async () => ({
      code: 0, stdout: '{"outcome":"ready","generation":2,"endpoint":"/older"}', stderr: "",
    }) })).resolves.toEqual({ status: "fallback", reason: "incompatible generation" });

    let calls = 0;
    await expect(ensureTerminalHost({ ...base, platform: "linux", architecture: "x64", run: async (_file, arguments_) => {
      calls++;
      return arguments_[0] === "probe"
        ? { code: 2, stdout: '{"outcome":"not-running"}', stderr: "" }
        : { code: 0, stdout: '{"outcome":"started","verified":false}', stderr: "" };
    } })).resolves.toEqual({ status: "fallback", reason: "launch not verified" });
    expect(calls).toBe(2);

    await expect(ensureTerminalHost({ ...base, platform: "linux", architecture: "x64", run: async () => {
      throw Object.assign(new Error("deadline"), { code: "ETIMEDOUT" });
    } })).resolves.toEqual({ status: "fallback", reason: "host startup timed out" });
    await expect(ensureTerminalHost({ ...base, platform: "linux", architecture: "x64", run: async () => {
      throw new Error("probe failed");
    } })).resolves.toEqual({ status: "fallback", reason: "host probe failed" });

    let phase = 0;
    await expect(ensureTerminalHost({
      ...base, platform: "linux", architecture: "x64", timeoutMs: 5,
      run: async (_file, arguments_) => {
        if (arguments_[0] === "server") return { code: 0, stdout: '{"verified":true,"endpoint":"/host"}', stderr: "" };
        phase++;
        return { code: 2, stdout: '{"outcome":"not-running"}', stderr: "" };
      },
    })).resolves.toEqual({ status: "fallback", reason: "host startup timed out" });
    expect(phase).toBeGreaterThanOrEqual(1);
    await expect(readFile(registry, "utf8")).resolves.toBe("existing-holder-sentinel");
  });
});
