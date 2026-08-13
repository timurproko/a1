import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { createConnection, createServer, type Server, type Socket } from "node:net";
import { platform } from "node:os";
import type {
  AddOneEvent,
  AgentId,
  CommandResult,
  GenerationId,
  LogicalTerminalAgent,
  LogicalWorkspace,
  OrderedEvent,
  SupervisorCommand,
  SupervisorSnapshot,
} from "../domain/index.js";
import { encodeFrame, isCommandMessage, isControlHello, LineFrameDecoder, localControlHello, MAX_CONTROL_FRAME_BYTES, negotiateControlFeatures, type ServerMessage } from "../protocol/index.js";
import type { MaterializedRelease } from "../release-store.js";
import { ControlStore } from "../storage/index.js";
import { resolveAddOnePaths, type AddOnePaths } from "./paths.js";

/** Lifecycle-only supervisor used while terminal execution is unavailable. */
export class SupervisorServer {
  readonly id = randomUUID();
  readonly bootNonce: string;
  readonly pidStartIdentity = `${process.pid}:${Math.floor(Date.now() - process.uptime() * 1_000)}`;
  readonly startedAt = new Date().toISOString();
  readonly paths: AddOnePaths;
  #server: Server | null = null;
  #workspace: LogicalWorkspace;
  #agents: LogicalTerminalAgent[];
  #revision = 0;
  #clients = new Set<Socket>();
  #results = new Map<string, CommandResult>();
  #metadataWrites: Promise<void> = Promise.resolve();

  constructor(
    readonly store: ControlStore,
    paths = resolveAddOnePaths(),
    readonly release: MaterializedRelease,
    bootNonce = randomUUID(),
    readonly terminateProcess: (code: number) => void = code => process.exit(code),
  ) {
    this.bootNonce = bootNonce;
    this.paths = paths;
    this.#workspace = store.loadWorkspace();
    this.#agents = store.loadAgents();
  }

  snapshot(): SupervisorSnapshot {
    return boundInitialSupervisorSnapshot({ revision: this.#revision, workspace: this.#workspace, agents: this.#agents });
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

  async close(_stopAgents = false): Promise<void> {
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
              const released = request.bootNonce === this.bootNonce && typeof request.candidateReleaseId === "string";
              this.#send(socket, {
                type: "release-ownership-result",
                released,
                reason: released ? "lifecycle-only cohort released ownership" : "boot nonce or candidate release mismatch",
                liveGenerationIds: [],
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
                liveGenerationIds: [],
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
      if (command.type === "create-terminal-agent" || command.type === "ensure-initial-terminal-agent") {
        throw new Error("terminal capability is unavailable during redesign");
      }
      if (command.type === "stop-agent") this.#stopRecordedGeneration(command.agentId, command.generationId);
      if (command.type === "resynchronize") this.#send(socket, { type: "snapshot", snapshot: this.snapshot() });
      result = { requestId: command.requestId, ok: true, revision: this.#revision };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = /capability is unavailable/i.test(message) ? "capability-error"
        : /stale generation/i.test(message) ? "stale-generation"
          : /not found/i.test(message) ? "not-found" : "driver-error";
      result = { requestId: command.requestId, ok: false, revision: this.#revision, error: { code, message } };
    }
    this.#results.set(command.requestId, result);
    this.#send(socket, { type: "command-result", result });
  }

  #stopRecordedGeneration(agentId: AgentId, generationId: GenerationId): void {
    const agent = this.#agents.find(candidate => candidate.id === agentId);
    if (!agent) throw new Error(`agent ${agentId} not found`);
    if (agent.currentGeneration.id !== generationId) throw new Error(`stale generation ${generationId}`);
    if (["exited", "stopped", "interrupted", "error"].includes(agent.currentGeneration.state)) return;
    this.store.markGeneration(agentId, generationId, "stopped");
    this.#agents = this.#agents.map(candidate => candidate.id === agentId ? {
      ...candidate,
      currentGeneration: { ...candidate.currentGeneration, state: "stopped", exitedAt: new Date().toISOString() },
    } : candidate);
    this.#publish({ type: "generation-exited", agentId, generationId, exitCode: null, signal: null });
  }

  #publish(event: AddOneEvent): void {
    const ordered: OrderedEvent = { revision: ++this.#revision, event };
    for (const client of this.#clients) this.#send(client, { type: "event", ordered });
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
      ownership: { state: "idle", liveGenerationIds: [], nonResumableGenerationIds: [] },
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

export function boundInitialSupervisorSnapshot(snapshot: SupervisorSnapshot): SupervisorSnapshot {
  const selected = snapshot.agents.find(agent => agent.id === snapshot.workspace.selectedAgentId);
  const active = selected && !["exited", "stopped", "interrupted", "error"].includes(selected.currentGeneration.state) ? selected : null;
  const agents = active ? [active] : [];
  return { ...snapshot, workspace: { ...snapshot.workspace, selectedAgentId: active?.id ?? null, agentIds: agents.map(agent => agent.id) }, agents };
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
