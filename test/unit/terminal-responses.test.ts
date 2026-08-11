import Headless from "@xterm/headless";
import { describe, expect, it } from "vitest";
import { installTerminalResponses, writeTerminalOutput } from "../../src/drivers/terminal/terminal-responses.js";

const { Terminal } = Headless;

describe("virtual terminal responses", () => {
  it("answers identity, cursor, dimensions, colors, capabilities, and keyboard state in parser order", async () => {
    const terminal = new Terminal({ cols: 90, rows: 28, allowProposedApi: true });
    const responses: { kind: string; data: string }[] = [];
    const collect = (response: { kind: string; bytes: Uint8Array }) => responses.push({ kind: response.kind, data: Buffer.from(response.bytes).toString("utf8") });
    const dispose = installTerminalResponses(terminal, collect);
    await writeTerminalOutput(terminal, "abc\x1b[c\x1b[6n\x1b[18t\x1b[16t\x1b]10;?\x07\x1b]11;?\x07\x1b]4;2;?\x07\x1bP+q544e;524742\x1b\\\x1b[?u", collect);
    dispose();

    expect(responses).toEqual([
      { kind: "device-attributes", data: "\x1b[?1;2c" },
      { kind: "cursor-position", data: "\x1b[1;4R" },
      { kind: "dimensions", data: "\x1b[8;28;90t" },
      { kind: "dimensions", data: "\x1b[6;16;8t" },
      { kind: "color", data: "\x1b]10;rgb:ffff/ffff/ffff\x1b\\" },
      { kind: "color", data: "\x1b]11;rgb:0000/0000/0000\x1b\\" },
      { kind: "color", data: "\x1b]4;2;rgb:8080/8080/8080\x1b\\" },
      { kind: "capability", data: "\x1bP1+r544e=787465726D2D323536636F6C6F72\x1b\\" },
      { kind: "capability", data: "\x1bP1+r524742=31\x1b\\" },
      { kind: "keyboard-state", data: "\x1b[?0u" },
    ]);
  });
});
