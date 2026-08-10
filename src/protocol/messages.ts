import type { CommandResult, OrderedEvent, SupervisorCommand, SupervisorSnapshot } from "../domain/index.js";

export const PROTOCOL_VERSION = 1 as const;
export const MAX_CONTROL_FRAME_BYTES = 4 * 1024 * 1024;

export type ClientMessage =
  | { readonly type: "client-hello"; readonly protocolVersion: typeof PROTOCOL_VERSION; readonly clientId: string }
  | { readonly type: "command"; readonly command: SupervisorCommand };

export type ServerMessage =
  | { readonly type: "server-hello"; readonly protocolVersion: typeof PROTOCOL_VERSION; readonly supervisorId: string; readonly snapshot: SupervisorSnapshot }
  | { readonly type: "snapshot"; readonly snapshot: SupervisorSnapshot }
  | { readonly type: "event"; readonly ordered: OrderedEvent }
  | { readonly type: "command-result"; readonly result: CommandResult }
  | { readonly type: "protocol-error"; readonly code: string; readonly message: string };

export function encodeFrame(message: ClientMessage | ServerMessage): string {
  return `${JSON.stringify(message)}\n`;
}

export class LineFrameDecoder {
  #buffer = "";

  push(chunk: Buffer | string): unknown[] {
    this.#buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    if (Buffer.byteLength(this.#buffer, "utf8") > MAX_CONTROL_FRAME_BYTES) {
      this.#buffer = "";
      throw new Error("control frame exceeds maximum size");
    }
    const messages: unknown[] = [];
    let newline = this.#buffer.indexOf("\n");
    while (newline >= 0) {
      const line = this.#buffer.slice(0, newline);
      this.#buffer = this.#buffer.slice(newline + 1);
      if (line.length > 0) messages.push(JSON.parse(line));
      newline = this.#buffer.indexOf("\n");
    }
    return messages;
  }
}

export function isClientMessage(value: unknown): value is ClientMessage {
  if (typeof value !== "object" || value === null || !("type" in value)) return false;
  const message = value as Record<string, unknown>;
  return (message.type === "client-hello" && message.protocolVersion === PROTOCOL_VERSION && typeof message.clientId === "string")
    || (message.type === "command" && typeof message.command === "object" && message.command !== null);
}
