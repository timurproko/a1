import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SupervisorClient } from "../../src/protocol/client.js";
import { boundInitialSupervisorSnapshot } from "../../src/supervisor/server.js";
import { encodeFrame, GENERATED_CONTRACT_DIGEST, LineFrameDecoder, localControlHello, MAX_CONTROL_FRAME_BYTES, negotiateControlFeatures } from "../../src/protocol/messages.js";

describe("additive protocol framing", () => {
  it("decodes partial and combined LF frames", () => {
    const decoder = new LineFrameDecoder();
    const frame = encodeFrame({ type: "client-hello", clientId: "ui-1", ...localControlHello("release-a") });
    expect(decoder.push(frame.slice(0, 4))).toEqual([]);
    expect(decoder.push(`${frame.slice(4)}${frame}`)).toHaveLength(2);
  });

  it("round-trips semantic terminal input without child-protocol bytes", () => {
    const decoder = new LineFrameDecoder();
    const event = { type: "key" as const, key: "c", text: null, modifiers: { shift: false, alt: false, control: true, meta: false }, action: "press" as const };
    const [decoded] = decoder.push(encodeFrame({
      type: "command",
      command: {
        type: "terminal-input",
        requestId: "input-1",
        agentId: "agent-1",
        generationId: "generation-1",
        event,
      },
    })) as [{ command: { event: typeof event } }];
    expect(decoded.command.event).toEqual(event);
    expect(decoded).not.toHaveProperty("command.dataBase64");
  });

  it("round-trips batched semantic terminal input without per-character control requests", () => {
    const decoder = new LineFrameDecoder();
    const events = ["f", "a", "s", "t"].map(text => ({
      type: "key" as const, key: text, text,
      modifiers: { shift: false, alt: false, control: false, meta: false }, action: "press" as const,
    }));
    const [decoded] = decoder.push(encodeFrame({
      type: "command",
      command: { type: "terminal-input-batch", requestId: "batch-1", agentId: "agent-1", generationId: "generation-1", events },
    })) as [{ command: { events: typeof events } }];
    expect(decoded.command.events).toEqual(events);
  });

  it("negotiates required features independently from contract diagnostic differences", () => {
    const local = localControlHello("release-a");
    const additivePeer = { ...local, contractDigest: "different-generated-digest", optionalFeatures: [...local.optionalFeatures, "future.optional.v1"] };
    expect(negotiateControlFeatures(local, additivePeer)).toMatchObject({ ok: true });
    expect(GENERATED_CONTRACT_DIGEST).toMatch(/^[a-f0-9]{64}$/);

    const incompatiblePeer = { ...local, requiredFeatures: [...local.requiredFeatures, "future.required.v1"] };
    const result = negotiateControlFeatures(local, incompatiblePeer);
    expect(result.ok).toBe(false);
    expect(result.missingFromClient).toEqual(["future.required.v1"]);
    expect(result.diagnostic).not.toMatch(/invalid client message/i);
  });

  it("retains unknown additive fields", () => {
    const decoder = new LineFrameDecoder();
    expect(decoder.push('{"type":"future-event","newField":true}\n')).toEqual([{ type: "future-event", newField: true }]);
  });

  it("keeps accumulated exited-session handshakes below the bounded control frame", () => {
    const surface = {
      columns: 123,
      rows: 29,
      cells: Array.from({ length: 29 }, () => Array.from({ length: 123 }, () => ({ character: "X", width: 1 as const, foreground: { mode: "rgb" as const, value: 0x666666 }, attributes: 0 }))),
      cursor: { column: 0, row: 0, visible: true, style: "block" as const, blinking: true },
      activeScreen: "normal" as const,
      modes: { applicationCursorKeys: false, applicationKeypad: false, alternateScroll: false, bracketedPaste: false, focusReporting: false, mouseTracking: "none" as const, mouseProtocol: "x10" as const, synchronizedOutput: false, wraparound: true, keyboardProtocol: "legacy" as const, modifyOtherKeys: 0 as const, kittyKeyboardFlags: 0, win32InputMode: false },
      outputSequence: 1,
      revision: 1,
      final: true,
    };
    const agents = Array.from({ length: 21 }, (_, index) => ({
      id: `agent-${index}`, workspaceId: "workspace-test", name: `Native Pi ${index + 1}`, driverKind: "terminal" as const,
      profile: { id: `profile-${index}`, kind: "native-pi" as const, executable: "pi", arguments: [], cwd: ".", environment: {}, terminalType: "xterm-256color", dimensions: { columns: 123, rows: 29 }, projection: { layout: "full-viewport-native" as const, screen: "auto" as const, preserveHostScrollback: true }, conptyMouseFallback: "none" as const, resume: "none" as const },
      currentGeneration: { id: `generation-${index}`, agentId: `agent-${index}`, sequence: 1, profileId: `profile-${index}`, state: "exited" as const, capabilities: ["terminal-surface" as const], startedAt: new Date(0).toISOString(), exitedAt: new Date(0).toISOString(), exitCode: 0, signal: null, error: null, ownerBootNonce: "old" },
      surface,
      createdAt: new Date(0).toISOString(),
    }));
    const accumulated = { revision: 0, workspace: { id: "workspace-test", name: "Test", agentIds: agents.map(agent => agent.id), selectedAgentId: agents.at(-1)?.id ?? null, createdAt: new Date(0).toISOString() }, agents };
    const frame = encodeFrame({ type: "server-hello", ...localControlHello(), snapshot: boundInitialSupervisorSnapshot(accumulated) });

    expect(boundInitialSupervisorSnapshot(accumulated)).toMatchObject({
      workspace: { selectedAgentId: null, agentIds: [] },
      agents: [],
    });
    expect(Buffer.byteLength(frame, "utf8")).toBeLessThanOrEqual(MAX_CONTROL_FRAME_BYTES);
  });

  it("retries when the verified supervisor endpoint disappears before the UI connects", async () => {
    const identity = randomUUID();
    const endpoint = process.platform === "win32" ? `\\\\.\\pipe\\addone-client-retry-${identity}` : join(tmpdir(), `addone-client-retry-${identity}.sock`);
    const server = createServer(socket => {
      socket.once("data", () => socket.write(encodeFrame({
        type: "server-hello",
        ...localControlHello(),
        snapshot: { revision: 0, workspace: { id: "workspace-test", name: "Test", agentIds: [], selectedAgentId: null, createdAt: "2026-01-01T00:00:00.000Z" }, agents: [] },
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
      await expect(connected).resolves.toMatchObject({ revision: 0, agents: [] });
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
