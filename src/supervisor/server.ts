import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { createConnection, createServer, type Server, type Socket } from "node:net";
import { platform } from "node:os";
import {
  assertNativeProcessIdentity,
  assertTransparentTerminalLaunchProfile,
  type CommandResult,
  type ForegroundTerminalLease,
  type SupervisorCommand,
  type SupervisorSnapshot,
} from "../domain/index.js";
import { encodeFrame, isCommandMessage, isControlHello, LineFrameDecoder, localControlHello, MAX_CONTROL_FRAME_BYTES, negotiateControlFeatures, type ServerMessage } from "../protocol/index.js";
import type { MaterializedRelease } from "../release-store.js";
import { ControlStore } from "../storage/index.js";
import { resolveAddOnePaths, type AddOnePaths } from "./paths.js";

export class SupervisorServer {
  readonly id = randomUUID();
  readonly bootNonce: string;
  readonly pidStartIdentity = `${process.pid}:${Math.floor(Date.now() - process.uptime() * 1_000)}`;
  readonly startedAt = new Date().toISOString();
  readonly paths: AddOnePaths;
  #server: Server | null = null;
  #foregroundLease: ForegroundTerminalLease | null;
  #revision = 0;
  #clients = new Set<Socket>();
  #results = new Map<string, CommandResult>();
  #metadataWrites: Promise<void> = Promise.resolve();

  constructor(
    readonly store: ControlStore,
    paths = resolveAddOnePaths(),
    readonly release: MaterializedRelease,
    bootNonce: string = randomUUID(),
    readonly terminateProcess: (code: number) => void = code => process.exit(code),
  ) {
    this.bootNonce = bootNonce;
    this.paths = paths;
    this.#foregroundLease = store.loadLiveForegroundTerminalLease();
  }

  snapshot(): SupervisorSnapshot {
    return { revision: this.#revision };
  }

  async listen(): Promise<void> {
    if (this.#server) throw new Error("supervisor is already listening");
    await mkdir(this.paths.runtimeDir, { recursive: true, mode: 0o700 });
    if (platform() !== "win32") {
      if (await endpointIsLive(this.paths.endpoint)) throw new Error(`an AddOne supervisor already owns ${this.paths.endpoint}`);
      await rm(this.paths.endpoint, { force: true });
    }
    const server = createServer(socket => this.#attach(socket));
    this.#server = server;
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(this.paths.endpoint, () => {
        server.off("error", reject);
        resolve();
      });
    });
    await this.#writeEndpointMetadata();
  }

  async close(stopAgents = false): Promise<void> {
    if (stopAgents && this.#foregroundLease) this.#releaseForegroundLeaseForUpdate();
    for (const client of this.#clients) client.destroy();
    if (this.#server) await new Promise<void>(resolve => this.#server?.close(() => resolve()));
    this.#server = null;
    this.store.close();
    await this.#metadataWrites;
    await rm(this.paths.endpointMetadataPath, { force: true });
    if (platform() !== "win32") await rm(this.paths.endpoint, { force: true });
  }

  async closeForReleaseReplacement(stopAgents: boolean): Promise<void> {
    await this.close(stopAgents);
    this.terminateProcess(0);
  }

  #attach(socket: Socket): void {
    socket.setNoDelay(true);
    const decoder = new LineFrameDecoder();
    let welcomed = false;
    socket.on("data", chunk => {
      try {
        for (const value of decoder.push(chunk)) {
          if (!welcomed) {
            if (isMessageType(value, "identity-probe")) {
              this.#send(socket, { type: "identity", supervisorId: this.id, bootNonce: this.bootNonce, pidStartIdentity: this.pidStartIdentity, releaseId: this.release.releaseId });
              continue;
            }
            if (isMessageType(value, "release-idle-ownership")) {
              const request = value as { bootNonce?: unknown; candidateReleaseId?: unknown };
              const identityMatches = request.bootNonce === this.bootNonce && typeof request.candidateReleaseId === "string";
              const released = identityMatches && this.#foregroundLease === null;
              this.#send(socket, {
                type: "release-ownership-result",
                released,
                reason: released ? "idle cohort released ownership"
                  : identityMatches ? "foreground terminal lease is still live" : "boot nonce or candidate release mismatch",
                liveGenerationIds: this.#liveGenerationIds(),
              });
              if (released) setTimeout(() => void this.closeForReleaseReplacement(false), 25);
              continue;
            }
            if (isMessageType(value, "release-update-ownership")) {
              const request = value as { bootNonce?: unknown; targetVersion?: unknown };
              const accepted = request.bootNonce === this.bootNonce && typeof request.targetVersion === "string";
              this.#send(socket, {
                type: "release-update-result",
                accepted,
                reason: accepted ? "verified AddOne owner accepted immediate update shutdown" : "boot nonce or target version mismatch",
                liveGenerationIds: this.#liveGenerationIds(),
              });
              if (accepted) setTimeout(() => void this.closeForReleaseReplacement(true), 25);
              continue;
            }
            if (!isControlHello(value)) {
              this.#send(socket, { type: "protocol-error", code: "invalid-control-handshake", message: "the first message must be a valid AddOne control feature handshake", diagnostics: { received: value } });
              socket.destroy();
              return;
            }
            const serverHello = localControlHello();
            const negotiation = negotiateControlFeatures(value, serverHello);
            if (!negotiation.ok) {
              this.#send(socket, { type: "protocol-error", code: "incompatible-control-features", message: negotiation.diagnostic, diagnostics: negotiation });
              socket.destroy();
              return;
            }
            welcomed = true;
            this.#clients.add(socket);
            this.#send(socket, { type: "server-hello", ...serverHello, releaseId: this.release.releaseId, supervisorId: this.id, bootNonce: this.bootNonce, pidStartIdentity: this.pidStartIdentity, negotiatedFeatures: negotiation.negotiatedFeatures, snapshot: this.snapshot() });
          } else if (isCommandMessage(value)) {
            void this.#execute(value.command, socket);
          }
        }
      } catch (error) {
        this.#send(socket, { type: "protocol-error", code: "framing-error", message: error instanceof Error ? error.message : String(error) });
        socket.destroy();
      }
    });
    socket.on("close", () => this.#clients.delete(socket));
    socket.on("error", () => this.#clients.delete(socket));
  }

  async #execute(command: SupervisorCommand, socket: Socket): Promise<void> {
    const recorded = this.#results.get(command.requestId);
    if (recorded) {
      this.#send(socket, { type: "command-result", result: recorded });
      return;
    }
    let result: CommandResult;
    try {
      if (command.type === "acquire-foreground-terminal-lease") this.#acquireForegroundLease(command);
      if (command.type === "activate-foreground-terminal-lease") this.#activateForegroundLease(command);
      if (command.type === "heartbeat-foreground-terminal-lease") this.#heartbeatForegroundLease(command);
      if (command.type === "release-foreground-terminal-lease") this.#releaseForegroundLease(command);
      if (command.type === "resynchronize") this.#send(socket, { type: "snapshot", snapshot: this.snapshot() });
      await this.#metadataWrites;
      result = { requestId: command.requestId, ok: true, revision: this.#revision };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = /not found/i.test(message) ? "not-found" : "driver-error";
      result = { requestId: command.requestId, ok: false, revision: this.#revision, error: { code, message } };
    }
    this.#results.set(command.requestId, result);
    this.#send(socket, { type: "command-result", result });
  }

  #acquireForegroundLease(command: Extract<SupervisorCommand, { type: "acquire-foreground-terminal-lease" }>): void {
    if (!command.leaseId || !command.ownerId) throw new Error("foreground lease and owner identities are required");
    assertTransparentTerminalLaunchProfile(command.profile);
    const lease: ForegroundTerminalLease = {
      id: command.leaseId,
      ownerId: command.ownerId,
      profile: command.profile,
      state: "requested",
      generationId: null,
      processIdentity: null,
      acquiredAt: new Date().toISOString(),
      heartbeatAt: null,
      releasedAt: null,
      outcome: null,
    };
    this.store.acquireForegroundTerminalLease(lease);
    this.#foregroundLease = lease;
    void this.#writeEndpointMetadata();
  }

  #activateForegroundLease(command: Extract<SupervisorCommand, { type: "activate-foreground-terminal-lease" }>): void {
    assertNativeProcessIdentity(command.processIdentity);
    if (!this.#foregroundLease || this.#foregroundLease.id !== command.leaseId || this.#foregroundLease.state !== "requested") throw new Error("foreground terminal lease not found or is not requested");
    const heartbeatAt = new Date().toISOString();
    if (!this.store.activateForegroundTerminalLease(command.leaseId, command.generationId, command.processIdentity, heartbeatAt)) throw new Error("foreground terminal lease activation was rejected");
    this.#foregroundLease = { ...this.#foregroundLease, state: "active", generationId: command.generationId, processIdentity: command.processIdentity, heartbeatAt };
    void this.#writeEndpointMetadata();
  }

  #heartbeatForegroundLease(command: Extract<SupervisorCommand, { type: "heartbeat-foreground-terminal-lease" }>): void {
    assertNativeProcessIdentity(command.processIdentity);
    if (!this.#foregroundLease || this.#foregroundLease.id !== command.leaseId || this.#foregroundLease.state !== "active") throw new Error("active foreground terminal lease not found");
    const heartbeatAt = new Date().toISOString();
    if (!this.store.heartbeatForegroundTerminalLease(command.leaseId, command.processIdentity, heartbeatAt)) throw new Error("foreground terminal lease ownership mismatch");
    this.#foregroundLease = { ...this.#foregroundLease, heartbeatAt };
  }

  #releaseForegroundLease(command: Extract<SupervisorCommand, { type: "release-foreground-terminal-lease" }>): void {
    if (command.processIdentity) assertNativeProcessIdentity(command.processIdentity);
    if (!this.#foregroundLease || this.#foregroundLease.id !== command.leaseId) throw new Error("foreground terminal lease not found");
    const releasedAt = new Date().toISOString();
    if (!this.store.releaseForegroundTerminalLease(command.leaseId, command.processIdentity, command.outcome, releasedAt)) throw new Error("foreground terminal lease ownership mismatch");
    this.#foregroundLease = null;
    void this.#writeEndpointMetadata();
  }

  #releaseForegroundLeaseForUpdate(): void {
    const lease = this.#foregroundLease;
    if (!lease) return;
    const outcome = { kind: "stopped", reason: "update" } as const;
    if (!this.store.releaseForegroundTerminalLease(lease.id, lease.processIdentity, outcome, new Date().toISOString())) throw new Error("foreground terminal lease update shutdown was rejected");
    this.#foregroundLease = null;
  }

  #liveGenerationIds(): string[] {
    return this.#foregroundLease?.generationId ? [this.#foregroundLease.generationId] : [];
  }

  #writeEndpointMetadata(): Promise<void> {
    const metadata = {
      ...localControlHello(this.release.releaseId),
      supervisorId: this.id,
      pid: process.pid,
      pidStartIdentity: this.pidStartIdentity,
      bootNonce: this.bootNonce,
      endpoint: this.paths.endpoint,
      databasePath: this.paths.databasePath,
      startedAt: this.startedAt,
      releaseId: this.release.releaseId,
      releaseRoot: this.release.releaseRoot,
      contentDigest: this.release.contentDigest,
      ownership: {
        state: this.#foregroundLease ? "busy" : "idle",
        liveGenerationIds: this.#liveGenerationIds(),
        nonResumableGenerationIds: this.#liveGenerationIds(),
      },
    };
    const temporary = `${this.paths.endpointMetadataPath}.${process.pid}.tmp`;
    this.#metadataWrites = this.#metadataWrites.then(async () => {
      await writeFile(temporary, JSON.stringify(metadata, null, 2), { mode: 0o600 });
      await rename(temporary, this.paths.endpointMetadataPath);
    });
    return this.#metadataWrites;
  }

  #send(socket: Socket, message: ServerMessage): void {
    if (socket.destroyed) return;
    const frame = encodeFrame(message);
    const bytes = Buffer.byteLength(frame, "utf8");
    if (bytes > MAX_CONTROL_FRAME_BYTES || socket.writableLength + bytes > MAX_CONTROL_FRAME_BYTES * 2) {
      socket.destroy(new Error("slow client exceeded the bounded control/output queue"));
      return;
    }
    socket.write(frame);
  }
}

function isMessageType(value: unknown, type: string): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && "type" in value && value.type === type;
}

async function endpointIsLive(endpoint: string): Promise<boolean> {
  return await new Promise(resolve => {
    const socket = createConnection(endpoint);
    const done = (live: boolean) => { socket.destroy(); resolve(live); };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    setTimeout(() => done(false), 250).unref();
  });
}
