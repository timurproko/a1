import { connect, type Socket } from "node:net";
import { encodeResidentFrame, ResidentFrameDecoder, type ResidentEnvelope } from "./protocol.js";

export type ResidentTabStatus = "starting" | "working" | "needs-input" | "done-unseen" | "idle" | "unresponsive" | "stalled" | "crashed" | "restarting" | "failed";
export interface TabBridgeCredentials { readonly tabId: string; readonly token: string; readonly endpoint: string }
export interface TabAttachment { readonly clientId: string; readonly controllerRevision: number }

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
  #latestSession: { readonly file: string | null; readonly name: string | null } | null = null;
  #heartbeat: unknown | null = null;
  readonly #pending = new Map<number, (accepted: boolean) => void>();
  #startWaiter: ((accepted: boolean) => void) | null = null;

  constructor(options: TabBridgeOptions) { this.#options = options; }
  get available(): boolean { return this.#available && this.#connected; }
  captureAttachment(): TabAttachment | null { return this.#attachment === null ? null : { ...this.#attachment }; }

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
          features: ["bridge-status", "bridge-detach", "bridge-heartbeat", "bridge-restart", "recovery-journal"],
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
  session(file: string | null, name: string | null): void {
    this.#latestSession = { file, name };
    this.#send("bridge.session", { file, name });
  }

  requestDetach(origin: TabAttachment | null = this.captureAttachment(), timeoutMs = 1_000): Promise<boolean> {
    return this.#requestAction("detach", origin, timeoutMs);
  }

  requestRestart(origin: TabAttachment | null = this.captureAttachment(), timeoutMs = 1_000): Promise<boolean> {
    return this.#requestAction("restart", origin, timeoutMs);
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
