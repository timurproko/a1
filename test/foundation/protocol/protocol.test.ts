import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SupervisorClient } from "../../../src/foundation/protocol/index.js";
import { CONTROL_ENVELOPE, encodeFrame, GENERATED_CONTRACT_DIGEST, isControlHello, LineFrameDecoder, localControlHello, negotiateControlFeatures } from "../../../src/foundation/protocol/index.js";

describe("A1 additive protocol framing", () => {
  it("decodes partial and combined LF frames", () => {
    const decoder = new LineFrameDecoder();
    const frame = encodeFrame({ type: "client-hello", clientId: "ui-1", ...localControlHello("release-a") });
    expect(decoder.push(frame.slice(0, 4))).toEqual([]);
    expect(decoder.push(`${frame.slice(4)}${frame}`)).toHaveLength(2);
  });

  it("round-trips lifecycle commands and stop intent without terminal input or rendering payloads", () => {
    const decoder = new LineFrameDecoder();
    const decoded = decoder.push([
      encodeFrame({
        type: "command",
        command: {
          type: "create-launch-instance",
          requestId: "create-1",
          instanceId: "instance-1",
          profileId: "sandbox",
          shutdownPolicy: "terminate-tree-on-close",
          guardianIdentity: { pid: 101, startIdentity: "101:start" },
        },
      }),
      encodeFrame({ type: "stop-launch-instance", requestId: "stop-1", instanceId: "instance-1", reason: "update" }),
    ].join("")) as Record<string, unknown>[];
    expect(decoded[0]).toMatchObject({ type: "command", command: { type: "create-launch-instance", requestId: "create-1" } });
    expect(decoded[1]).toMatchObject({ type: "stop-launch-instance", instanceId: "instance-1", reason: "update" });
    expect(JSON.stringify(decoded)).not.toMatch(/terminal-input|render-transaction|surface|dataBase64/);
  });

  it("negotiates required features independently from contract diagnostic differences", () => {
    const local = localControlHello("release-a");
    const additivePeer = { ...local, contractDigest: "different-generated-digest", optionalFeatures: [...local.optionalFeatures, "future.optional.v1"] };
    expect(negotiateControlFeatures(local, additivePeer)).toMatchObject({ ok: true });
    expect(GENERATED_CONTRACT_DIGEST).toMatch(/^[a-f0-9]{64}$/);
    expect(local.requiredFeatures).toContain("generation.lifecycle.v1");
    expect(local.requiredFeatures).toContain("launch.instance-lifecycle.v1");
    expect(local.requiredFeatures).not.toContain("terminal.foreground-lease.v1");
    expect(local.requiredFeatures.join(" ")).not.toMatch(/terminal\.(?:virtual-state|render-transactions|input-batch)/);

    const incompatiblePeer = { ...local, requiredFeatures: [...local.requiredFeatures, "future.required.v1"] };
    const result = negotiateControlFeatures(local, incompatiblePeer);
    expect(result.ok).toBe(false);
    expect(result.missingFromClient).toEqual(["future.required.v1"]);
    expect(result.diagnostic).not.toMatch(/invalid client message/i);
  });

  it("rejects the legacy control envelope without migration", () => {
    const current = localControlHello();
    const legacy = { type: "client-hello", clientId: "legacy", ...current, envelope: "addone-control-envelope" };

    expect(CONTROL_ENVELOPE).toBe("a1-control-envelope");
    expect(isControlHello(legacy)).toBe(false);
    expect(negotiateControlFeatures(legacy as typeof current, current)).toMatchObject({ ok: false });
  });

  it("retains unknown additive fields", () => {
    const decoder = new LineFrameDecoder();
    expect(decoder.push('{"type":"future-event","newField":true}\n')).toEqual([{ type: "future-event", newField: true }]);
  });

  it("retries when the verified supervisor endpoint disappears before the client connects", async () => {
    const identity = randomUUID();
    const endpoint = process.platform === "win32" ? `\\\\.\\pipe\\a1-client-retry-${identity}` : join(tmpdir(), `a1-cr-${identity.slice(0, 8)}.sock`);
    const server = createServer(socket => {
      socket.once("data", () => socket.write(encodeFrame({
        type: "server-hello",
        ...localControlHello(),
        snapshot: { revision: 0, activeInstances: [] },
      })));
    });
    const client = new SupervisorClient();
    const listening = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => server.listen(endpoint, resolve), 60);
      server.once("error", error => { clearTimeout(timer); reject(error); });
    });
    try {
      const connected = client.connect(endpoint, 1_000);
      await listening;
      await expect(connected).resolves.toEqual({ revision: 0, activeInstances: [] });
    } finally {
      client.close();
      if (server.listening) {
        server.close();
        await once(server, "close");
      }
      if (process.platform !== "win32") await rm(endpoint, { force: true });
    }
  });
});
