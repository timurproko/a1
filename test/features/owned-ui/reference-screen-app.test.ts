import { afterEach, describe, expect, it, vi } from "vitest";
import type { OwnedUiViewportSettings } from "../../../src/contracts/owned-ui/index.js";
import { REFERENCE_SCREEN_SHORTCUTS, ReferenceScreenApp, type ReferenceDocumentProvider } from "../../../src/features/owned-ui/index.js";
import { UiAppHost, UiAppRegistry, type AppHostServices } from "../../../src/ui/apps/index.js";
import { RAIL_COLUMNS, finalizeFrame, type UiTheme, type UiThemeToken } from "../../../src/ui/components/index.js";

const ESC = "\u001b";
const UP = `${ESC}[A`;
const DOWN = `${ESC}[B`;
const PAGE_UP = `${ESC}[5~`;
const PAGE_DOWN = `${ESC}[6~`;
const HOME = `${ESC}[H`;
const END = `${ESC}[F`;
const INTERRUPT = "\u0003";
const RECT = { width: 60, height: 10 };
/** Rows the document has on screen: the rectangle minus the title, blank row, and hint. */
const BODY = RECT.height - 3;
const RAIL_COLUMN = RECT.width;

const HOST: AppHostServices = {
  getSize: () => RECT,
  requestRender: () => {},
  close: () => {},
  returnToPrevious: () => {},
  exit: () => {},
  interruptArmed: false,
  closeOnInterrupt: true,
};

/** Names every token it paints, so a line says which role each part took. */
const NAMING_THEME: UiTheme = Object.freeze({
  fg: (token: UiThemeToken, text: string) => `<${token}>${text}</${token}>`,
  bold: (text: string) => `<b>${text}</b>`,
  plain: (text: string) => text,
  highlight: (text: string) => text,
  disabled: (text: string) => text,
  panel: (text: string) => text,
});

function settings(overrides: Partial<OwnedUiViewportSettings> = {}): () => OwnedUiViewportSettings {
  return () => ({ scrollbarAppearance: "auto", scrollbarStyle: "thin", scrollbarSpeed: "normal", ...overrides });
}

function numbered(count: number): readonly string[] {
  return Array.from({ length: count }, (_row, index) => `row ${String(index + 1).padStart(2, "0")}`);
}

function app(rows: readonly string[] | ((width: number) => readonly string[]), overrides: Partial<OwnedUiViewportSettings> = {}, title = "Reference") {
  const calls: number[] = [];
  const provider: ReferenceDocumentProvider = {
    rows: width => { calls.push(width); return typeof rows === "function" ? rows(width) : rows; },
  };
  return { app: new ReferenceScreenApp({ id: "reference", title, document: provider, scrollSettings: settings(overrides) }), calls };
}

function screen(target: ReferenceScreenApp, host: AppHostServices = HOST, rect = RECT): string[] {
  return [...target.render(rect, host)];
}

function body(target: ReferenceScreenApp, host: AppHostServices = HOST): string[] {
  return screen(target, host).slice(2, 2 + BODY).map(line => line.slice(0, RECT.width - RAIL_COLUMNS).trimEnd());
}

function railCells(target: ReferenceScreenApp): string[] {
  return screen(target).slice(2, 2 + BODY).map(line => (line.length >= RAIL_COLUMN ? line.charAt(RAIL_COLUMN - 1) : ""));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ReferenceScreenApp frame", () => {
  it("shows the title, a blank row, a fitting document, padding, and the hint from its declared shortcuts", () => {
    const { app: target } = app(["alpha", "beta"]);
    const lines = screen(target, { ...HOST, theme: NAMING_THEME });
    expect(lines).toHaveLength(RECT.height);
    expect(lines[0]).toBe("<b><accent>Reference</accent></b>");
    expect(lines[1]).toBe("");
    expect(lines[2]?.startsWith("alpha")).toBe(true);
    expect(lines[3]?.startsWith("beta")).toBe(true);
    expect(lines.slice(4, RECT.height - 1).every(line => line.trim() === "")).toBe(true);
    const hint = REFERENCE_SCREEN_SHORTCUTS.hint("reference-screen");
    expect(hint).toBe("↑↓ to scroll · PgUp/PgDn to page · Esc to close");
    expect(lines.at(-1)).toContain(`<dim>${hint}</dim>`);
    // Invariant: a fitting document does not move and reserves the rail columns under auto.
    target.onInput?.(DOWN, HOST);
    target.onInput?.(END, HOST);
    expect(body(target)).toEqual(["alpha", "beta", ...Array(BODY - 2).fill("")]);
    expect(screen(target).slice(2, 2 + BODY).every(line => line.length === RECT.width)).toBe(true);
    expect(railCells(target).every(cell => cell === " ")).toBe(true);
  });

  it("shows the interrupt notice while the chord is armed and leaves the interrupt byte to the host", () => {
    const { app: target } = app(["alpha"]);
    expect(screen(target, { ...HOST, interruptArmed: true }).at(-1)).toContain("press ctrl+c again to exit a1");
    expect(target.onInput?.(INTERRUPT, HOST)).toEqual({ consumed: false });
  });

  it("closes through the host on Escape", () => {
    const close = vi.fn();
    const { app: target } = app(["alpha"]);
    expect(target.onInput?.(ESC, { ...HOST, close })).toEqual({ consumed: true });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("shows a loading notice until a pending provider is ready, then renders the document once", async () => {
    let ready!: () => void;
    let rows: readonly string[] | null = null;
    const provider: ReferenceDocumentProvider = {
      rows: () => rows,
      ready: new Promise<void>(resolve => { ready = resolve; }),
    };
    const requestRender = vi.fn();
    const host = { ...HOST, requestRender };
    const target = new ReferenceScreenApp({ id: "reference", title: "Pending", document: provider, scrollSettings: settings() });
    target.onActivate?.(host);
    expect(body(target, host)[0]).toBe("Loading…");
    rows = ["ready row"];
    ready();
    await Promise.resolve();
    expect(requestRender).toHaveBeenCalledTimes(1);
    expect(body(target, host)[0]).toBe("ready row");
  });

  it("reports a provider that fails to become ready instead of throwing", async () => {
    const provider: ReferenceDocumentProvider = { rows: () => null, ready: Promise.reject(new Error("no document")) };
    const requestRender = vi.fn();
    const target = new ReferenceScreenApp({ id: "reference", title: "Broken", document: provider, scrollSettings: settings() });
    target.onActivate?.({ ...HOST, requestRender });
    await Promise.resolve();
    await Promise.resolve();
    expect(requestRender).toHaveBeenCalledTimes(1);
    expect(body(target)[0]).toBe("Could not load Broken: no document");
  });

  it("truncates an over-wide styled row ANSI-aware without leaking its style", () => {
    const styled = `${ESC}[31m${"x".repeat(80)}${ESC}[39m`;
    const { app: target } = app([styled]);
    const row = screen(target)[2]!;
    const plain = row.replace(/\u001b\[[0-9;]*m/g, "");
    expect(plain.length).toBe(RECT.width);
    expect(plain.slice(0, RECT.width - RAIL_COLUMNS)).toBe("x".repeat(RECT.width - RAIL_COLUMNS));
    expect(row.startsWith(`${ESC}[31m`)).toBe(true);
    expect(row).toContain(`${ESC}[0m`);
  });

  it("asks the provider for rows only when the content width changes", () => {
    const { app: target, calls } = app(width => [`width ${width}`]);
    screen(target);
    target.onMouse?.({ kind: "wheel-down", button: 0, row: 3, column: 5 }, HOST);
    screen(target);
    screen(target, HOST, { width: RECT.width, height: RECT.height + 4 });
    expect(calls).toEqual([RECT.width - RAIL_COLUMNS]);
    expect(screen(target, HOST, { width: 80, height: RECT.height })[2]?.startsWith(`width ${80 - RAIL_COLUMNS}`)).toBe(true);
    expect(calls).toEqual([RECT.width - RAIL_COLUMNS, 80 - RAIL_COLUMNS]);
    // Invariant: hidden gives the rail columns back, so the provider wraps at the full width.
    const { app: hidden, calls: hiddenCalls } = app(width => [`width ${width}`], { scrollbarAppearance: "hidden" });
    screen(hidden);
    expect(hiddenCalls).toEqual([RECT.width]);
  });

  it("keeps the frame contract at small rectangles", () => {
    const { app: target } = app(numbered(20));
    for (const rect of [{ width: 0, height: 0 }, { width: 3, height: 1 }, { width: 5, height: 2 }, { width: 1, height: 3 }, { width: 12, height: 4 }]) {
      const lines = target.render(rect, HOST);
      expect(lines).toHaveLength(rect.height);
      expect(() => finalizeFrame(lines, rect, "reference")).not.toThrow();
      expect(finalizeFrame(lines, rect, "reference")).toEqual(lines);
    }
  });
});

describe("ReferenceScreenApp scrolling", () => {
  it("moves by row, page, and to either end, clamped to the document", () => {
    const { app: target } = app(numbered(20));
    expect(body(target)[0]).toBe("row 01");
    target.onInput?.(UP, HOST);
    expect(body(target)[0]).toBe("row 01");
    target.onInput?.(DOWN, HOST);
    expect(body(target)[0]).toBe("row 02");
    target.onInput?.(PAGE_DOWN, HOST);
    expect(body(target)[0]).toBe(`row ${String(2 + BODY).padStart(2, "0")}`);
    target.onInput?.(END, HOST);
    expect(body(target)).toEqual(numbered(20).slice(20 - BODY));
    target.onInput?.(DOWN, HOST);
    target.onInput?.(PAGE_DOWN, HOST);
    expect(body(target)).toEqual(numbered(20).slice(20 - BODY));
    target.onInput?.(PAGE_UP, HOST);
    expect(body(target)[0]).toBe(`row ${String(20 - 2 * BODY + 1).padStart(2, "0")}`);
    target.onInput?.(HOME, HOST);
    expect(body(target)[0]).toBe("row 01");
    target.onInput?.(PAGE_UP, HOST);
    expect(body(target)[0]).toBe("row 01");
  });

  it.each([["normal", 3], ["fast", 6], ["high", 9]] as const)("scrolls the wheel by the %s distance", (speed, distance) => {
    const { app: target } = app(numbered(40), { scrollbarSpeed: speed });
    screen(target);
    expect(target.onMouse?.({ kind: "wheel-down", button: 0, row: 5, column: 10 }, HOST)).toEqual({ consumed: true });
    expect(body(target)[0]).toBe(`row ${String(1 + distance).padStart(2, "0")}`);
    target.onMouse?.({ kind: "wheel-down", button: 0, row: 5, column: 10 }, HOST);
    expect(body(target)[0]).toBe(`row ${String(1 + 2 * distance).padStart(2, "0")}`);
    target.onMouse?.({ kind: "wheel-up", button: 0, row: 5, column: 10 }, HOST);
    expect(body(target)[0]).toBe(`row ${String(1 + distance).padStart(2, "0")}`);
    target.onMouse?.({ kind: "wheel-up", button: 0, row: 5, column: 10 }, HOST);
    target.onMouse?.({ kind: "wheel-up", button: 0, row: 5, column: 10 }, HOST);
    expect(body(target)[0]).toBe("row 01");
  });

  it("lights the rail on hover, follows a thumb drag, and pages on a track press", () => {
    const { app: target } = app(numbered(70), { scrollbarAppearance: "always" });
    const initial = railCells(target);
    expect(initial.filter(cell => cell === "│").length).toBeGreaterThan(0);
    const thumbRow = initial.indexOf("│");
    expect(thumbRow).toBe(0);

    // Invariant: hovering the thumb thickens it; motion elsewhere is not consumed but repaints the rail.
    expect(target.onMouse?.({ kind: "motion", button: 0, row: 3 + thumbRow, column: RAIL_COLUMN }, HOST)).toEqual({ consumed: true });
    expect(railCells(target)[thumbRow]).toBe("┃");
    expect(target.onMouse?.({ kind: "motion", button: 0, row: 3, column: 5 }, HOST)).toEqual({ consumed: false, render: true });
    expect(railCells(target)[thumbRow]).toBe("│");

    // Invariant: a press below the thumb pages toward the pointer.
    target.onMouse?.({ kind: "press", button: 0, row: 3 + BODY - 1, column: RAIL_COLUMN }, HOST);
    expect(body(target)[0]).toBe(`row ${String(1 + BODY).padStart(2, "0")}`);
    target.onInput?.(HOME, HOST);
    screen(target);

    // Invariant: a drag from the thumb to the bottom of the track reaches the end of the document.
    target.onMouse?.({ kind: "press", button: 0, row: 3 + thumbRow, column: RAIL_COLUMN }, HOST);
    target.onMouse?.({ kind: "motion", button: 0, row: 3 + BODY - 1, column: RAIL_COLUMN }, HOST);
    expect(body(target)).toEqual(numbered(70).slice(70 - BODY));
    // Invariant: the drag follows the pointer off the rail until the button comes up.
    target.onMouse?.({ kind: "motion", button: 0, row: 3, column: 5 }, HOST);
    expect(body(target)[0]).toBe("row 01");
    target.onMouse?.({ kind: "release", button: 0, row: 3, column: 5 }, HOST);
    target.onMouse?.({ kind: "motion", button: 0, row: 3 + BODY - 1, column: RAIL_COLUMN }, HOST);
    expect(body(target)[0]).toBe("row 01");
  });

  it("lights the rail under auto for the shared linger after a scroll, with an injected clock", () => {
    vi.useFakeTimers();
    const { app: target } = app(numbered(40));
    const requestRender = vi.fn();
    const host = { ...HOST, requestRender };
    expect(target.render(RECT, host).slice(2, 2 + BODY).every(line => line.charAt(RAIL_COLUMN - 1) === " ")).toBe(true);
    target.onMouse?.({ kind: "wheel-down", button: 0, row: 3, column: 10 }, host);
    const cells = () => target.render(RECT, host).slice(2, 2 + BODY).map(line => line.charAt(RAIL_COLUMN - 1));
    expect(cells()).toContain("│");
    vi.advanceTimersByTime(800);
    expect(cells()).toContain("│");
    expect(requestRender).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(requestRender).toHaveBeenCalledTimes(1);
    expect(cells().every(cell => cell === " ")).toBe(true);
    target.onInput?.(END, host);
    expect(cells()).toContain("│");
    target.onClose?.(host);
    vi.advanceTimersByTime(2000);
    expect(requestRender).toHaveBeenCalledTimes(1);
  });

  it("draws the configured rail style under always and no rail under hidden", () => {
    const { app: thick } = app(numbered(40), { scrollbarAppearance: "always", scrollbarStyle: "thick" });
    expect(railCells(thick)).toContain("┃");
    expect(railCells(thick)).not.toContain("│");
    const { app: hidden } = app(numbered(40), { scrollbarAppearance: "hidden" });
    const lines = screen(hidden);
    expect(lines.join("\n")).not.toMatch(/[│┃]/);
    // Invariant: the former rail column is document space; pressing it pages nothing.
    hidden.onMouse?.({ kind: "press", button: 0, row: 3 + BODY - 1, column: RAIL_COLUMN }, HOST);
    expect(body(hidden)[0]).toBe("row 01");
  });

  it("clamps the scroll position when the rectangle grows", () => {
    const { app: target } = app(numbered(20));
    target.onInput?.(END, HOST);
    expect(body(target)[0]).toBe(`row ${String(20 - BODY + 1).padStart(2, "0")}`);
    const tall = { width: RECT.width, height: 30 };
    const lines = screen(target, HOST, tall);
    expect(lines).toHaveLength(30);
    expect(lines[2]?.startsWith("row 01")).toBe(true);
    expect(lines[21]?.startsWith("row 20")).toBe(true);
  });
});

describe("ReferenceScreenApp in the app host", () => {
  it("renders through the host, closes on Escape, and exits on the interrupt chord", () => {
    const registry = new UiAppRegistry();
    registry.register({
      id: "reference",
      route: "reference",
      create: () => new ReferenceScreenApp({ id: "reference", title: "Hosted", document: { rows: () => ["hosted row"] }, scrollSettings: settings() }),
    });
    let frame: readonly string[] | null = [];
    const exit = vi.fn();
    const host = new UiAppHost({
      registry,
      closeOnInterrupt: true,
      surface: { size: () => RECT, requestRender: () => {}, present: lines => { frame = lines; }, exit },
    });
    host.open("reference");
    expect(frame![0]).toBe("Hosted");
    expect(frame![2]?.startsWith("hosted row")).toBe(true);
    expect(host.handleInput(INTERRUPT)).toEqual({ consumed: true, render: true });
    expect(host.isPresenting).toBe(true);
    host.render();
    expect(frame!.at(-1)).toContain("press ctrl+c again to exit a1");
    expect(host.handleInput(INTERRUPT)).toEqual({ consumed: true, render: true });
    expect(host.isPresenting).toBe(false);
    expect(exit).toHaveBeenCalledTimes(1);

    host.open("reference");
    expect(host.handleInput(ESC).consumed).toBe(true);
    expect(host.isPresenting).toBe(false);
    expect(frame).toBeNull();
  });
});
