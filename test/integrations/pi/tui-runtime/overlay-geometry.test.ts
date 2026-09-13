import { describe, expect, it } from "vitest";
import type { PresentationPointerSurface } from "../../../../src/contracts/presentation/index.js";
import { PiTuiRuntimeAdapter, type PiTuiOverlayOptions } from "../../../../src/integrations/pi/tui-runtime/index.js";
import { TestPresentationTerminal } from "../../../features/owned-ui/neutral-port-doubles.js";
import { replayTerminalPaint } from "../../../support/rendering/terminal-paint-evidence.js";

const cases: PiTuiOverlayOptions[] = [
  {},
  ...["center", "top-left", "top-center", "top-right", "left-center", "right-center", "bottom-left", "bottom-center", "bottom-right"]
    .map(anchor => ({ anchor, width: 11 } as PiTuiOverlayOptions)),
  { width: "50%", minWidth: 25, maxHeight: "30%", row: "25%", col: "75%", margin: 2 },
  { width: "100%", maxHeight: "100%", anchor: "top-left" },
  { width: 20, row: 2, col: 3, offsetX: 7, offsetY: -1, margin: { top: 1, bottom: 2, left: 2, right: 3 } },
  { width: 100, maxHeight: 100, row: 100, col: 100 },
  { width: 7, offsetX: -100, offsetY: -100 },
];

describe("painted overlay geometry", () => {
  it.each(cases)("matches independent terminal cells for %j", async options => {
    const terminal = new TestPresentationTerminal();
    terminal.columns = 40;
    terminal.rows = 16;
    let surfaces: readonly PresentationPointerSurface[] | null = [];
    const runtime = new PiTuiRuntimeAdapter({
      root: { render: () => Array.from({ length: terminal.rows }, () => ".".repeat(terminal.columns)), invalidate() {} },
      terminal, mode: "fullscreen", onOverlayGeometry: next => { surfaces = next; },
    });
    runtime.start();
    try {
      const component = { render: (width: number) => Array.from({ length: 8 }, () => "#".repeat(width)), invalidate() {} };
      const handle = runtime.showOverlay(component, options);
      expect(surfaces).toBeNull();
      for (const [columns, rows] of [[40, 16], [17, 9], [80, 24]]) {
        terminal.resize(columns!, rows!);
        runtime.renderNow(true);
        const screen = (await replayTerminalPaint(terminal.writes.map(data => ({ data, atMs: 0 })), {
          columns: columns!, rows: rows!, synchronizedUpdates: "honor",
        })).final.rows;
        const region = surfaces?.[0];
        expect(region).toBeDefined();
        for (let row = 1; row <= rows!; row++) {
          for (let column = 1; column <= columns!; column++) {
            const covered = row >= region!.rowStart && row <= region!.rowEnd && column >= region!.columnStart && column <= region!.columnEnd;
            expect(screen[row - 1]?.[column - 1] === "#", `${column},${row}`).toBe(covered);
          }
        }
      }
      handle.hide();
      runtime.renderNow();
      expect(surfaces).toEqual([]);
    } finally { await runtime.stop({ drainInput: false }); }
  });

  it("observes a runtime-created search overlay without a shell command registration", async () => {
    const terminal = new TestPresentationTerminal();
    let surfaces: readonly PresentationPointerSurface[] | null = [];
    const runtime = new PiTuiRuntimeAdapter({ root: { render: () => ["searchable text"], invalidate() {} }, terminal,
      mode: "fullscreen", onOverlayGeometry: next => { surfaces = next; } });
    runtime.start();
    try {
      runtime.renderNow();
      terminal.input("\u001b[102;6u");
      runtime.renderNow();
      expect(surfaces).toHaveLength(1);
      expect(runtime.hasFocusedOverlay()).toBe(true);
      terminal.input("\u001b");
      runtime.renderNow();
      expect(surfaces).toEqual([]);
    } finally { await runtime.stop({ drainInput: false }); }
  });

  it("tracks only rendered overlays in actual stacking order through focus, hide, and responsive visibility", async () => {
    const terminal = new TestPresentationTerminal();
    terminal.columns = 40;
    let surfaces: readonly PresentationPointerSurface[] | null = [];
    const runtime = new PiTuiRuntimeAdapter({ root: { render: () => ["root"], invalidate() {} }, terminal,
      mode: "fullscreen", onOverlayGeometry: next => { surfaces = next; } });
    runtime.start();
    try {
      const back = { render: () => ["back"], invalidate() {} };
      const front = { render: () => ["front"], invalidate() {} };
      const a = runtime.showOverlay(back, { width: 10 });
      const b = runtime.showOverlay(front, { width: 10, visible: columns => columns >= 30 });
      runtime.renderNow();
      expect(surfaces?.map(surface => surface.component)).toEqual([back, front]);
      a.focus();
      runtime.renderNow();
      expect(surfaces?.map(surface => surface.component)).toEqual([front, back]);
      a.setHidden(true);
      runtime.renderNow();
      expect(surfaces?.map(surface => surface.component)).toEqual([front]);
      terminal.resize(20, 10);
      runtime.renderNow();
      expect(surfaces).toEqual([]);
      a.setHidden(false);
      runtime.renderNow();
      expect(surfaces?.map(surface => surface.component)).toEqual([back]);
      b.hide();
      a.hide();
    } finally { await runtime.stop({ drainInput: false }); }
  });
});
