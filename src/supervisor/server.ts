import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { createConnection, createServer, type Server, type Socket } from "node:net";
import { platform } from "node:os";
import type {
  AddOneEvent,
  AgentId,
  CommandResult,
  GenerationId,
  HostTerminalInputEvent,
  LogicalTerminalAgent,
  LogicalWorkspace,
  NativePiProfile,
  OrderedEvent,
  ProcessGeneration,
  SupervisorCommand,
  SupervisorSnapshot,
  TerminalDriver,
  TerminalDriverEvent,
  TerminalDriverHandle,
} from "../domain/index.js";
import { assertDimensions, FULL_VIEWPORT_NATIVE_PROJECTION } from "../domain/index.js";
import { encodeFrame, isCommandMessage, isControlHello, LineFrameDecoder, localControlHello, MAX_CONTROL_FRAME_BYTES, negotiateControlFeatures, type ServerMessage } from "../protocol/index.js";
import { ControlStore } from "../storage/index.js";
import type { MaterializedRelease } from "../release-store.js";
import { resolveAddOnePaths, type AddOnePaths } from "./paths.js";

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
  #handles = new Map<AgentId, TerminalDriverHandle>();
  #results = new Map<string, CommandResult>();
  #ensuringInitialAgent: Promise<void> | null = null;
  #metadataWrites: Promise<void> = Promise.resolve();

  constructor(
    readonly store: ControlStore,
    readonly driver: TerminalDriver,
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
    return { revision: this.#revision, workspace: this.#workspace, agents: this.#agents };
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
    if (stopAgents) await Promise.all([...this.#handles.values()].map(handle => handle.stop()));
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
    // A detached supervisor is a dedicated process. Closing its server and
    // database is not sufficient proof that every native/platform handle lets
    // Node's event loop drain promptly, so release replacement terminates only
    // after owned resources and endpoint metadata have been closed.
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
            if (typeof value === "object" && value !== null && "type" in value && value.type === "identity-probe") {
              this.#send(socket, { type: "identity", supervisorId: this.id, bootNonce: this.bootNonce, pidStartIdentity: this.pidStartIdentity, releaseId: this.release.releaseId });
              continue;
            }
            if (typeof value === "object" && value !== null && "type" in value && value.type === "release-idle-ownership") {
              const request = value as { bootNonce?: unknown; candidateReleaseId?: unknown };
              const liveGenerationIds = this.#liveHandleGenerationIds();
              const released = request.bootNonce === this.bootNonce && typeof request.candidateReleaseId === "string" && liveGenerationIds.length === 0;
              this.#send(socket, {
                type: "release-ownership-result",
                released,
                reason: released ? "idle cohort released ownership" : request.bootNonce !== this.bootNonce ? "boot nonce mismatch" : "live generations prevent ownership release",
                liveGenerationIds,
              });
              if (released) setTimeout(() => void this.closeForReleaseReplacement(false), 25);
              continue;
            }
            if (typeof value === "object" && value !== null && "type" in value && value.type === "release-update-ownership") {
              const request = value as { bootNonce?: unknown; targetVersion?: unknown };
              const liveGenerationIds = this.#liveHandleGenerationIds();
              const accepted = request.bootNonce === this.bootNonce && typeof request.targetVersion === "string";
              this.#send(socket, {
                type: "release-update-result",
                accepted,
                reason: accepted ? "verified AddOne owner accepted immediate update shutdown" : "boot nonce or target version mismatch",
                liveGenerationIds,
              });
              if (accepted) setTimeout(() => void this.closeForReleaseReplacement(true), 25);
              continue;
            }
            if (!isControlHello(value)) {
              this.#send(socket, {
                type: "protocol-error",
                code: "invalid-control-handshake",
                message: "the first message must be a valid AddOne control feature handshake",
                diagnostics: { received: value },
              });
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
          // Unknown post-handshake message types are additive and ignored safely.
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
      if (command.type === "create-terminal-agent") {
        assertDimensions(command.dimensions);
        await this.#createAgent(command.cwd, command.dimensions);
      } else if (command.type === "ensure-initial-terminal-agent") {
        assertDimensions(command.dimensions);
        await this.#ensureInitialAgent(command.cwd, command.dimensions);
      } else if (command.type === "terminal-input") {
        assertHostInputEvent(command.event);
        this.#currentHandle(command.agentId, command.generationId).input(command.event);
      } else if (command.type === "terminal-input-batch") {
        if (command.events.length === 0 || command.events.length > 4_096) throw new Error("terminal input batch size is invalid");
        for (const event of command.events) assertHostInputEvent(event);
        this.#currentHandle(command.agentId, command.generationId).inputBatch(command.events);
      } else if (command.type === "terminal-resize") {
        assertDimensions(command.dimensions);
        this.#currentHandle(command.agentId, command.generationId).resize(command.dimensions);
      } else if (command.type === "stop-agent") {
        await this.#currentHandle(command.agentId, command.generationId).stop();
      } else if (command.type === "resynchronize") {
        this.#send(socket, { type: "snapshot", snapshot: this.snapshot() });
      }
      result = { requestId: command.requestId, ok: true, revision: this.#revision };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = /stale generation/i.test(message) ? "stale-generation" : /not found/i.test(message) ? "not-found" : "driver-error";
      result = { requestId: command.requestId, ok: false, revision: this.#revision, error: { code, message } };
    }
    this.#results.set(command.requestId, result);
    this.#send(socket, { type: "command-result", result });
  }

  async #ensureInitialAgent(cwd: string, dimensions: { columns: number; rows: number }): Promise<void> {
    const selected = this.#agents.find(agent => agent.id === this.#workspace.selectedAgentId);
    const resident = selected ? this.#handles.get(selected.id) : undefined;
    if (selected && resident && !["exited", "stopped", "error"].includes(selected.currentGeneration.state)) {
      resident.resize(dimensions);
      return;
    }
    if (!this.#ensuringInitialAgent) {
      this.#ensuringInitialAgent = this.#createAgent(cwd, dimensions).finally(() => { this.#ensuringInitialAgent = null; });
    }
    await this.#ensuringInitialAgent;
  }

  async #createAgent(cwd: string, dimensions: { columns: number; rows: number }): Promise<void> {
    const agentId = randomUUID();
    const generationId = randomUUID();
    const profile: NativePiProfile = {
      id: randomUUID(),
      kind: "native-pi",
      executable: process.env.ADDONE_NATIVE_PI_EXECUTABLE ?? "pi",
      arguments: nativePiArguments(process.env.ADDONE_NATIVE_PI_ARGUMENTS),
      cwd,
      environment: pickEnvironment(["PATH", "PATHEXT", "SystemRoot", "ComSpec", "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "PI_CODING_AGENT_DIR", "PI_CONFIG_DIR", "PI_OFFLINE", "NO_COLOR"]),
      terminalType: "xterm-256color",
      dimensions,
      projection: FULL_VIEWPORT_NATIVE_PROJECTION,
      // ConPTY consumes Pi's DEC mouse modes. This explicit profile policy
      // restores equivalent SGR mouse semantics only while Pi is alternate-screen.
      conptyMouseFallback: "sgr-any-on-alternate-screen",
      resume: "none",
    };
    const generation: ProcessGeneration = {
      id: generationId,
      agentId,
      sequence: 1,
      profileId: profile.id,
      state: "starting",
      capabilities: ["terminal-surface", "terminal-input", "terminal-resize", "process-stop"],
      startedAt: new Date().toISOString(),
      exitedAt: null,
      exitCode: null,
      signal: null,
      error: null,
      ownerBootNonce: this.bootNonce,
    };
    const agent: LogicalTerminalAgent = {
      id: agentId,
      workspaceId: this.#workspace.id,
      name: `Native Pi ${this.#agents.length + 1}`,
      driverKind: "terminal",
      profile,
      currentGeneration: generation,
      surface: null,
      createdAt: generation.startedAt,
    };
    this.store.createTerminalAgent(agent);
    this.#agents = [...this.#agents, agent];
    this.#workspace = { ...this.#workspace, agentIds: [...this.#workspace.agentIds, agentId], selectedAgentId: agentId };
    void this.#writeEndpointMetadata();
    this.#publish({ type: "agent-created", agent });
    this.#publish({ type: "selection-changed", workspaceId: this.#workspace.id, agentId });
    try {
      const handle = await this.driver.start(agentId, generationId, profile, event => this.#onDriverEvent(event));
      this.#handles.set(agentId, handle);
      this.#replaceAgent(agentId, current => ({ ...current, currentGeneration: { ...current.currentGeneration, state: "ready" } }));
      this.store.markGeneration(agentId, generationId, "ready");
      this.#publish({ type: "generation-ready", agentId, generationId });
      void this.#writeEndpointMetadata();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.store.markGeneration(agentId, generationId, "error", { error: message });
      this.#replaceAgent(agentId, current => ({ ...current, currentGeneration: { ...current.currentGeneration, state: "error", error: message, exitedAt: new Date().toISOString() } }));
      this.#publish({ type: "generation-failed", agentId, generationId, message });
      void this.#writeEndpointMetadata();
      throw error;
    }
  }

  #onDriverEvent(event: TerminalDriverEvent): void {
    const agent = this.#agents.find(candidate => candidate.id === event.agentId);
    if (!agent || agent.currentGeneration.id !== event.generationId) return;
    if (event.type === "surface") {
      if (!this.store.saveSurface(event.agentId, event.generationId, event.surface)) return;
      this.#replaceAgent(event.agentId, current => ({ ...current, surface: event.surface }));
      this.#publish({ type: "terminal-surface-updated", agentId: event.agentId, generationId: event.generationId, surface: event.surface });
    } else if (event.type === "transaction") {
      // Render transactions are latency-sensitive and the live supervisor is
      // authoritative for non-resumable PTYs. Persist bounded snapshots only at
      // handoff, resynchronization, resize, and exit boundaries.
      this.#replaceAgent(event.agentId, current => ({ ...current, surface: event.surface }));
      this.#publish({ type: "terminal-render-transaction", agentId: event.agentId, generationId: event.generationId, transaction: event.transaction });
    } else if (event.type === "exit") {
      this.#handles.delete(event.agentId);
      if (event.surface) this.store.saveSurface(event.agentId, event.generationId, event.surface);
      this.store.markGeneration(event.agentId, event.generationId, "exited", { exitCode: event.exitCode, signal: event.signal });
      this.#replaceAgent(event.agentId, current => ({
        ...current,
        surface: event.surface ?? current.surface,
        currentGeneration: { ...current.currentGeneration, state: "exited", exitedAt: new Date().toISOString(), exitCode: event.exitCode, signal: event.signal },
      }));
      this.#publish({ type: "generation-exited", agentId: event.agentId, generationId: event.generationId, exitCode: event.exitCode, signal: event.signal, surface: event.surface });
      void this.#writeEndpointMetadata();
    } else {
      this.store.markGeneration(event.agentId, event.generationId, "error", { error: event.message });
      this.#publish({ type: "generation-failed", agentId: event.agentId, generationId: event.generationId, message: event.message });
    }
  }

  #currentHandle(agentId: AgentId, generationId: GenerationId): TerminalDriverHandle {
    const agent = this.#agents.find(candidate => candidate.id === agentId);
    if (!agent) throw new Error(`agent ${agentId} not found`);
    if (agent.currentGeneration.id !== generationId) throw new Error(`stale generation ${generationId}`);
    const handle = this.#handles.get(agentId);
    if (!handle) throw new Error(`driver for agent ${agentId} not found`);
    return handle;
  }

  #replaceAgent(agentId: AgentId, update: (agent: LogicalTerminalAgent) => LogicalTerminalAgent): void {
    this.#agents = this.#agents.map(agent => agent.id === agentId ? update(agent) : agent);
  }

  #publish(event: AddOneEvent): void {
    const ordered: OrderedEvent = { revision: ++this.#revision, event };
    for (const client of this.#clients) this.#send(client, { type: "event", ordered });
  }

  #liveHandleGenerationIds(): string[] {
    const live: string[] = [];
    for (const [agentId] of this.#handles) {
      const agent = this.#agents.find(candidate => candidate.id === agentId);
      if (agent) live.push(agent.currentGeneration.id);
    }
    return live;
  }

  #writeEndpointMetadata(): Promise<void> {
    const liveGenerationIds = this.#liveHandleGenerationIds();
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
        state: liveGenerationIds.length > 0 ? "busy" : "idle",
        liveGenerationIds,
        nonResumableGenerationIds: liveGenerationIds,
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

function assertHostInputEvent(event: unknown): asserts event is HostTerminalInputEvent {
  if (typeof event !== "object" || event === null || !("type" in event) || !["key", "paste", "focus", "mouse", "resize"].includes(String(event.type))) {
    throw new Error("terminal input is not a recognized semantic host event");
  }
  if ("text" in event && typeof event.text === "string" && Buffer.byteLength(event.text, "utf8") > 1024 * 1024) {
    throw new Error("terminal input text exceeds the bounded payload size");
  }
}

export function nativePiArguments(value: string | undefined): readonly string[] {
  if (value === undefined) return [];
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed) || parsed.some(argument => typeof argument !== "string" || argument.includes("\0"))) {
    throw new Error("ADDONE_NATIVE_PI_ARGUMENTS must be a JSON array of safe strings");
  }
  return parsed;
}

function pickEnvironment(keys: readonly string[]): Record<string, string> {
  const selected: Record<string, string> = {};
  for (const key of keys) if (process.env[key] !== undefined) selected[key] = process.env[key] as string;
  return selected;
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
