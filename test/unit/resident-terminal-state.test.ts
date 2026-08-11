import Headless from "@xterm/headless";
import { describe, expect, it } from "vitest";
import { ResidentTerminalState, type ResidentTerminalMetadata } from "../../src/drivers/terminal/resident-terminal-state.js";

const { Terminal } = Headless;
const modes = {
  applicationCursorKeys: false, applicationKeypad: false, alternateScroll: false,
  bracketedPaste: false, focusReporting: false, mouseTracking: "none" as const,
  mouseProtocol: "x10" as const, synchronizedOutput: false, wraparound: true,
  keyboardProtocol: "legacy" as const, modifyOtherKeys: 0 as const,
  kittyKeyboardFlags: 0, win32InputMode: false,
};
const metadata: ResidentTerminalMetadata = {
  cursorVisible: true, cursorStyle: "default", cursorBlinking: true, modes,
};

function write(terminal: InstanceType<typeof Terminal>, data: string): Promise<void> {
  return new Promise(resolve => terminal.write(data, resolve));
}

describe("bounded incremental resident terminal state", () => {
  it("reuses unchanged rows and allocates only rows whose cells changed", async () => {
    const terminal = new Terminal({ cols: 6, rows: 3, scrollback: 20, allowProposedApi: true });
    const resident = new ResidentTerminalState(terminal, 4);
    await write(terminal, "AAAA\r\nBBBB");
    const first = resident.capture(1, 1, false, metadata);

    await write(terminal, "\x1b[2;5H");
    const cursorOnly = resident.capture(2, 2, false, metadata);
    expect(cursorOnly.cells[0]).toBe(first.cells[0]);
    expect(cursorOnly.cells[1]).toBe(first.cells[1]);
    expect(cursorOnly.cells[2]).toBe(first.cells[2]);

    await write(terminal, "\x1b[1;1HZ");
    const changed = resident.capture(3, 3, false, metadata);
    expect(changed.cells[0]).not.toBe(cursorOnly.cells[0]);
    expect(changed.cells[1]).toBe(cursorOnly.cells[1]);
    expect(changed.cells[2]).toBe(cursorOnly.cells[2]);
  });

  it("appends only newly scrolled rows to a bounded scrollback ring", async () => {
    const terminal = new Terminal({ cols: 6, rows: 2, scrollback: 20, allowProposedApi: true });
    const resident = new ResidentTerminalState(terminal, 3);
    await write(terminal, "one\r\ntwo");
    resident.capture(1, 1, false, metadata);
    await write(terminal, "\r\nthree\r\nfour\r\nfive\r\nsix");
    const surface = resident.capture(2, 2, false, metadata);
    expect(surface.scrollbackCells).toHaveLength(3);
    expect(surface.scrollbackCells?.map(row => row.map(cell => cell.character).join("").trim())).toEqual(["two", "three", "four"]);
  });
});
