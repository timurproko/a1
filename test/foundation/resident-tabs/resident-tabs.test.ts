import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TabBridgeClient } from "../../../src/foundation/resident-tabs/bridge-client.js";
import { encodeResidentFrame, ResidentFrameDecoder, type ResidentEnvelope } from "../../../src/foundation/resident-tabs/protocol.js";
import { ensureTerminalHost } from "../../../src/foundation/resident-tabs/ensure-terminal-host.js";
import { readResidentTabLaunchSettings } from "../../../src/foundation/resident-tabs/settings.js";
import { selectResidentHost } from "../../../src/foundation/resident-tabs/routing.js";

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { while (cleanups.length) await cleanups.pop()!(); });
async function temporaryDirectory(prefix: string) {
  const path = await mkdtemp(join(tmpdir(), prefix));
  return { path, cleanup: () => rm(path, { recursive: true, force: true }) };
}
async function developmentHost(root: string) {
  const addon = join(root, "terminal-host.node");
  const entry = join(root, "dist", "foundation", "resident-tabs", "host-entry.js");
  await mkdir(join(entry, ".."), { recursive: true });
  await Promise.all([writeFile(addon, "fixture"), writeFile(entry, "// fixture")]);
  return { addon, entry };
}

describe("resident tab launch contracts", () => {
  it("resolves approved tab settings while keeping start and prewarm limits internal", async () => {
    const root = await temporaryDirectory("resident-setting-"); cleanups.push(root.cleanup);
    const namespace = "product";
    const defaults = {
      tabsAutoName: true,
      maxConcurrentStarts: 2,
      prewarmCount: 1,
      unresponsiveRestartSeconds: 120,
      stallNoticeSeconds: 300,
    };
    await writeFile(join(root.path, "settings.json"), JSON.stringify({ theme: "dark", [namespace]: { residentTabs: false } }));
    expect(await readResidentTabLaunchSettings(root.path, namespace)).toEqual(defaults);

    await writeFile(join(root.path, "settings.json"), `/${JSON.stringify({ theme: "dark", [namespace]: { tabsMax: 12 } })}`);
    expect(await readResidentTabLaunchSettings(root.path, namespace)).toEqual(defaults);
    expect(JSON.parse(await readFile(join(root.path, "settings.json"), "utf8"))).toEqual({
      theme: "dark",
      [namespace]: { tabsMax: 12 },
    });

    await writeFile(join(root.path, "settings.json"), JSON.stringify({
      [namespace]: {
        residentTabs: true,
        tabsMax: 24,
        tabsAutoName: false,
        tabsMaxConcurrentStarts: 8,
        tabsUnresponsiveRestartSeconds: 600,
        tabsStallNoticeSeconds: 1800,
      },
    }));
    expect(await readResidentTabLaunchSettings(root.path, namespace)).toEqual({ ...defaults, tabsAutoName: false });
    await writeFile(join(root.path, "settings.json"), JSON.stringify({ [namespace]: { tabsMax: 80 } }));
    expect(await readResidentTabLaunchSettings(root.path, namespace)).toEqual(defaults);
    expect(JSON.parse(await readFile(join(root.path, "settings.json"), "utf8"))[namespace].tabsMax).toBe(80);

    const legacy = await temporaryDirectory("resident-legacy-"); cleanups.push(legacy.cleanup);
    await writeFile(join(root.path, "settings.json"), JSON.stringify({ theme: "dark" }));
    await mkdir(join(legacy.path, "settings"), { recursive: true });
    await writeFile(join(legacy.path, "settings", "a1.json"), JSON.stringify({ version: 15, values: { residentTabs: false, tabsMax: 12 } }));
    expect(await readResidentTabLaunchSettings(root.path, namespace, legacy.path, "a1")).toEqual(defaults);
  });

  it("routes bare A1 through the resident host while solo and comparison stay direct", async () => {
    const ensureHost = vi.fn(async () => ({ status: "ready" as const, executable: { executable: process.execPath, entry: "host-entry.js" }, endpoint: "endpoint" }));
    for (const selection of [
      { profileId: "pi" as const, solo: true, currentLaunchContract: true },
      { profileId: "a1" as const, solo: true, currentLaunchContract: true },
      { profileId: "a1" as const, solo: false, currentLaunchContract: false },
    ]) {
      await expect(selectResidentHost({ ...selection, interactive: true, ensureHost })).resolves.toBeNull();
    }
    expect(ensureHost).not.toHaveBeenCalled();

    await expect(selectResidentHost({
      profileId: "a1", solo: false, currentLaunchContract: true, interactive: true, ensureHost,
    })).resolves.toMatchObject({ status: "ready" });
    expect(ensureHost).toHaveBeenCalledOnce();
  });

  it("runs a piped or redirected bare A1 direct without probing the resident host", async () => {
    const ensureHost = vi.fn(async () => ({ status: "ready" as const, executable: { executable: process.execPath, entry: "host-entry.js" }, endpoint: "endpoint" }));
    await expect(selectResidentHost({
      profileId: "a1", solo: false, currentLaunchContract: true, interactive: false, ensureHost,
    })).resolves.toEqual({ status: "fallback", reason: "no interactive terminal" });
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
    expect(transports[0]!.sent[0]).toMatchObject({
      type: "hello",
      body: { role: "bridge", tabId: "tab-1", features: expect.arrayContaining(["bridge-route"]) },
    });
    transports[0]!.emit("data", encodeResidentFrame({ type: "welcome", body: { generation: 1, build: "host", features: [] } }));
    await expect(firstStart).resolves.toBe(true);
    bridge.accent("orange"); bridge.status("working"); bridge.session("session.jsonl", "agent");
    transports[0]!.emit("close");
    const secondStart = bridge.start();
    transports[1]!.emit("connect");
    transports[1]!.emit("data", encodeResidentFrame({ type: "welcome", body: { generation: 1, build: "host", features: [] } }));
    await expect(secondStart).resolves.toBe(true);
    expect(transports[1]!.sent.map(message => message.type)).toEqual(["hello", "bridge.status", "bridge.session"]);
    expect(transports[1]!.sent.find(message => message.type === "bridge.status")?.body).toMatchObject({ state: "working", accent: "orange" });
    expect(JSON.stringify(transports[1]!.sent)).not.toContain("prompt");
    bridge.close();
  });

  it("decodes a content-free seed notice and acknowledges consumption without text", async () => {
    class Transport extends EventEmitter {
      readonly sent: ResidentEnvelope[] = [];
      write(bytes: Uint8Array) { this.sent.push(...new ResidentFrameDecoder().push(bytes)); return true; }
      destroy() { this.emit("close"); }
    }
    const transport = new Transport();
    const bridge = new TabBridgeClient({
      credentials: { tabId: "tab-1", token: Buffer.alloc(32, 5).toString("base64"), endpoint: "fixture" },
      connect: () => transport,
    });
    const start = bridge.start(); transport.emit("connect");
    expect(transport.sent[0]?.body).toMatchObject({ features: expect.arrayContaining(["bridge-seed"]) });
    transport.emit("data", encodeResidentFrame({ type: "welcome", body: { generation: 1, features: ["bridge-seed"] } }));
    await start;
    // Invariant: a seed notice that arrives before composition subscribes is replayed to it.
    transport.emit("data", encodeResidentFrame({ type: "bridge.seed", body: {} }));
    const commands: unknown[] = [];
    bridge.onCommand(command => commands.push(command));
    expect(commands).toEqual([{ type: "seed" }]);
    bridge.seedConsumed();
    expect(transport.sent.at(-1)).toEqual({ type: "bridge.seed-consumed", body: {} });
    bridge.close();
  });

  it("replays a route command that arrives before composition subscribes", async () => {
    class Transport extends EventEmitter {
      write(_bytes: Uint8Array) { return true; }
      destroy() { this.emit("close"); }
    }
    const transport = new Transport();
    const bridge = new TabBridgeClient({
      credentials: { tabId: "settings-1", token: Buffer.alloc(32, 3).toString("base64"), endpoint: "fixture" },
      connect: () => transport,
    });
    const start = bridge.start(); transport.emit("connect");
    transport.emit("data", encodeResidentFrame({ type: "welcome", body: { generation: 1, features: ["bridge-route"] } }));
    await start;
    transport.emit("data", encodeResidentFrame({ type: "bridge.route", body: { route: "settings" } }));
    const commands: unknown[] = [];
    bridge.onCommand(command => commands.push(command));
    expect(commands).toEqual([{ type: "route", route: "settings" }]);
    expect(bridge.tabId).toBe("settings-1");
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
    const commands: unknown[] = [];
    bridge.onCommand(command => commands.push(command));
    const start = bridge.start(); transport.emit("connect");
    transport.emit("data", encodeResidentFrame({ type: "welcome", body: { generation: 1, features: ["bridge-heartbeat", "bridge-restart", "recovery-status"] } }));
    await start;
    heartbeat?.(); heartbeat?.();
    bridge.prompt(true);
    expect(transport.sent.filter(message => message.type === "bridge.heartbeat").map(message => message.body.seq)).toEqual([1, 2]);
    expect(transport.sent.find(message => message.type === "bridge.prompt")?.body).toEqual({ interrupted: true });
    transport.emit("data", encodeResidentFrame({ type: "bridge.visibility", body: { visible: false } }));
    transport.emit("data", encodeResidentFrame({ type: "bridge.rename", body: { name: "fixed-name", nameSource: "user" } }));
    transport.emit("data", encodeResidentFrame({ type: "bridge.route", body: { route: "unknown" } }));
    transport.emit("data", encodeResidentFrame({ type: "bridge.route", body: { route: "settings" } }));
    transport.emit("data", encodeResidentFrame({ type: "bridge.stop", body: { deadlineMs: 5000 } }));
    expect(commands).toEqual([
      { type: "visibility", visible: false },
      { type: "rename", name: "fixed-name", nameSource: "user" },
      { type: "route", route: "settings" },
      { type: "stop", deadlineMs: 5000 },
    ]);
    transport.emit("data", encodeResidentFrame({ type: "attachment", body: { clientId: "client", controllerRevision: 7 } }));
    const restarting = bridge.requestRestart();
    const request = transport.sent.at(-1)!;
    expect(request).toMatchObject({ type: "bridge.request", body: { action: "restart", clientId: "client", controllerRevision: 7 } });
    if (request.requestId === undefined) throw new Error("restart request id missing");
    transport.emit("data", encodeResidentFrame({ type: "bridge.result", requestId: request.requestId, body: { accepted: true } }));
    await expect(restarting).resolves.toBe(true);
    const closing = bridge.requestClose();
    const closeRequest = transport.sent.at(-1)!;
    expect(closeRequest).toMatchObject({ type: "bridge.request", body: { action: "close", clientId: "client", controllerRevision: 7 } });
    if (closeRequest.requestId === undefined) throw new Error("close request id missing");
    transport.emit("data", encodeResidentFrame({ type: "bridge.result", requestId: closeRequest.requestId, body: { accepted: true } }));
    await expect(closing).resolves.toBe(true);
    const marker = "\x1bP+a1;controller=8;07070707070707070707070707070707\x1b\\";
    expect(bridge.consumeControllerBoundaryInput(`before${marker.slice(0, 12)}`)).toBe("before");
    expect(bridge.consumeControllerBoundaryInput(`${marker.slice(12)}after`)).toBe("after");
    expect(transport.sent.at(-1)).toMatchObject({
      type: "bridge.boundary",
      body: { generation: 8, nonce: Array(16).fill(7) },
    });
    // Invariant: a lone Esc reaches the child at once rather than waiting for the next key.
    expect(bridge.consumeControllerBoundaryInput("\x1b")).toBe("\x1b");
    expect(bridge.consumeControllerBoundaryInput("x")).toBe("x");
    expect(bridge.consumeControllerBoundaryInput("a\x1b")).toBe("a\x1b");
    const boundaries = transport.sent.filter(envelope => envelope.type === "bridge.boundary").length;
    expect(bridge.consumeControllerBoundaryInput(`k${marker.slice(0, 2)}`)).toBe("k");
    expect(bridge.consumeControllerBoundaryInput(marker.slice(2))).toBe("");
    expect(transport.sent.filter(envelope => envelope.type === "bridge.boundary")).toHaveLength(boundaries + 1);
    bridge.close();
  });

  it("falls back to process-level status with an older mixed-feature host", async () => {
    class Transport extends EventEmitter {
      readonly sent: ResidentEnvelope[] = [];
      write(bytes: Uint8Array) { this.sent.push(...new ResidentFrameDecoder().push(bytes)); return true; }
      destroy() { this.emit("close"); }
    }
    const transport = new Transport();
    let heartbeatScheduled = false;
    const bridge = new TabBridgeClient({
      credentials: { tabId: "tab-1", token: Buffer.alloc(32, 5).toString("base64"), endpoint: "fixture" },
      connect: () => transport,
      setInterval: callback => { heartbeatScheduled = true; return callback; },
    });
    const start = bridge.start(); transport.emit("connect");
    transport.emit("data", encodeResidentFrame({ type: "welcome", body: { generation: 1, features: [] } }));
    await expect(start).resolves.toBe(true);
    transport.emit("data", encodeResidentFrame({ type: "attachment", body: { clientId: "client", controllerRevision: 7 } }));
    bridge.status("working");
    bridge.status("stalled", true);
    await expect(bridge.requestRestart()).resolves.toBe(false);
    expect(heartbeatScheduled).toBe(false);
    expect(transport.sent.filter(message => message.type === "bridge.status")).toEqual([
      expect.objectContaining({ body: expect.objectContaining({ state: "working" }) }),
    ]);
    expect(transport.sent.some(message => message.type === "bridge.heartbeat")).toBe(false);
    expect(transport.sent.some(message => message.type === "bridge.request")).toBe(false);
    bridge.close();
  });

  it("returns an existing verified generation-1 host without starting another", async () => {
    const root = await temporaryDirectory("resident-existing-"); cleanups.push(root.cleanup);
    const { addon: executable, entry } = await developmentHost(root.path);
    const observed: string[][] = [];
    const result = await ensureTerminalHost({
      releaseRoot: root.path, profileRoot: root.path, dataDir: root.path, runtimeDir: root.path,
      environment: { A1_TERMINAL_HOST_PATH: executable, A1_DEV_INSTANCE_ID: "fixture" }, platform: "linux", architecture: "x64",
      run: async (_file, arguments_) => {
        observed.push([...arguments_]);
        return { code: 0, stdout: '{"outcome":"ready","generation":1,"endpoint":"/existing"}', stderr: "" };
      },
    });
    expect(result).toEqual({ status: "ready", executable: { executable: process.execPath, entry }, endpoint: "/existing" });
    expect(observed.map(arguments_ => arguments_.slice(0, 2))).toEqual([[entry, "probe"]]);
  });

  it("starts a missing host and waits for a verified generation-1 probe", async () => {
    const root = await temporaryDirectory("resident-host-"); cleanups.push(root.cleanup);
    const { addon: executable, entry } = await developmentHost(root.path);
    let probe = 0;
    const result = await ensureTerminalHost({
      releaseRoot: root.path, profileRoot: root.path, dataDir: root.path, runtimeDir: root.path,
      environment: { A1_TERMINAL_HOST_PATH: executable, A1_DEV_INSTANCE_ID: "fixture" }, platform: "linux", architecture: "x64", timeoutMs: 100,
      run: async (_file, arguments_) => arguments_[1] === "server"
        ? { code: 0, stdout: '{"verified":true,"endpoint":"/host"}', stderr: "" }
        : ++probe === 1
          ? { code: 2, stdout: '{"outcome":"not-running"}', stderr: "" }
          : { code: 0, stdout: '{"outcome":"ready","generation":1,"endpoint":"/host"}', stderr: "" },
    });
    expect(result).toEqual({ status: "ready", executable: { executable: process.execPath, entry }, endpoint: "/host" });
  });

  it.each([
    ["registry-unreadable", "registry unreadable"],
    ["blocked", "recovery blocked"],
  ] as const)("preserves the typed %s startup failure", async (reason, expected) => {
    const root = await temporaryDirectory("resident-failure-"); cleanups.push(root.cleanup);
    const { addon: executable } = await developmentHost(root.path);
    const result = await ensureTerminalHost({
      releaseRoot: root.path, profileRoot: root.path, dataDir: root.path, runtimeDir: root.path,
      environment: { A1_TERMINAL_HOST_PATH: executable, A1_DEV_INSTANCE_ID: "fixture" }, platform: "linux", architecture: "x64",
      run: async (_file, arguments_) => arguments_[1] === "probe"
        ? { code: 2, stdout: '{"outcome":"not-running"}', stderr: "" }
        : { code: 2, stdout: JSON.stringify({ outcome: "blocked", verified: false, reason }), stderr: "" },
    });
    expect(result).toEqual({ status: "fallback", reason: expected });
  });

  it("falls back for unsupported, missing, incompatible, unverified, failed, and timed-out hosts", async () => {
    const root = await temporaryDirectory("resident-outcomes-"); cleanups.push(root.cleanup);
    const executable = join(root.path, "terminal-host.node");
    const registry = join(root.path, "registry.json");
    await writeFile(registry, "existing-holder-sentinel");
    const base = {
      releaseRoot: root.path, profileRoot: root.path, dataDir: root.path, runtimeDir: root.path,
      environment: { A1_TERMINAL_HOST_PATH: executable, A1_DEV_INSTANCE_ID: "fixture" },
    };
    await expect(ensureTerminalHost({ ...base, platform: "freebsd", architecture: "x64" }))
      .resolves.toEqual({ status: "fallback", reason: "unsupported platform" });
    await expect(ensureTerminalHost({ ...base, platform: "linux", architecture: "x64" }))
      .resolves.toEqual({ status: "fallback", reason: "terminal host not installed" });
    await developmentHost(root.path);
    await expect(ensureTerminalHost({ ...base, platform: "linux", architecture: "x64", run: async () => ({
      code: 2, stdout: '{"outcome":"incompatible-generation"}', stderr: "",
    }) })).resolves.toEqual({ status: "fallback", reason: "incompatible generation" });
    await expect(ensureTerminalHost({ ...base, platform: "linux", architecture: "x64", run: async () => ({
      code: 0, stdout: '{"outcome":"ready","generation":2,"endpoint":"/older"}', stderr: "",
    }) })).resolves.toEqual({ status: "fallback", reason: "incompatible generation" });

    let calls = 0;
    await expect(ensureTerminalHost({ ...base, platform: "linux", architecture: "x64", run: async (_file, arguments_) => {
      calls++;
      return arguments_[1] === "probe"
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
        if (arguments_[1] === "server") return { code: 0, stdout: '{"verified":true,"endpoint":"/host"}', stderr: "" };
        phase++;
        return { code: 2, stdout: '{"outcome":"not-running"}', stderr: "" };
      },
    })).resolves.toEqual({ status: "fallback", reason: "host startup timed out" });
    expect(phase).toBeGreaterThanOrEqual(1);
    await expect(readFile(registry, "utf8")).resolves.toBe("existing-holder-sentinel");
  });
});

describe("resident tab shortcut publication", () => {
  class Transport extends EventEmitter {
    readonly sent: ResidentEnvelope[] = [];
    write(bytes: Uint8Array) { this.sent.push(...new ResidentFrameDecoder().push(bytes)); return true; }
    destroy() { this.emit("close"); }
  }

  it("publishes the effective projection once the host supports it and replays it after reconnect", async () => {
    const transports: Transport[] = [];
    const bridge = new TabBridgeClient({
      credentials: { tabId: "tab-1", token: Buffer.alloc(32, 9).toString("base64"), endpoint: "fixture" },
      connect: () => { const transport = new Transport(); transports.push(transport); return transport; },
    });
    const first = bridge.start();
    transports[0]!.emit("connect");
    expect(transports[0]!.sent[0]?.body["features"]).toContain("bridge-shortcuts");
    transports[0]!.emit("data", encodeResidentFrame({ type: "welcome", body: { generation: 1, build: "host", features: [] } }));
    await expect(first).resolves.toBe(true);
    bridge.shortcuts({ "tabs.new": "alt+a", "tabs.next": null });
    expect(transports[0]!.sent.map(message => message.type)).not.toContain("bridge.shortcuts");
    transports[0]!.emit("close");
    const second = bridge.start();
    transports[1]!.emit("connect");
    transports[1]!.emit("data", encodeResidentFrame({ type: "welcome", body: { generation: 1, build: "host", features: ["bridge-shortcuts"] } }));
    await expect(second).resolves.toBe(true);
    expect(transports[1]!.sent.find(message => message.type === "bridge.shortcuts")?.body).toEqual({
      assignments: [["tabs.new", "alt+a"], ["tabs.next", null]],
    });
    bridge.shortcuts({ "tabs.new": null });
    expect(transports[1]!.sent.filter(message => message.type === "bridge.shortcuts").at(-1)?.body).toEqual({
      assignments: [["tabs.new", null]],
    });
    bridge.close();
  });
});
