import { EventEmitter } from "node:events";
import { connect, type Socket } from "node:net";
import { randomUUID } from "node:crypto";
import type { CommandResult, LaunchInstanceStopIntent, SupervisorCommand, SupervisorSnapshot } from "../lifecycle/index.js";
import { CONTROL_ENVELOPE, CONTROL_ENVELOPE_REVISION, encodeFrame, LineFrameDecoder, localControlHello, negotiateControlFeatures, type ControlHello, type ServerMessage } from "./messages.js";

interface ClientEvents {
  snapshot: [SupervisorSnapshot];
  stopIntent: [LaunchInstanceStopIntent];
  disconnect: [];
}

export class SupervisorClient extends EventEmitter<ClientEvents> {
  readonly clientId = randomUUID();
  readonly releaseId?: string;

  constructor(releaseId?: string) {
    super();
    if (releaseId !== undefined) this.releaseId = releaseId;
  }
  #socket: Socket | null = null;
  #pending = new Map<string, { resolve: (result: CommandResult) => void; reject: (error: Error) => void }>();

  async connect(endpoint: string, timeoutMs = 5_000): Promise<SupervisorSnapshot> {
    if (this.#socket) throw new Error("client is already connected");
    const deadline = Date.now() + timeoutMs;
    let lastError: Error | null = null;
    while (Date.now() < deadline) {
      try {
        return await this.#connectOnce(endpoint, Math.max(1, deadline - Date.now()));
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (!isTransientEndpointError(lastError)) throw lastError;
        await new Promise(resolve => setTimeout(resolve, Math.min(40, Math.max(1, deadline - Date.now()))));
      }
    }
    throw new Error(`supervisor endpoint ${endpoint} remained unavailable for ${timeoutMs}ms`, { cause: lastError ?? undefined });
  }

  #connectOnce(endpoint: string, timeoutMs: number): Promise<SupervisorSnapshot> {
    const socket = connect(endpoint);
    this.#socket = socket;
    socket.setNoDelay(true);
    const decoder = new LineFrameDecoder();

    return new Promise<SupervisorSnapshot>((resolve, reject) => {
      let welcomed = false;
      const timeout = setTimeout(() => {
        const error = transientError(`supervisor connection timed out after ${timeoutMs}ms`, "ETIMEDOUT");
        fail(error);
        socket.destroy();
      }, timeoutMs);
      const fail = (error: Error) => {
        clearTimeout(timeout);
        if (!welcomed) reject(error);
      };
      socket.once("error", fail);
      socket.on("close", () => {
        if (this.#socket === socket) this.#socket = null;
        if (!welcomed) {
          fail(transientError("supervisor disconnected before completing its handshake", "ECONNRESET"));
          return;
        }
        for (const pending of this.#pending.values()) pending.reject(new Error("supervisor disconnected"));
        this.#pending.clear();
        this.emit("disconnect");
      });
      socket.on("data", chunk => {
        try {
          for (const value of decoder.push(chunk)) {
            const message = value as Partial<ServerMessage>;
            if (message.type === "server-hello" && message.snapshot) {
              const hello = message as Partial<ControlHello>;
              if (hello.envelope !== CONTROL_ENVELOPE || hello.envelopeRevision !== CONTROL_ENVELOPE_REVISION || !Array.isArray(hello.requiredFeatures) || !Array.isArray(hello.optionalFeatures) || typeof hello.contractDigest !== "string") {
                fail(new Error("supervisor returned an invalid control handshake"));
                socket.destroy();
                continue;
              }
              const negotiation = negotiateControlFeatures(localControlHello(this.releaseId), hello as ControlHello);
              if (!negotiation.ok) {
                fail(new Error(negotiation.diagnostic));
                socket.destroy();
                continue;
              }
              welcomed = true;
              clearTimeout(timeout);
              resolve(message.snapshot);
            } else if (message.type === "snapshot" && message.snapshot) {
              this.emit("snapshot", message.snapshot);
            } else if (message.type === "command-result" && message.result) {
              const pending = this.#pending.get(message.result.requestId);
              if (pending) {
                this.#pending.delete(message.result.requestId);
                pending.resolve(message.result);
              }
            } else if (message.type === "stop-launch-instance" && message.instanceId && message.requestId && message.reason) {
              this.emit("stopIntent", message as LaunchInstanceStopIntent);
            } else if (message.type === "protocol-error") {
              fail(new Error(message.message ?? "protocol error"));
            }
          }
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)));
          socket.destroy();
        }
      });
      socket.once("connect", () => socket.write(encodeFrame({ type: "client-hello", clientId: this.clientId, ...localControlHello(this.releaseId) })));
    });
  }

  command(command: SupervisorCommand): Promise<CommandResult> {
    if (!this.#socket) return Promise.reject(new Error("supervisor is not connected"));
    return new Promise((resolve, reject) => {
      this.#pending.set(command.requestId, { resolve, reject });
      this.#socket?.write(encodeFrame({ type: "command", command }));
    });
  }

  close(): void {
    this.#socket?.end();
    this.#socket = null;
  }
}

function isTransientEndpointError(error: Error): boolean {
  const code = "code" in error ? String(error.code) : "";
  return ["ENOENT", "ECONNREFUSED", "ECONNRESET", "EPIPE", "ETIMEDOUT"].includes(code);
}

function transientError(message: string, code: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}
