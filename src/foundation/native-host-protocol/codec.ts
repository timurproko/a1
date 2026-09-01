import {
  MAX_NATIVE_HOST_MESSAGE_BYTES,
  assertNativeHostProofMessage,
  type NativeHostProofMessage,
} from "./messages.js";

/** Identifies a bounded native-host framing or message-contract failure. */
export class NativeHostProtocolError extends Error {
  constructor(readonly code: "frame-too-large" | "malformed-frame" | "invalid-message", message: string) {
    super(message);
    this.name = "NativeHostProtocolError";
  }
}

/** Encodes and incrementally decodes size-bounded newline-delimited native-host proof messages. */
export class NativeHostFrameCodec {
  #buffer = "";

  encode(message: NativeHostProofMessage): string {
    assertNativeHostProofMessage(message);
    const encoded = `${JSON.stringify(message)}\n`;
    if (Buffer.byteLength(encoded, "utf8") > MAX_NATIVE_HOST_MESSAGE_BYTES) {
      throw new NativeHostProtocolError("frame-too-large", "native-host message exceeds the 1 MiB proof frame limit");
    }
    return encoded;
  }

  push(chunk: Buffer | string): NativeHostProofMessage[] {
    this.#buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    if (Buffer.byteLength(this.#buffer, "utf8") > MAX_NATIVE_HOST_MESSAGE_BYTES) {
      this.#buffer = "";
      throw new NativeHostProtocolError("frame-too-large", "native-host buffered frame exceeds the 1 MiB proof frame limit");
    }
    const messages: NativeHostProofMessage[] = [];
    let newline = this.#buffer.indexOf("\n");
    while (newline >= 0) {
      const line = this.#buffer.slice(0, newline);
      this.#buffer = this.#buffer.slice(newline + 1);
      if (line.length > 0) messages.push(this.decodeLine(line));
      newline = this.#buffer.indexOf("\n");
    }
    return messages;
  }

  private decodeLine(line: string): NativeHostProofMessage {
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      throw new NativeHostProtocolError("malformed-frame", "native-host frame is not valid JSON");
    }
    if (!isProofMessage(value)) throw new NativeHostProtocolError("invalid-message", "native-host frame does not match the proof message contract");
    assertNativeHostProofMessage(value);
    return value;
  }
}

function isProofMessage(value: unknown): value is NativeHostProofMessage {
  return typeof value === "object"
    && value !== null
    && typeof (value as { type?: unknown }).type === "string"
    && ["hello", "hello-result", "command", "command-result", "event", "error"].includes((value as { type: string }).type);
}
