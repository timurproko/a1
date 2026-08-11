import type Headless from "@xterm/headless";
import type { TerminalResponse } from "../../domain/index.js";

type HeadlessTerminal = InstanceType<(typeof Headless)["Terminal"]>;

export interface TerminalResponseOptions {
  readonly foreground?: string;
  readonly background?: string;
  readonly cellWidthPixels?: number;
  readonly cellHeightPixels?: number;
}

/** Captures replies generated natively by xterm's parser, such as DA and DSR. */
export function installTerminalResponses(terminal: HeadlessTerminal, send: (response: TerminalResponse) => void): () => void {
  const disposable = terminal.onData(data => send({ kind: classifyBuiltIn(data), bytes: Buffer.from(data, "utf8") }));
  return () => disposable.dispose();
}

/**
 * Feeds child output into the virtual terminal while answering supported
 * queries that xterm-headless does not implement. Splitting at each query keeps
 * custom replies ordered relative to parser-generated DA/DSR replies.
 */
export async function writeTerminalOutput(
  terminal: HeadlessTerminal,
  data: string,
  send: (response: TerminalResponse) => void,
  options: TerminalResponseOptions = {},
): Promise<void> {
  const query = /\x1b\[(14|16|18)t|\x1b\[\?u|\x1b\](10|11);\?(?:\x07|\x1b\\)|\x1b\]4;(\d+);\?(?:\x07|\x1b\\)|\x1bP\+q([0-9a-f;]*)\x1b\\/gi;
  let offset = 0;
  for (const match of data.matchAll(query)) {
    const index = match.index ?? 0;
    if (index > offset) await write(terminal, data.slice(offset, index));
    respond(match);
    offset = index + match[0].length;
  }
  if (offset < data.length) await write(terminal, data.slice(offset));

  function respond(match: RegExpMatchArray): void {
    if (match[1]) {
      const operation = Number(match[1]);
      if (operation === 14) reply("dimensions", `\x1b[4;${terminal.rows * (options.cellHeightPixels ?? 16)};${terminal.cols * (options.cellWidthPixels ?? 8)}t`);
      if (operation === 16) reply("dimensions", `\x1b[6;${options.cellHeightPixels ?? 16};${options.cellWidthPixels ?? 8}t`);
      if (operation === 18) reply("dimensions", `\x1b[8;${terminal.rows};${terminal.cols}t`);
      return;
    }
    if (match[0] === "\x1b[?u") {
      reply("keyboard-state", "\x1b[?0u");
      return;
    }
    if (match[2]) {
      const identifier = Number(match[2]);
      const color = identifier === 10 ? options.foreground ?? "rgb:ffff/ffff/ffff" : options.background ?? "rgb:0000/0000/0000";
      reply("color", `\x1b]${identifier};${color}\x1b\\`);
      return;
    }
    if (match[3]) {
      const index = Math.max(0, Math.min(255, Number(match[3])));
      const value = index < 16 ? "rgb:8080/8080/8080" : "rgb:0000/0000/0000";
      reply("color", `\x1b]4;${index};${value}\x1b\\`);
      return;
    }
    for (const nameHex of (match[4] ?? "").split(";")) {
      const name = fromHex(nameHex);
      const value = ({ TN: "xterm-256color", RGB: "1", colors: "256" } as Record<string, string>)[name];
      reply("capability", `\x1bP${value === undefined ? `0+r${nameHex}` : `1+r${nameHex}=${toHex(value)}`}\x1b\\`);
    }
  }
  function reply(kind: TerminalResponse["kind"], response: string): void {
    send({ kind, bytes: Buffer.from(response, "utf8") });
  }
}

async function write(terminal: HeadlessTerminal, data: string): Promise<void> {
  await new Promise<void>(resolve => terminal.write(data, resolve));
}
function classifyBuiltIn(data: string): TerminalResponse["kind"] {
  return /R$/.test(data) ? "cursor-position" : /c$/.test(data) ? "device-attributes" : "other";
}
function toHex(value: string): string { return Buffer.from(value, "utf8").toString("hex").toUpperCase(); }
function fromHex(value: string): string {
  return /^[0-9a-f]*$/i.test(value) && value.length % 2 === 0 ? Buffer.from(value, "hex").toString("utf8") : "";
}
