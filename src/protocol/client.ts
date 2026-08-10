import { EventEmitter } from "node:events";
import { connect, type Socket } from "node:net";
import { randomUUID } from "node:crypto";
import type { CommandResult, OrderedEvent, SupervisorCommand, SupervisorSnapshot } from "../domain/index.js";
import { encodeFrame, LineFrameDecoder, PROTOCOL_VERSION, type ServerMessage } from "./messages.js";

interface ClientEvents {
  snapshot: [SupervisorSnapshot];
  event: [OrderedEvent];
  disconnect: [];
}

export class SupervisorClient extends EventEmitter<ClientEvents> {
  readonly clientId = randomUUID();
  #socket: Socket | null = null;
  #pending = new Map<string, { resolve: (result: CommandResult) => void; reject: (error: Error) => void }>();

  async connect(endpoint: string, timeoutMs = 5_000): Promise<SupervisorSnapshot> {
    if (this.#socket) throw new Error("client is already connected");
    const socket = connect(endpoint);
    this.#socket = socket;
    socket.setNoDelay(true);
    const decoder = new LineFrameDecoder();

    return await new Promise<SupervisorSnapshot>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`supervisor connection timed out after ${timeoutMs}ms`)), timeoutMs);
      let welcomed = false;
      const fail = (error: Error) => {
        clearTimeout(timeout);
        if (!welcomed) reject(error);
      };
      socket.once("error", fail);
      socket.on("close", () => {
        this.#socket = null;
        for (const pending of this.#pending.values()) pending.reject(new Error("supervisor disconnected"));
        this.#pending.clear();
        this.emit("disconnect");
      });
      socket.on("data", chunk => {
        try {
          for (const value of decoder.push(chunk)) {
            const message = value as Partial<ServerMessage>;
            if (message.type === "server-hello" && message.protocolVersion === PROTOCOL_VERSION && message.snapshot) {
              welcomed = true;
              clearTimeout(timeout);
              resolve(message.snapshot);
            } else if (message.type === "snapshot" && message.snapshot) {
              this.emit("snapshot", message.snapshot);
            } else if (message.type === "event" && message.ordered) {
              this.emit("event", message.ordered);
            } else if (message.type === "command-result" && message.result) {
              const pending = this.#pending.get(message.result.requestId);
              if (pending) {
                this.#pending.delete(message.result.requestId);
                pending.resolve(message.result);
              }
            } else if (message.type === "protocol-error") {
              fail(new Error(message.message ?? "protocol error"));
            }
          }
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)));
          socket.destroy();
        }
      });
      socket.once("connect", () => socket.write(encodeFrame({ type: "client-hello", protocolVersion: PROTOCOL_VERSION, clientId: this.clientId })));
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
