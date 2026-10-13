import { connect, type Socket } from "node:net";
import { encodeResidentFrame, ResidentFrameDecoder, type ResidentEnvelope } from "./protocol.js";

export type ResidentTabStatus = "starting" | "working" | "needs-input" | "done-unseen" | "idle" | "unresponsive" | "stalled" | "crashed" | "restarting" | "failed";
export interface TabBridgeCredentials { readonly tabId: string; readonly token: string; readonly endpoint: string }
export interface TabAttachment { readonly clientId: string; readonly controllerRevision: number }
export type TabBridgeCommand =
  | { readonly type: "visibility"; readonly visible: boolean }
  | { readonly type: "rename"; readonly name: string; readonly nameSource: "default" | "user" | "auto" }
  | { readonly type: "stop"; readonly deadlineMs: number };

interface BridgeTransport {
  write(bytes: Uint8Array): boolean;
  destroy(): void;
  once(event: "connect" | "error" | "close", listener: (...args: unknown[]) => void): unknown;
  on(event: "data", listener: (bytes: Buffer) => void): unknown;
}

export interface TabBridgeOptions {
  readonly credentials: TabBridgeCredentials;
  readonly pid?: number;
  readonly startIdentity?: string;
  readonly build?: string;
  readonly connect?: (endpoint: string) => BridgeTransport;
  readonly heartbeatIntervalMs?: number;
  readonly setInterval?: (callback: () => void, milliseconds: number) => unknown;
  readonly clearInterval?: (timer: unknown) => void;
}

/** Metadata-only advisory bridge. Terminal input and transcript bytes have no API here. */
export class TabBridgeClient {
  readonly #options: TabBridgeOptions;
  #transport: BridgeTransport | null = null;
  #connected = false;
  #available = true;
  #features = new Set<string>();
  #sequence = 0;
  #request = 0;
  #attachment: TabAttachment | null = null;
  #closed = false;
  #retry: ReturnType<typeof setTimeout> | null = null;
  #latestStatus: { readonly state: ResidentTabStatus; readonly degraded: boolean; readonly accent: string | null; readonly pendingRequests: number; readonly queuedInput: number } | null = null;
  #accent: string | null = null;
  #latestSession: { readonly file: string | null; readonly name: string | null; readonly nameSource: "default" | "user" | "auto" } | null = null;
  #heartbeat: unknown | null = null;
  readonly #pending = new Map<number, (accepted: boolean) => void>();
  #startWaiter: ((accepted: boolean) => void) | null = null;
  readonly #commandListeners = new Set<(command: TabBridgeCommand) => void>();
  #boundaryInputRemainder = "";

  constructor(options: TabBridgeOptions) { this.#options = options; }
  get available(): boolean { return this.#available && this.#connected; }
  captureAttachment(): TabAttachment | null { return this.#attachment === null ? null : { ...this.#attachment }; }
  onCommand(listener: (command: TabBridgeCommand) => void): () => void {
    this.#commandListeners.add(listener);
    return () => this.#commandListeners.delete(listener);
  }

  async start(timeoutMs = 4_000): Promise<boolean> {
    if (this.#closed || this.#transport !== null) return this.available;
    const transport = (this.#options.connect ?? (endpoint => connect(endpoint) as Socket))(this.#options.credentials.endpoint);
    this.#transport = transport;
    const decoder = new ResidentFrameDecoder();
    transport.on("data", bytes => {
      try { for (const message of decoder.push(bytes)) this.#receive(message); }
      catch { if (this.#transport === transport) this.#fail(); }
    });
    transport.once("close", () => { if (this.#transport === transport) this.#fail(); });
    transport.once("error", () => { if (this.#transport === transport) this.#fail(); });
    return await new Promise<boolean>(resolvePromise => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (value: boolean) => {
        if (settled) return;
        settled = true;
        if (timer !== undefined) clearTimeout(timer);
        this.#startWaiter = null;
        resolvePromise(value);
      };
      this.#startWaiter = finish;
      transport.once("connect", () => {
        this.#send("hello", {
          role: "bridge", generation: 1, build: this.#options.build ?? "a1",
          features: ["bridge-status", "bridge-detach", "bridge-heartbeat", "bridge-restart", "bridge-visibility", "bridge-rename", "bridge-stop", "controller-boundary", "recovery-journal"],
          token: [...Buffer.from(this.#options.credentials.token, "base64")], tabId: this.#options.credentials.tabId,
          pid: this.#options.pid ?? process.pid, startIdentity: this.#options.startIdentity ?? `${process.pid}:node`,
        }, ++this.#request);
      });
      transport.once("error", () => finish(false));
      timer = setTimeout(() => { this.#fail(); finish(false); }, timeoutMs); timer.unref();
    });
  }

  status(state: ResidentTabStatus, degraded = false, pendingRequests = 0, queuedInput = 0): void {
    this.#latestStatus = { state, degraded, accent: this.#accent, pendingRequests, queuedInput };
    const recoveryState = state === "unresponsive" || state === "stalled" || state === "crashed" || state === "restarting" || state === "failed";
    if (recoveryState && !this.#supports("recovery-status")) return;
    this.#send("bridge.status", {
      seq: ++this.#sequence,
      state,
      pendingRequests: Math.max(0, Math.trunc(pendingRequests)),
      queuedInput: Math.max(0, Math.trunc(queuedInput)),
      ...(this.#accent === null ? {} : { accent: this.#accent }),
      ...(degraded && this.#supports("recovery-status") ? { degraded: true } : {}),
    });
  }
  degraded(degraded: boolean): void {
    this.status(this.#latestStatus?.state ?? "idle", degraded);
  }
  accent(accent: string): void {
    this.#accent = accent;
    if (this.#latestStatus !== null) this.status(this.#latestStatus.state, this.#latestStatus.degraded, this.#latestStatus.pendingRequests, this.#latestStatus.queuedInput);
  }
  session(file: string | null, name: string | null, nameSource: "default" | "user" | "auto" = "default"): void {
    this.#latestSession = { file, name, nameSource };
    this.#send("bridge.session", { file, name, nameSource });
  }
  prompt(interrupted: boolean): void {
    this.#send("bridge.prompt", { interrupted });
  }

  requestDetach(origin: TabAttachment | null = this.captureAttachment(), timeoutMs = 1_000): Promise<boolean> {
    return this.#requestAction("detach", origin, timeoutMs);
  }

  requestRestart(origin: TabAttachment | null = this.captureAttachment(), timeoutMs = 1_000): Promise<boolean> {
    return this.#requestAction("restart", origin, timeoutMs);
  }

  consumeControllerBoundaryInput(data: string): string {
    const prefix = "\x1bP+a1;controller=";
    const suffix = "\x1b\\";
    let pending = this.#boundaryInputRemainder + data;
    this.#boundaryInputRemainder = "";
    let output = "";
    while (pending.length > 0) {
      const start = pending.indexOf(prefix);
      if (start === -1) {
        let retained = 0;
        const maximum = Math.min(prefix.length - 1, pending.length);
        for (let length = maximum; length > 0; length--) {
          if (pending.endsWith(prefix.slice(0, length))) { retained = length; break; }
        }
        const split = pending.length - retained;
        output += pending.slice(0, split);
        this.#boundaryInputRemainder = pending.slice(split);
        break;
      }
      output += pending.slice(0, start);
      const end = pending.indexOf(suffix, start + prefix.length);
      if (end === -1) {
        this.#boundaryInputRemainder = pending.slice(start);
        break;
      }
      const body = pending.slice(start + prefix.length, end);
      const separator = body.indexOf(";");
      const generation = Number(body.slice(0, separator));
      const nonceHex = body.slice(separator + 1);
      if (separator > 0 && Number.isSafeInteger(generation) && generation > 0 && /^[0-9a-f]{32}$/u.test(nonceHex)) {
        this.#send("bridge.boundary", {
          generation,
          nonce: [...Buffer.from(nonceHex, "hex")],
        });
      } else {
        output += pending.slice(start, end + suffix.length);
      }
      pending = pending.slice(end + suffix.length);
    }
    return output;
  }

  close(): void {
    this.#closed = true;
    if (this.#retry !== null) clearTimeout(this.#retry);
    this.#retry = null;
    this.#stopHeartbeat();
    const transport = this.#transport;
    this.#transport = null;
    transport?.destroy();
    this.#fail(false);
  }

  #emitCommand(command: TabBridgeCommand): void {
    for (const listener of this.#commandListeners) listener(command);
  }

  #send(type: string, body: Readonly<Record<string, unknown>>, requestId?: number): void {
    if (this.#transport === null || (!this.#connected && type !== "hello")) return;
    try { this.#transport.write(encodeResidentFrame({ type, ...(requestId === undefined ? {} : { requestId }), body })); }
    catch { this.#fail(); }
  }

  #receive(message: ResidentEnvelope): void {
    if (message.type === "welcome" && message.body["generation"] === 1) {
      const advertised = message.body["features"];
      this.#features = new Set(Array.isArray(advertised) ? advertised.filter((feature): feature is string => typeof feature === "string") : []);
      this.#connected = true;
      this.#available = true;
      this.#startWaiter?.(true);
      if (this.#supports("bridge-heartbeat")) this.#startHeartbeat();
      if (this.#latestStatus !== null) this.status(this.#latestStatus.state, this.#latestStatus.degraded, this.#latestStatus.pendingRequests, this.#latestStatus.queuedInput);
      if (this.#latestSession !== null) this.#send("bridge.session", this.#latestSession);
      return;
    }
    if (message.type === "incompatible-generation") { this.#fail(); return; }
    if (message.type === "bridge.visibility" && typeof message.body["visible"] === "boolean") {
      this.#emitCommand({ type: "visibility", visible: message.body["visible"] }); return;
    }
    if (message.type === "bridge.rename" && typeof message.body["name"] === "string") {
      const source = message.body["nameSource"];
      this.#emitCommand({ type: "rename", name: message.body["name"], nameSource: source === "auto" || source === "default" ? source : "user" }); return;
    }
    if (message.type === "bridge.stop" && typeof message.body["deadlineMs"] === "number") {
      this.#emitCommand({ type: "stop", deadlineMs: message.body["deadlineMs"] }); return;
    }
    if (message.type === "attachment") {
      const clientId = message.body["clientId"]; const revision = message.body["controllerRevision"];
      if (typeof clientId === "string" && typeof revision === "number") this.#attachment = { clientId, controllerRevision: revision };
      return;
    }
    if ((message.type === "bridge.result" || message.type === "result") && typeof message.requestId === "number") {
      const resolvePromise = this.#pending.get(message.requestId);
      if (resolvePromise) { this.#pending.delete(message.requestId); resolvePromise(message.body["accepted"] === true); }
    }
  }

  async #requestAction(action: "detach" | "restart", origin: TabAttachment | null, timeoutMs: number): Promise<boolean> {
    if (!this.available || origin === null || (action === "restart" && !this.#supports("bridge-restart"))) return false;
    const requestId = ++this.#request;
    const result = new Promise<boolean>(resolvePromise => this.#pending.set(requestId, resolvePromise));
    this.#send("bridge.request", { action, clientId: origin.clientId, controllerRevision: origin.controllerRevision }, requestId);
    const timeout = new Promise<boolean>(resolvePromise => {
      const timer = setTimeout(() => { this.#pending.delete(requestId); resolvePromise(false); }, timeoutMs); timer.unref();
    });
    return await Promise.race([result, timeout]);
  }

  #startHeartbeat(): void {
    if (this.#heartbeat !== null) return;
    const schedule = this.#options.setInterval ?? ((callback: () => void, milliseconds: number) => setInterval(callback, milliseconds));
    this.#heartbeat = schedule(() => this.#send("bridge.heartbeat", { seq: ++this.#sequence }), this.#options.heartbeatIntervalMs ?? 5_000);
    (this.#heartbeat as { unref?: () => void }).unref?.();
  }

  #stopHeartbeat(): void {
    if (this.#heartbeat === null) return;
    (this.#options.clearInterval ?? (timer => clearInterval(timer as ReturnType<typeof setInterval>)))(this.#heartbeat);
    this.#heartbeat = null;
  }

  #supports(feature: string): boolean {
    return this.#features.has("crash-recovery") || this.#features.has(feature);
  }

  #fail(retry = true): void {
    const transport = this.#transport;
    this.#stopHeartbeat();
    this.#available = false; this.#connected = false; this.#features.clear(); this.#attachment = null; this.#transport = null;
    transport?.destroy();
    this.#startWaiter?.(false); this.#startWaiter = null;
    for (const resolvePromise of this.#pending.values()) resolvePromise(false);
    this.#pending.clear();
    if (retry && !this.#closed && this.#retry === null) {
      this.#retry = setTimeout(() => {
        this.#retry = null;
        void this.start().then(connected => { if (!connected) this.#fail(); });
      }, 250);
      this.#retry.unref();
    }
  }
}
