import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createConnection, createServer, type Server, type Socket } from "node:net";
import { platform } from "node:os";
import type {
  AddOneEvent,
  AgentId,
  CommandResult,
  GenerationId,
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
import { assertDimensions } from "../domain/index.js";
import { encodeFrame, isClientMessage, LineFrameDecoder, PROTOCOL_VERSION, type ServerMessage } from "../protocol/index.js";
import { ControlStore } from "../storage/index.js";
import { resolveAddOnePaths, type AddOnePaths } from "./paths.js";

export class SupervisorServer {
  readonly id = randomUUID();
  readonly paths: AddOnePaths;
  #server: Server | null = null;
  #workspace: LogicalWorkspace;
  #agents: LogicalTerminalAgent[];
  #revision = 0;
  #clients = new Set<Socket>();
  #handles = new Map<AgentId, TerminalDriverHandle>();
  #results = new Map<string, CommandResult>();

  constructor(
    readonly store: ControlStore,
    readonly driver: TerminalDriver,
    paths = resolveAddOnePaths(),
  ) {
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
    await writeFile(this.paths.endpointMetadataPath, JSON.stringify({
      protocolVersion: PROTOCOL_VERSION,
      supervisorId: this.id,
      pid: process.pid,
      endpoint: this.paths.endpoint,
      databasePath: this.paths.databasePath,
      startedAt: new Date().toISOString(),
    }, null, 2), { mode: 0o600 });
  }

  async close(stopAgents = false): Promise<void> {
    if (stopAgents) await Promise.all([...this.#handles.values()].map(handle => handle.stop()));
    for (const client of this.#clients) client.destroy();
    if (this.#server) await new Promise<void>(resolve => this.#server?.close(() => resolve()));
    this.#server = null;
    this.store.close();
    await rm(this.paths.endpointMetadataPath, { force: true });
    if (platform() !== "win32") await rm(this.paths.endpoint, { force: true });
  }

  #attach(socket: Socket): void {
    socket.setNoDelay(true);
    const decoder = new LineFrameDecoder();
    let welcomed = false;
    socket.on("data", chunk => {
      try {
        for (const value of decoder.push(chunk)) {
          if (!isClientMessage(value)) {
            socket.write(encodeFrame({ type: "protocol-error", code: "malformed-message", message: "invalid client message" }));
            socket.destroy();
            return;
          }
          if (!welcomed) {
            if (value.type !== "client-hello") throw new Error("client-hello must be the first message");
            welcomed = true;
            this.#clients.add(socket);
            this.#send(socket, { type: "server-hello", protocolVersion: PROTOCOL_VERSION, supervisorId: this.id, snapshot: this.snapshot() });
          } else if (value.type === "command") {
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
      if (command.type === "create-terminal-agent") {
        assertDimensions(command.dimensions);
        await this.#createAgent(command.cwd, command.dimensions);
      } else if (command.type === "terminal-input") {
        this.#currentHandle(command.agentId, command.generationId).input(command.data);
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

  async #createAgent(cwd: string, dimensions: { columns: number; rows: number }): Promise<void> {
    const agentId = randomUUID();
    const generationId = randomUUID();
    const profile: NativePiProfile = {
      id: randomUUID(),
      kind: "native-pi",
      executable: "pi",
      arguments: [],
      cwd,
      environment: pickEnvironment(["PATH", "PATHEXT", "SystemRoot", "ComSpec", "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "PI_CONFIG_DIR", "NO_COLOR"]),
      terminalType: "xterm-256color",
      dimensions,
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
    this.#publish({ type: "agent-created", agent });
    this.#publish({ type: "selection-changed", workspaceId: this.#workspace.id, agentId });
    try {
      const handle = await this.driver.start(agentId, generationId, profile, event => this.#onDriverEvent(event));
      this.#handles.set(agentId, handle);
      this.#replaceAgent(agentId, current => ({ ...current, currentGeneration: { ...current.currentGeneration, state: "ready" } }));
      this.store.markGeneration(agentId, generationId, "ready");
      this.#publish({ type: "generation-ready", agentId, generationId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.store.markGeneration(agentId, generationId, "error", { error: message });
      this.#replaceAgent(agentId, current => ({ ...current, currentGeneration: { ...current.currentGeneration, state: "error", error: message, exitedAt: new Date().toISOString() } }));
      this.#publish({ type: "generation-failed", agentId, generationId, message });
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
    } else if (event.type === "exit") {
      this.#handles.delete(event.agentId);
      this.store.markGeneration(event.agentId, event.generationId, "exited", { exitCode: event.exitCode, signal: event.signal });
      this.#replaceAgent(event.agentId, current => ({
        ...current,
        surface: event.surface ?? current.surface,
        currentGeneration: { ...current.currentGeneration, state: "exited", exitedAt: new Date().toISOString(), exitCode: event.exitCode, signal: event.signal },
      }));
      this.#publish({ type: "generation-exited", agentId: event.agentId, generationId: event.generationId, exitCode: event.exitCode, signal: event.signal, surface: event.surface });
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

  #send(socket: Socket, message: ServerMessage): void {
    if (!socket.destroyed) socket.write(encodeFrame(message));
  }
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
