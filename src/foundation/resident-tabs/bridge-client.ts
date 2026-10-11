import { connect, type Socket } from "node:net";
import { encodeResidentFrame, ResidentFrameDecoder, type ResidentEnvelope } from "./protocol.js";

export type ResidentTabStatus = "starting" | "working" | "idle";
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
}

/** Metadata-only advisory bridge. Terminal input and transcript bytes have no API here. */
export class TabBridgeClient {
  readonly #options: TabBridgeOptions;
  #transport: BridgeTransport | null = null;
  #connected = false;
  #available = true;
  #sequence = 0;
  #request = 0;
  #attachment: TabAttachment | null = null;
  #closed = false;
  #retry: ReturnType<typeof setTimeout> | null = null;
  #latestStatus: ResidentTabStatus | null = null;
  #latestSession: { readonly file: string | null; readonly name: string | null } | null = null;
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
          role: "bridge", generation: 1, build: this.#options.build ?? "a1", features: ["bridge-status", "bridge-detach"],
          token: [...Buffer.from(this.#options.credentials.token, "base64")], tabId: this.#options.credentials.tabId,
          pid: this.#options.pid ?? process.pid, startIdentity: this.#options.startIdentity ?? `${process.pid}:node`,
        }, ++this.#request);
      });
      transport.once("error", () => finish(false));
      timer = setTimeout(() => { this.#fail(); finish(false); }, timeoutMs); timer.unref();
    });
  }

  status(state: ResidentTabStatus): void {
    this.#latestStatus = state;
    this.#send("bridge.status", { seq: ++this.#sequence, state });
  }
  session(file: string | null, name: string | null): void {
    this.#latestSession = { file, name };
    this.#send("bridge.session", { file, name });
  }

  async requestDetach(origin: TabAttachment | null = this.captureAttachment(), timeoutMs = 1_000): Promise<boolean> {
    if (!this.available || origin === null) return false;
    const requestId = ++this.#request;
    const result = new Promise<boolean>(resolvePromise => this.#pending.set(requestId, resolvePromise));
    this.#send("bridge.request", { action: "detach", clientId: origin.clientId, controllerRevision: origin.controllerRevision }, requestId);
    const timeout = new Promise<boolean>(resolvePromise => {
      const timer = setTimeout(() => { this.#pending.delete(requestId); resolvePromise(false); }, timeoutMs); timer.unref();
    });
    return await Promise.race([result, timeout]);
  }

  close(): void {
    this.#closed = true;
    if (this.#retry !== null) clearTimeout(this.#retry);
    this.#retry = null;
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
      this.#connected = true;
      this.#available = true;
      this.#startWaiter?.(true);
      if (this.#latestStatus !== null) this.#send("bridge.status", { seq: ++this.#sequence, state: this.#latestStatus });
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

  #fail(retry = true): void {
    const transport = this.#transport;
    this.#available = false; this.#connected = false; this.#attachment = null; this.#transport = null;
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
