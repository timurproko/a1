import { afterEach, describe, expect, it, vi } from "vitest";
import type { OwnedUiViewportSettings } from "../../../src/contracts/owned-ui/index.js";
import { REFERENCE_SCREEN_SHORTCUTS, ReferenceScreenApp, type ReferenceDocumentProvider, type ReferenceDocumentSection } from "../../../src/features/owned-ui/index.js";
import { UiAppHost, UiAppRegistry, type AppHostServices } from "../../../src/ui/apps/index.js";
import { RAIL_COLUMNS, finalizeFrame, renderGroupHeader, type UiTheme, type UiThemeToken } from "../../../src/ui/components/index.js";

const ESC = "\u001b";
const UP = `${ESC}[A`;
const DOWN = `${ESC}[B`;
const PAGE_UP = `${ESC}[5~`;
const PAGE_DOWN = `${ESC}[6~`;
const HOME = `${ESC}[H`;
const END = `${ESC}[F`;
const INTERRUPT = "\u0003";
const RECT = { width: 60, height: 10 };
/** Rows the document has on screen: the rectangle minus the two rules and the hint. */
const BODY = RECT.height - 3;
/** Screen row of the first document row, after the top rule. */
const TOP = 1;
const RULE = "─".repeat(RECT.width);
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

function sectioned(sections: readonly ReferenceDocumentSection[], title = "Reference"): ReferenceScreenApp {
  return new ReferenceScreenApp({
    id: "reference",
    title,
    document: { sections: () => sections },
    scrollSettings: settings(),
  });
}

function screen(target: ReferenceScreenApp, host: AppHostServices = HOST, rect = RECT): string[] {
  return [...target.render(rect, host)];
}

/** The document rows on screen, styling off, rail columns off: the title leads them. */
function body(target: ReferenceScreenApp, host: AppHostServices = HOST): string[] {
  return screen(target, host).slice(TOP, TOP + BODY).map(line => line.replace(/\u001b\[[0-9;]*m/g, "").slice(0, RECT.width - RAIL_COLUMNS).trim());
}

function railCells(target: ReferenceScreenApp): string[] {
  return screen(target).slice(TOP, TOP + BODY).map(line => (line.length >= RAIL_COLUMN ? line.charAt(RAIL_COLUMN - 1) : ""));
}

/** The document rows as the screen holds them: the title, then the numbered provider rows. */
function rowsWithTitle(count: number): readonly string[] {
  return ["Reference", ...numbered(count)];
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ReferenceScreenApp frame", () => {
  it("frames the title-led document between two border rules with the hint from its declared shortcuts", () => {
    const { app: target } = app(["", "alpha", "beta"]);
    const lines = screen(target, { ...HOST, theme: NAMING_THEME });
    expect(lines).toHaveLength(RECT.height);
    // Compatibility: the v2 reference screen: rule, title as the first document row, rule, footer.
    expect(lines[0]).toBe(`<border>${RULE}</border>`);
    // Compatibility: one space before the title, as v2 lines it up with the padded Markdown rows.
    expect(lines[1]?.startsWith(" <b><accent>Reference</accent></b>")).toBe(true);
    expect(lines[2]?.trim()).toBe("");
    expect(lines[3]?.startsWith("alpha")).toBe(true);
    expect(lines[4]?.startsWith("beta")).toBe(true);
    expect(lines.slice(5, RECT.height - 2).every(line => line.trim() === "")).toBe(true);
    expect(lines.at(-2)).toBe(`<border>${RULE}</border>`);
    expect(REFERENCE_SCREEN_SHORTCUTS.hintEntries("reference-screen")).toEqual([
      { key: "esc", action: "close" },
      { key: "↑↓", action: "scroll" },
    ]);
    // Compatibility: the footer remains against the left edge and padded.
    const wideFooter = screen(target, { ...HOST, theme: NAMING_THEME }, { width: 100, height: RECT.height }).at(-1) ?? "";
    expect(wideFooter.startsWith("<dim>esc</dim> <muted>close</muted>  <dim>↑↓</dim> <muted>scroll</muted> ")).toBe(true);
    expect(wideFooter).not.toMatch(/[·•]/u);
    // Invariant: a fitting document does not move and reserves the rail columns under auto.
    target.onInput?.(DOWN, HOST);
    target.onInput?.(END, HOST);
    expect(body(target)).toEqual(["Reference", "", "alpha", "beta", ...Array(BODY - 4).fill("")]);
    expect(screen(target).slice(TOP, TOP + BODY).every(line => line.length === RECT.width)).toBe(true);
    expect(railCells(target).every(cell => cell === " ")).toBe(true);
  });

  it("uses shared accent headers directly above section rows and pins the active section", () => {
    const target = sectioned([
      { title: "Navigation", rows: numbered(8) },
      { title: "Editing", rows: ["edit one", "edit two", "edit three"] },
    ], "Keyboard Shortcuts");
    const rect = { width: 60, height: 7 };
    let lines = screen(target, { ...HOST, theme: NAMING_THEME }, rect);
    expect(lines[1]?.startsWith(" <b><accent>Keyboard Shortcuts</accent></b>")).toBe(true);
    expect(lines[2]?.trim()).toBe("");
    expect(lines[3]?.startsWith(renderGroupHeader("Navigation", rect.width - RAIL_COLUMNS, NAMING_THEME))).toBe(true);
    expect(lines[4]?.startsWith("row 01")).toBe(true);

    target.onInput?.(DOWN, HOST);
    target.onInput?.(DOWN, HOST);
    lines = screen(target, { ...HOST, theme: NAMING_THEME }, rect);
    expect(lines[1]?.startsWith(renderGroupHeader("Navigation", rect.width - RAIL_COLUMNS, NAMING_THEME))).toBe(true);
    expect(lines[2]?.startsWith("row 01")).toBe(true);

    target.onInput?.(END, HOST);
    lines = screen(target, { ...HOST, theme: NAMING_THEME }, rect);
    expect(lines[1]?.startsWith(renderGroupHeader("Editing", rect.width - RAIL_COLUMNS, NAMING_THEME))).toBe(true);
    expect(lines.join("\n")).toContain("edit three");
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
    expect(body(target, host).slice(0, 3)).toEqual(["Pending", "", "Loading…"]);
    rows = ["ready row"];
    ready();
    await Promise.resolve();
    expect(requestRender).toHaveBeenCalledTimes(1);
    expect(body(target, host).slice(0, 2)).toEqual(["Pending", "ready row"]);
  });

  it("reports a provider that fails to become ready instead of throwing", async () => {
    const provider: ReferenceDocumentProvider = { rows: () => null, ready: Promise.reject(new Error("no document")) };
    const requestRender = vi.fn();
    const target = new ReferenceScreenApp({ id: "reference", title: "Broken", document: provider, scrollSettings: settings() });
    target.onActivate?.({ ...HOST, requestRender });
    await Promise.resolve();
    await Promise.resolve();
    expect(requestRender).toHaveBeenCalledTimes(1);
    expect(body(target).slice(0, 3)).toEqual(["Broken", "", "Could not load Broken: no document"]);
  });

  it("truncates an over-wide styled row ANSI-aware without leaking its style", () => {
    const styled = `${ESC}[31m${"x".repeat(80)}${ESC}[39m`;
    const { app: target } = app([styled]);
    const row = screen(target)[TOP + 1]!;
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
    expect(screen(target, HOST, { width: 80, height: RECT.height })[TOP + 1]?.startsWith(`width ${80 - RAIL_COLUMNS}`)).toBe(true);
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
    const rows = rowsWithTitle(20);
    expect(body(target)[0]).toBe("Reference");
    target.onInput?.(UP, HOST);
    expect(body(target)[0]).toBe("Reference");
    target.onInput?.(DOWN, HOST);
    expect(body(target)[0]).toBe("row 01");
    target.onInput?.(PAGE_DOWN, HOST);
    expect(body(target)[0]).toBe(`row ${String(1 + BODY).padStart(2, "0")}`);
    target.onInput?.(END, HOST);
    expect(body(target)).toEqual(rows.slice(rows.length - BODY));
    target.onInput?.(DOWN, HOST);
    target.onInput?.(PAGE_DOWN, HOST);
    expect(body(target)).toEqual(rows.slice(rows.length - BODY));
    target.onInput?.(PAGE_UP, HOST);
    expect(body(target)).toEqual(rows.slice(rows.length - 2 * BODY, rows.length - BODY));
    target.onInput?.(HOME, HOST);
    expect(body(target)[0]).toBe("Reference");
    target.onInput?.(PAGE_UP, HOST);
    expect(body(target)[0]).toBe("Reference");
  });

  it.each([["normal", 3], ["fast", 6], ["high", 9]] as const)("scrolls the wheel by the %s distance", (speed, distance) => {
    const { app: target } = app(numbered(40), { scrollbarSpeed: speed });
    screen(target);
    expect(target.onMouse?.({ kind: "wheel-down", button: 0, row: 5, column: 10 }, HOST)).toEqual({ consumed: true });
    expect(body(target)[0]).toBe(`row ${String(distance).padStart(2, "0")}`);
    target.onMouse?.({ kind: "wheel-down", button: 0, row: 5, column: 10 }, HOST);
    expect(body(target)[0]).toBe(`row ${String(2 * distance).padStart(2, "0")}`);
    target.onMouse?.({ kind: "wheel-up", button: 0, row: 5, column: 10 }, HOST);
    expect(body(target)[0]).toBe(`row ${String(distance).padStart(2, "0")}`);
    target.onMouse?.({ kind: "wheel-up", button: 0, row: 5, column: 10 }, HOST);
    target.onMouse?.({ kind: "wheel-up", button: 0, row: 5, column: 10 }, HOST);
    expect(body(target)[0]).toBe("Reference");
  });

  it("lights the rail on hover, follows a thumb drag, and pages on a track press", () => {
    const { app: target } = app(numbered(70), { scrollbarAppearance: "always" });
    const initial = railCells(target);
    expect(initial.filter(cell => cell === "│").length).toBeGreaterThan(0);
    const thumbRow = initial.indexOf("│");
    expect(thumbRow).toBe(0);

    // Invariant: hovering the thumb thickens it; motion elsewhere is not consumed but repaints the rail.
    expect(target.onMouse?.({ kind: "motion", button: 0, row: TOP + 1 + thumbRow, column: RAIL_COLUMN }, HOST)).toEqual({ consumed: true });
    expect(railCells(target)[thumbRow]).toBe("┃");
    expect(target.onMouse?.({ kind: "motion", button: 0, row: 3, column: 5 }, HOST)).toEqual({ consumed: false, render: true });
    expect(railCells(target)[thumbRow]).toBe("│");

    // Invariant: a press below the thumb pages toward the pointer.
    target.onMouse?.({ kind: "press", button: 0, row: TOP + BODY, column: RAIL_COLUMN }, HOST);
    expect(body(target)[0]).toBe(`row ${String(BODY).padStart(2, "0")}`);
    target.onInput?.(HOME, HOST);
    screen(target);

    // Invariant: a drag from the thumb to the bottom of the track reaches the end of the document.
    target.onMouse?.({ kind: "press", button: 0, row: TOP + 1 + thumbRow, column: RAIL_COLUMN }, HOST);
    target.onMouse?.({ kind: "motion", button: 0, row: TOP + BODY, column: RAIL_COLUMN }, HOST);
    expect(body(target)).toEqual(numbered(70).slice(70 - BODY));
    // Invariant: the drag follows the pointer off the rail until the button comes up.
    target.onMouse?.({ kind: "motion", button: 0, row: TOP + 1, column: 5 }, HOST);
    expect(body(target)[0]).toBe("Reference");
    target.onMouse?.({ kind: "release", button: 0, row: TOP + 1, column: 5 }, HOST);
    target.onMouse?.({ kind: "motion", button: 0, row: TOP + BODY, column: RAIL_COLUMN }, HOST);
    expect(body(target)[0]).toBe("Reference");
  });

  it("lights the rail under auto for the shared linger after a scroll, with an injected clock", () => {
    vi.useFakeTimers();
    const { app: target } = app(numbered(40));
    const requestRender = vi.fn();
    const host = { ...HOST, requestRender };
    expect(target.render(RECT, host).slice(TOP, TOP + BODY).every(line => line.charAt(RAIL_COLUMN - 1) === " ")).toBe(true);
    target.onMouse?.({ kind: "wheel-down", button: 0, row: 3, column: 10 }, host);
    const cells = () => target.render(RECT, host).slice(TOP, TOP + BODY).map(line => line.charAt(RAIL_COLUMN - 1));
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
    hidden.onMouse?.({ kind: "press", button: 0, row: TOP + BODY, column: RAIL_COLUMN }, HOST);
    expect(body(hidden)[0]).toBe("Reference");
  });

  it("clamps the scroll position when the rectangle grows", () => {
    const { app: target } = app(numbered(20));
    target.onInput?.(END, HOST);
    expect(body(target)[0]).toBe(`row ${String(21 - BODY).padStart(2, "0")}`);
    const tall = { width: RECT.width, height: 30 };
    const lines = screen(target, HOST, tall);
    expect(lines).toHaveLength(30);
    expect(lines[TOP]?.startsWith(" Reference")).toBe(true);
    expect(lines[TOP + 1]?.startsWith("row 01")).toBe(true);
    expect(lines[TOP + 20]?.startsWith("row 20")).toBe(true);
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
    expect(frame![0]).toBe(RULE);
    expect(frame![1]?.startsWith(" Hosted")).toBe(true);
    expect(frame![2]?.startsWith("hosted row")).toBe(true);
    expect(frame![RECT.height - 2]).toBe(RULE);
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
