import { describe, expect, it } from "vitest";
import type { TerminalSurface } from "../../src/domain/index.js";
import { FullscreenHostRenderer } from "../../src/ui/host-terminal-renderer.js";

const childSurface: TerminalSurface = {
  columns: 1,
  rows: 1,
  cells: [[{ character: "X", width: 1, attributes: 0 }]],
  cursor: { column: 0, row: 0, visible: true, style: "block", blinking: true },
  activeScreen: "alternate",
  modes: {
    applicationCursorKeys: true,
    applicationKeypad: true,
    alternateScroll: true,
    bracketedPaste: true,
    focusReporting: true,
    mouseTracking: "any",
    mouseProtocol: "sgr",
    synchronizedOutput: false,
    wraparound: false,
    keyboardProtocol: "win32",
    modifyOtherKeys: 2,
    kittyKeyboardFlags: 7,
    win32InputMode: true,
  },
  outputSequence: 1,
  revision: 1,
  final: false,
};

describe("fullscreen host terminal ownership", () => {
  it("owns outer input modes while keeping child modes virtual", async () => {
    let writes = "";
    const renderer = new FullscreenHostRenderer({ write: value => { writes += String(value); return true; } });
    renderer.enter();
    const afterEnter = writes.length;
    expect(writes).not.toContain("\x1b[?1049h");
    expect(writes).not.toContain("\x1b[2J");
    expect(writes).not.toContain("\x1b[?1003h");

    renderer.renderSnapshot(childSurface);
    await new Promise<void>(resolve => setImmediate(resolve));
    const rendered = writes.slice(afterEnter);
    expect(rendered).toContain("X");
    expect(rendered.indexOf("\x1b[?2026h")).toBeLessThan(rendered.indexOf("\x1b[2J"));
    expect(rendered.indexOf("\x1b[2J")).toBeLessThan(rendered.indexOf("X"));
    expect(rendered.indexOf("X")).toBeLessThan(rendered.indexOf("\x1b[?2026l"));
    expect(rendered).toContain("\x1b[?1049h");
    expect(rendered).toContain("\x1b[?1003h");
    expect(rendered).toContain("\x1b[?1006h");
    expect(rendered).not.toContain("\x1b[?9001h");

    renderer.renderSnapshot({ ...childSurface, modes: { ...childSurface.modes, mouseTracking: "none" } });
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(writes.slice(afterEnter)).toContain("\x1b[?1003l");

    renderer.restore();
    await new Promise<void>(resolve => setImmediate(resolve));
    const once = writes;
    renderer.restore();
    expect(writes).toBe(once);
    expect(writes.lastIndexOf("\x1b[?1003l")).toBeLessThan(writes.lastIndexOf("\x1b[?1049l"));
    expect(writes.lastIndexOf("\x1b[0 q")).toBeLessThan(writes.lastIndexOf("\x1b[?1049l"));
  });

  it("appends the first normal-screen snapshot from the caller cursor without clearing history", async () => {
    let writes = "";
    const renderer = new FullscreenHostRenderer(
      { write: value => { writes += String(value); return true; } },
      0, "", "", undefined, undefined, undefined, 3,
    );
    const vanilla = {
      ...childSurface,
      columns: 2,
      rows: 6,
      cells: [
        [{ character: "P", width: 1 as const, attributes: 0 }, { character: "i", width: 1 as const, attributes: 0 }],
        [{ character: "U", width: 1 as const, attributes: 0 }, { character: "I", width: 1 as const, attributes: 0 }],
        ...Array.from({ length: 4 }, () => [
          { character: " ", width: 1 as const, attributes: 0 },
          { character: " ", width: 1 as const, attributes: 0 },
        ]),
      ],
      cursor: { ...childSurface.cursor, row: 1, column: 1 },
      activeScreen: "normal" as const,
      modes: { ...childSurface.modes, mouseTracking: "none" as const },
    };
    renderer.enter();
    renderer.renderSnapshot(vanilla);
    await new Promise<void>(resolve => setImmediate(resolve));

    expect(writes).not.toContain("\x1b[2J");
    expect(writes).not.toContain("\x1b[H");
    expect(writes).not.toContain("\x1b[1;1H");
    expect(writes).toContain("Pi\x1b[0m\r\n");
    expect(writes).not.toContain("Pi \x1b[0m");
    expect(writes).toContain("UI");
    expect(writes).toContain("\r\x1b[2C");
  });

  it("uses normal-screen scrolling for vanilla surfaces without repainting shifted rows", async () => {
    let writes = "";
    const renderer = new FullscreenHostRenderer({ write: value => { writes += String(value); return true; } });
    const vanilla = {
      ...childSurface,
      activeScreen: "normal" as const,
      modes: { ...childSurface.modes, mouseTracking: "none" as const },
      scrollbackBase: 0,
    };
    renderer.enter();
    renderer.renderSnapshot(vanilla);
    await new Promise<void>(resolve => setImmediate(resolve));
    const before = writes.length;
    renderer.renderDamage({
      generationId: "g", baseRevision: 1, revision: 2, outputSequence: 2,
      dimensions: { columns: 1, rows: 1 }, scrollRows: 1,
      spans: [{ row: 0, startColumn: 0, cells: [{ character: "N", width: 1, attributes: 0 }] }],
      cursor: vanilla.cursor, activeScreen: "normal", modes: vanilla.modes,
      synchronized: false, final: false,
    });
    await new Promise<void>(resolve => setImmediate(resolve));
    await new Promise<void>(resolve => setImmediate(resolve));
    const damageWrites = writes.slice(before);
    expect(damageWrites).toContain("\r\n");
    expect(damageWrites).toContain("\x1b[1;1H");
    expect(damageWrites).toContain("N");
    expect(damageWrites.startsWith("\x1b[?2026h")).toBe(true);
    expect(damageWrites.endsWith("\x1b[?2026l")).toBe(true);
    expect(damageWrites.indexOf("\r\n")).toBeLessThan(damageWrites.indexOf("N"));
    expect(damageWrites.match(/\x1b\[\?2026h/g) ?? []).toHaveLength(1);
    expect(damageWrites.match(/\x1b\[\?2026l/g) ?? []).toHaveLength(1);
    const beforeRestore = writes.length;
    renderer.restore();
    const restoration = writes.slice(beforeRestore);
    expect(writes.match(/\x1b\[\?1049l/g) ?? []).toHaveLength(0);
    expect(restoration).toContain("\x1b[?25h");
    expect(restoration).not.toContain("\r\n");
  });

  it("clears stale fixed rows when a replacement snapshot moves them", async () => {
    let writes = "";
    const renderer = new FullscreenHostRenderer({ write: value => { writes += String(value); return true; } });
    const blank = { character: " ", width: 1 as const, attributes: 0 };
    const cell = (character: string) => ({ character, width: 1 as const, attributes: 0 });
    const surface = {
      ...childSurface,
      columns: 6,
      rows: 4,
      activeScreen: "normal" as const,
      modes: { ...childSurface.modes, mouseTracking: "none" as const },
      cells: [
        Array.from("HEADER", cell),
        [blank, blank, blank, blank, blank, blank],
        Array.from("STATUS", cell),
        Array.from("FOOTER", cell),
      ],
      cursor: { ...childSurface.cursor, row: 3 },
    };
    renderer.enter();
    renderer.renderSnapshot(surface);
    await new Promise<void>(resolve => setImmediate(resolve));
    const before = writes.length;

    renderer.renderSnapshot({
      ...surface,
      revision: 2,
      cells: [
        Array.from("HEADER", cell),
        Array.from("STATUS", cell),
        Array.from("FOOTER", cell),
        [blank, blank, blank, blank, blank, blank],
      ],
      cursor: { ...surface.cursor, row: 2 },
    });
    await new Promise<void>(resolve => setImmediate(resolve));
    await new Promise<void>(resolve => setImmediate(resolve));

    const replacement = writes.slice(before);
    expect(replacement).toContain("\x1b[4;1H\x1b[0m\x1b[2K");
    expect(replacement.match(/STATUS/g) ?? []).toHaveLength(1);
    expect(replacement.match(/FOOTER/g) ?? []).toHaveLength(1);
    expect(replacement.match(/\x1b\[\?2026h/g) ?? []).toHaveLength(1);
    expect(replacement.match(/\x1b\[\?2026l/g) ?? []).toHaveLength(1);
  });

  it("emits one balanced host write for each already-assembled render transaction", async () => {
    const writes: string[] = [];
    const renderer = new FullscreenHostRenderer({ write: value => { writes.push(String(value)); return true; } });
    renderer.enter();
    renderer.renderSnapshot(childSurface);
    await new Promise<void>(resolve => setImmediate(resolve));
    const handoffWrites = writes.slice(1);
    expect(handoffWrites).toHaveLength(3);
    const handoff = handoffWrites.join("");
    expect(handoff.match(/\x1b\[\?2026h/g) ?? []).toHaveLength(1);
    expect(handoff.match(/\x1b\[\?2026l/g) ?? []).toHaveLength(1);
    expect(handoff).toContain("\x1b[2J");
    expect(handoff).toContain("X");
    const before = writes.length;
    const base = { generationId: "g", dimensions: { columns: 1, rows: 1 }, cursor: childSurface.cursor, activeScreen: childSurface.activeScreen, modes: childSurface.modes, final: false } as const;
    renderer.renderDamage({ ...base, baseRevision: 1, revision: 2, outputSequence: 2, spans: [{ row: 0, startColumn: 0, cells: [{ character: "P", width: 1, attributes: 0 }] }], synchronized: false });
    renderer.renderDamage({ ...base, baseRevision: 2, revision: 3, outputSequence: 3, spans: [{ row: 0, startColumn: 0, cells: [{ character: "Q", width: 1, attributes: 0 }] }], synchronized: true });
    await new Promise<void>(resolve => setImmediate(resolve));
    await new Promise<void>(resolve => setImmediate(resolve));
    const transactionChunks = writes.slice(before);
    expect(transactionChunks).toHaveLength(6);
    const transactionWrites = [transactionChunks.slice(0, 3).join(""), transactionChunks.slice(3, 6).join("")];
    for (const write of transactionWrites) {
      expect(write.match(/\x1b\[\?2026h/g) ?? []).toHaveLength(1);
      expect(write.match(/\x1b\[\?2026l/g) ?? []).toHaveLength(1);
    }
    expect(transactionWrites[0]).toContain("P");
    expect(transactionWrites[1]).toContain("Q");
  });

  it("flushes ordinary editor damage without the former fixed 50ms delay", async () => {
    let writes = "";
    const renderer = new FullscreenHostRenderer({ write: value => { writes += String(value); return true; } });
    renderer.enter();
    renderer.renderSnapshot(childSurface);
    await new Promise<void>(resolve => setImmediate(resolve));
    const before = writes.length;
    renderer.renderDamage({
      generationId: "g", baseRevision: 1, revision: 2, outputSequence: 2,
      dimensions: { columns: 1, rows: 1 },
      spans: [{ row: 0, startColumn: 0, cells: [{ character: "R", width: 1, attributes: 0 }] }],
      cursor: childSurface.cursor, activeScreen: childSurface.activeScreen, modes: childSurface.modes,
      synchronized: false, final: false,
    });
    await new Promise(resolve => setTimeout(resolve, 20));
    const damageWrites = writes.slice(before);
    expect(damageWrites).toContain("R");
    expect(damageWrites.startsWith("\x1b[?2026h")).toBe(true);
    expect(damageWrites.endsWith("\x1b[?2026l")).toBe(true);
  });
});
