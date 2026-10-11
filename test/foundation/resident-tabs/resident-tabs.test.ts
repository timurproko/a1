import { EventEmitter } from "node:events";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TabBridgeClient } from "../../../src/foundation/resident-tabs/bridge-client.js";
import { encodeResidentFrame, ResidentFrameDecoder, type ResidentEnvelope } from "../../../src/foundation/resident-tabs/protocol.js";
import { ensureTerminalHost } from "../../../src/foundation/resident-tabs/ensure-terminal-host.js";
import { readResidentTabsSetting } from "../../../src/foundation/resident-tabs/settings.js";

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
    await writeFile(join(root.path, "settings", "a1.json"), JSON.stringify({ version: 14, values: { residentTabs: true } }));
    expect(await readResidentTabsSetting(root.path)).toBe(true);
    await writeFile(join(root.path, "settings", "a1.json"), JSON.stringify({ version: 13, values: { residentTabs: true } }));
    expect(await readResidentTabsSetting(root.path)).toBe(false);
    await writeFile(join(root.path, "settings", "a1.json"), JSON.stringify({ version: 14, values: { residentTabs: "yes" } }));
    expect(await readResidentTabsSetting(root.path)).toBe(false);
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
});
