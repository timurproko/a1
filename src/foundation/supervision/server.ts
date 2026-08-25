import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { createConnection, createServer, type Server, type Socket } from "node:net";
import { platform } from "node:os";
import {
  assertLaunchInstanceOutcome,
  assertNativeProcessIdentity,
  assertProcessContainmentIdentity,
  type CommandResult,
  type LaunchInstance,
  type LaunchInstanceStopReason,
  type SupervisorCommand,
  type SupervisorSnapshot,
} from "../lifecycle/index.js";
import { encodeFrame, isCommandMessage, isControlHello, LineFrameDecoder, localControlHello, MAX_CONTROL_FRAME_BYTES, negotiateControlFeatures, type ServerMessage } from "../protocol/index.js";
import { processIsAlive, type MaterializedRelease } from "../release/index.js";
import { ControlStore } from "../storage/index.js";
import { resolveProductPaths, type ProductPaths } from "./paths.js";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../../product-identity.js";

export class SupervisorServer {
  readonly id = randomUUID();
  readonly bootNonce: string;
  readonly pidStartIdentity = `${process.pid}:${Math.floor(Date.now() - process.uptime() * 1_000)}`;
  readonly startedAt = new Date().toISOString();
  readonly paths: ProductPaths;
  #server: Server | null = null;
  #instances = new Map<string, LaunchInstance>();
  #instanceOwners = new Map<string, Socket>();
  #clientIds = new Map<Socket, string>();
  #clientInstances = new Map<Socket, Set<string>>();
  #uncertainInstances = new Set<string>();
  #reconciliations = new Map<string, Promise<void>>();
  #revision = 0;
  #clients = new Set<Socket>();
  #results = new Map<string, CommandResult>();
  #metadataWrites: Promise<void> = Promise.resolve();
  #closing = false;
  #superseded = false;
  #supersededPoll: NodeJS.Timeout | null = null;

  constructor(
    readonly store: ControlStore,
    paths = resolveProductPaths(),
    readonly release: MaterializedRelease,
    bootNonce: string = randomUUID(),
    readonly terminateProcess: (code: number) => void = code => process.exit(code),
    readonly reconciliationDeadlineMs = 3_000,
    readonly shutdownDeadlineMs = 1_500,
    /**
     * Which release new sessions start on. A cohort that is no longer that release keeps
     * serving the instances it already has, takes no new ones, and exits when its last one
     * leaves. Absent, this supervisor never considers itself superseded.
     */
    readonly readActiveReleaseId: (() => Promise<string | null>) | null = null,
    readonly supersededPollMs = 1_000,
  ) {
    this.bootNonce = bootNonce;
    this.paths = paths;
    for (const instance of store.loadActiveLaunchInstances()) this.#instances.set(instance.id, instance);
  }

  snapshot(): SupervisorSnapshot {
    return {
      revision: this.#revision,
      activeInstances: [...this.#instances.values()].flatMap(instance => {
        if (instance.state !== "requested" && instance.state !== "active" && instance.state !== "stopping") return [];
        return [{ id: instance.id, profileId: instance.profileId, state: instance.state }];
      }),
    };
  }

  async listen(): Promise<void> {
    if (this.#server) throw new Error("supervisor is already listening");
    await mkdir(this.paths.runtimeDir, { recursive: true, mode: 0o700 });
    await mkdir(this.paths.endpointsDir, { recursive: true, mode: 0o700 });
    if (platform() !== "win32") {
      if (await endpointIsLive(this.paths.endpoint)) throw new Error(PRODUCT_TEXT.diagnostic(`supervisor already owns ${this.paths.endpoint}`));
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
    if (this.readActiveReleaseId) {
      const poll = setInterval(() => void this.#refreshCohortRole(), this.supersededPollMs);
      poll.unref();
      this.#supersededPoll = poll;
    }
  }

  /**
   * Notices that another release has become the one new sessions start on. Nothing is
   * interrupted by that: this cohort finishes what it is holding and then leaves.
   */
  async #refreshCohortRole(): Promise<void> {
    if (this.#closing || !this.readActiveReleaseId) return;
    const active = await this.readActiveReleaseId().catch(() => null);
    if (active === null) return;
    this.#superseded = active !== this.release.releaseId;
    if (this.#superseded && this.#instances.size === 0) await this.retire();
  }

  /** Whether new sessions start on some other release. */
  get superseded(): boolean {
    return this.#superseded;
  }

  /** Leaves, taking this cohort's own endpoint artifacts with it. */
  async retire(): Promise<void> {
    if (this.#closing) return;
    await this.close(false);
  }

  async close(stopAgents = false): Promise<void> {
    if (stopAgents && !await this.#drainInstances("update", this.shutdownDeadlineMs)) {
      throw new Error("active launch instances did not release ownership within the shutdown deadline");
    }
    this.#closing = true;
    if (this.#supersededPoll) clearInterval(this.#supersededPoll);
    this.#supersededPoll = null;
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
              const released = identityMatches && this.#instances.size === 0;
              this.#send(socket, {
                type: "release-ownership-result",
                released,
                reason: released ? "idle cohort released ownership"
                  : identityMatches ? "launch instances are still active" : "boot nonce or candidate release mismatch",
                liveInstanceIds: this.#liveInstanceIds(),
              });
              if (released) setTimeout(() => void this.closeForReleaseReplacement(false), 25);
              continue;
            }
            if (isMessageType(value, "release-update-ownership")) {
              const request = value as { bootNonce?: unknown; targetVersion?: unknown };
              void this.#handleUpdateRelease(socket, request);
              continue;
            }
            if (!isControlHello(value)) {
              this.#send(socket, { type: "protocol-error", code: "invalid-control-handshake", message: `the first message must be a valid ${PRODUCT_TEXT.displayName} control feature handshake`, diagnostics: { received: value } });
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
            this.#clientIds.set(socket, value.clientId);
            this.#clientInstances.set(socket, new Set());
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
    socket.on("close", () => this.#onSocketClosed(socket));
    socket.on("error", () => this.#onSocketClosed(socket));
  }

  async #execute(command: SupervisorCommand, socket: Socket): Promise<void> {
    const clientId = this.#clientIds.get(socket);
    if (!clientId) {
      this.#send(socket, { type: "protocol-error", code: "unauthenticated-command", message: "launch-instance commands require an authenticated client" });
      return;
    }
    const resultKey = `${clientId}:${command.requestId}`;
    const recorded = this.#results.get(resultKey);
    if (recorded) {
      this.#send(socket, { type: "command-result", result: recorded });
      return;
    }
    let result: CommandResult;
    try {
      if (command.type === "create-launch-instance") this.#createLaunchInstance(command, socket, clientId);
      if (command.type === "activate-launch-instance") this.#activateLaunchInstance(command, socket, clientId);
      if (command.type === "begin-launch-instance-stop") this.#beginLaunchInstanceStop(command, socket, clientId);
      if (command.type === "complete-launch-instance") this.#completeLaunchInstance(command, socket, clientId);
      if (command.type === "reconcile-launch-instance") {
        this.#ownedInstance(command.instanceId, socket, clientId);
        await this.#reconcileLaunchInstance(command.instanceId);
      }
      if (command.type === "resynchronize") this.#send(socket, { type: "snapshot", snapshot: this.snapshot() });
      await this.#metadataWrites;
      result = { requestId: command.requestId, ok: true, revision: this.#revision };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = /not found/i.test(message) ? "not-found" : /owner|ownership|authenticated/i.test(message) ? "ownership-error" : "driver-error";
      result = { requestId: command.requestId, ok: false, revision: this.#revision, error: { code, message } };
    }
    this.#results.set(resultKey, result);
    this.#send(socket, { type: "command-result", result });
  }

  #createLaunchInstance(command: Extract<SupervisorCommand, { type: "create-launch-instance" }>, socket: Socket, clientId: string): void {
    assertNativeProcessIdentity(command.guardianIdentity);
    const existing = this.store.loadLaunchInstance(command.instanceId);
    if (this.#superseded && !existing) {
      throw new Error(PRODUCT_TEXT.diagnostic(`release ${this.release.releaseId} is no longer the release new sessions start on`));
    }
    if (existing) {
      if (existing.ownerClientId !== clientId
        || existing.profileId !== command.profileId
        || existing.shutdownPolicy !== command.shutdownPolicy
        || !sameProcessIdentity(existing.guardianIdentity, command.guardianIdentity)) {
        throw new Error("launch instance already exists with different authenticated ownership");
      }
      if (existing.state === "completed" || existing.state === "interrupted") throw new Error("launch instance already has a terminal outcome");
      this.#instances.set(existing.id, existing);
      this.#bindOwner(existing.id, socket);
      return;
    }
    const instance: LaunchInstance = {
      id: command.instanceId,
      ownerClientId: clientId,
      profileId: command.profileId,
      state: "requested",
      shutdownPolicy: command.shutdownPolicy,
      guardianIdentity: command.guardianIdentity,
      rootIdentity: null,
      containmentIdentity: null,
      createdAt: new Date().toISOString(),
      activatedAt: null,
      stoppingAt: null,
      completedAt: null,
      outcome: null,
    };
    this.store.createLaunchInstance(instance);
    this.#instances.set(instance.id, instance);
    this.#bindOwner(instance.id, socket);
    this.#mutated();
  }

  #activateLaunchInstance(command: Extract<SupervisorCommand, { type: "activate-launch-instance" }>, socket: Socket, clientId: string): void {
    assertNativeProcessIdentity(command.rootIdentity);
    assertProcessContainmentIdentity(command.containmentIdentity);
    const instance = this.#ownedInstance(command.instanceId, socket, clientId);
    if (instance.state === "active"
      && sameProcessIdentity(instance.rootIdentity, command.rootIdentity)
      && sameContainmentIdentity(instance.containmentIdentity, command.containmentIdentity)) return;
    if (instance.state !== "requested") throw new Error("launch instance is not requested");
    const activatedAt = new Date().toISOString();
    if (!this.store.activateLaunchInstance(instance.id, clientId, command.rootIdentity, command.containmentIdentity, activatedAt)) {
      throw new Error("launch instance activation ownership mismatch");
    }
    this.#instances.set(instance.id, { ...instance, state: "active", rootIdentity: command.rootIdentity, containmentIdentity: command.containmentIdentity, activatedAt });
    this.#mutated();
  }

  #beginLaunchInstanceStop(command: Extract<SupervisorCommand, { type: "begin-launch-instance-stop" }>, socket: Socket, clientId: string): void {
    const instance = this.#ownedInstance(command.instanceId, socket, clientId);
    if (instance.state === "stopping") return;
    if (instance.state !== "active") throw new Error("active launch instance not found");
    const stoppingAt = new Date().toISOString();
    if (!this.store.beginLaunchInstanceStop(instance.id, clientId, stoppingAt)) throw new Error("launch instance stop ownership mismatch");
    this.#instances.set(instance.id, { ...instance, state: "stopping", stoppingAt });
    this.#mutated();
  }

  #completeLaunchInstance(command: Extract<SupervisorCommand, { type: "complete-launch-instance" }>, socket: Socket, clientId: string): void {
    assertLaunchInstanceOutcome(command.outcome);
    const stored = this.store.loadLaunchInstance(command.instanceId);
    if (!stored) throw new Error("launch instance not found");
    if (stored.ownerClientId !== clientId || this.#instanceOwners.get(stored.id) !== socket) throw new Error("launch instance ownership mismatch");
    if (stored.state === "completed" || stored.state === "interrupted") {
      if (stored.state === command.terminalState && JSON.stringify(stored.outcome) === JSON.stringify(command.outcome)) return;
      throw new Error("launch instance already has a different terminal outcome");
    }
    const completedAt = new Date().toISOString();
    if (!this.store.completeLaunchInstance(stored.id, clientId, command.terminalState, command.outcome, completedAt)) {
      throw new Error("launch instance completion ownership mismatch");
    }
    this.#instances.delete(stored.id);
    this.#uncertainInstances.delete(stored.id);
    this.#unbindOwner(stored.id, socket);
    this.#mutated();
    // The last session on a superseded cohort has left; there is nothing here to keep.
    if (this.#superseded && this.#instances.size === 0) void this.retire();
  }

  #ownedInstance(instanceId: string, socket: Socket, clientId: string): LaunchInstance {
    const instance = this.#instances.get(instanceId) ?? this.store.loadLaunchInstance(instanceId);
    if (!instance || instance.state === "completed" || instance.state === "interrupted") throw new Error("active launch instance not found");
    if (instance.ownerClientId !== clientId || this.#instanceOwners.get(instanceId) !== socket) throw new Error("launch instance ownership mismatch");
    return instance;
  }

  #bindOwner(instanceId: string, socket: Socket): void {
    const current = this.#instanceOwners.get(instanceId);
    if (current && current !== socket) throw new Error("launch instance already belongs to another authenticated connection");
    this.#instanceOwners.set(instanceId, socket);
    this.#clientInstances.get(socket)?.add(instanceId);
  }

  #unbindOwner(instanceId: string, socket: Socket): void {
    this.#instanceOwners.delete(instanceId);
    this.#clientInstances.get(socket)?.delete(instanceId);
  }

  #onSocketClosed(socket: Socket): void {
    if (!this.#clients.delete(socket) && !this.#clientIds.has(socket)) return;
    const instanceIds = [...(this.#clientInstances.get(socket) ?? [])];
    this.#clientInstances.delete(socket);
    this.#clientIds.delete(socket);
    for (const instanceId of instanceIds) {
      if (this.#instanceOwners.get(instanceId) === socket) this.#instanceOwners.delete(instanceId);
      if (!this.#closing) void this.#reconcileLaunchInstance(instanceId);
    }
  }

  #reconcileLaunchInstance(instanceId: string): Promise<void> {
    const existing = this.#reconciliations.get(instanceId);
    if (existing) return existing;
    const reconciliation = this.#performReconciliation(instanceId).finally(() => this.#reconciliations.delete(instanceId));
    this.#reconciliations.set(instanceId, reconciliation);
    return reconciliation;
  }

  async #performReconciliation(instanceId: string): Promise<void> {
    const instance = this.#instances.get(instanceId);
    if (!instance) return;
    const deadline = Date.now() + this.reconciliationDeadlineMs;
    while (instance.rootIdentity && processIsAlive(instance.rootIdentity.pid) && Date.now() < deadline) {
      await new Promise(resolvePromise => setTimeout(resolvePromise, 25));
    }
    if (instance.state === "requested" || (instance.rootIdentity && !processIsAlive(instance.rootIdentity.pid))) {
      const outcome = { kind: "interrupted", reason: "owner-disconnect", message: "launch instance owner disconnected before reporting a terminal outcome" } as const;
      if (this.store.completeLaunchInstance(instance.id, instance.ownerClientId, "interrupted", outcome, new Date().toISOString())) {
        this.#instances.delete(instance.id);
        this.#uncertainInstances.delete(instance.id);
        this.#mutated();
      }
      return;
    }
    this.#uncertainInstances.add(instance.id);
    await this.#writeEndpointMetadata();
  }

  async #handleUpdateRelease(socket: Socket, request: { bootNonce?: unknown; targetVersion?: unknown }): Promise<void> {
    const identityMatches = request.bootNonce === this.bootNonce && typeof request.targetVersion === "string";
    if (!identityMatches) {
      this.#send(socket, {
        type: "release-update-result",
        accepted: false,
        reason: "boot nonce or target version mismatch",
        liveInstanceIds: this.#liveInstanceIds(),
      });
      return;
    }
    const released = await this.#drainInstances("update", this.shutdownDeadlineMs);
    this.#send(socket, {
      type: "release-update-result",
      accepted: released,
      reason: released
        ? `verified ${PRODUCT_TEXT.displayName} owner drained all launch instances for immediate update shutdown`
        : "one or more launch instances did not release verified ownership within the update deadline",
      liveInstanceIds: this.#liveInstanceIds(),
    });
    if (released) setTimeout(() => void this.closeForReleaseReplacement(false), 25);
  }

  async #drainInstances(reason: LaunchInstanceStopReason, timeoutMs: number): Promise<boolean> {
    if (this.#instances.size === 0) return true;
    this.#requestStopAll(reason);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.#instances.size === 0) {
        // Let the terminal command result flush before closing owner sockets.
        await new Promise(resolvePromise => setTimeout(resolvePromise, 25));
        return this.#instances.size === 0;
      }
      await new Promise(resolvePromise => setTimeout(resolvePromise, 25));
    }
    return this.#instances.size === 0;
  }

  #requestStopAll(reason: LaunchInstanceStopReason): void {
    for (const [instanceId, socket] of this.#instanceOwners) {
      this.#send(socket, { type: "stop-launch-instance", requestId: randomUUID(), instanceId, reason });
    }
  }

  #mutated(): void {
    this.#revision += 1;
    void this.#writeEndpointMetadata();
  }

  #liveInstanceIds(): string[] {
    return [...this.#instances.keys()];
  }

  #writeEndpointMetadata(): Promise<void> {
    const liveInstanceIds = this.#liveInstanceIds();
    const metadata = {
      schema: PRODUCT_IDENTITY.protocol.supervisorSchema,
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
        state: this.#uncertainInstances.size > 0 ? "blocked" : liveInstanceIds.length > 0 ? "busy" : "idle",
        liveInstanceIds,
        nonResumableInstanceIds: liveInstanceIds,
        uncertainInstanceIds: [...this.#uncertainInstances],
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

function sameProcessIdentity(left: { pid: number; startIdentity: string } | null, right: { pid: number; startIdentity: string }): boolean {
  return left !== null && left.pid === right.pid && left.startIdentity === right.startIdentity;
}

function sameContainmentIdentity(left: { provider: string; token: string } | null, right: { provider: string; token: string }): boolean {
  return left !== null && left.provider === right.provider && left.token === right.token;
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
