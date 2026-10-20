import { describe, expect, it, vi } from "vitest";
import { PinnedLayout, type DockLayout, type ShellLayoutPorts } from "../../../src/app/session-shell/shell-layout.js";
import { ViewportLayout } from "../../../src/app/session-shell/viewport-layout.js";

function harness(overrides: { candidate?: boolean; copyAcknowledgement?: string } = {}) {
  const documentRows = Object.freeze(["doc"]);
  const promptAnchors = Object.freeze([]);
  const editor = { getText: () => "", render: () => [] };
  let candidate = overrides.candidate ?? false;
  const frame = (rows: readonly string[]) => ({ rows, descriptor: { selectionRevision: 0 }, scrollTop: 0, hits: { viewportHeight: 10 } });
  const viewport = {
    config: { scrollbarAppearance: "auto" },
    presentationRevision: 1,
    selectionRevision: 0,
    pointerPosition: undefined,
    transcriptPointerSelecting: false,
    setEditorPointerFrame: vi.fn(),
    setInputSurfaceFrame: vi.fn(),
    compose: vi.fn((input: { documentRows: readonly string[]; dockRows: readonly string[] }) => frame([...input.documentRows, ...input.dockRows])),
    composeDockOnly: vi.fn((dockRows: readonly string[]) => frame(["reused", ...dockRows])),
  };
  const input = {
    surface: editor,
    usesEditor: true,
    get dockInputCandidate() { return candidate; },
    takeDockInputCandidate: () => { const value = candidate; candidate = false; return value; },
  };
  const dock: DockLayout = { rows: ["dock"], inputOffset: 0, editorOffset: 0, inputRows: 1, footerRows: 0, copyableMessageRows: [] };
  const onFrame = vi.fn();
  const ports = {
    viewport,
    input,
    editor,
    promptChips: { atomicRanges: () => [] },
    dockChrome: {
      renderCopyAcknowledgement: () => overrides.copyAcknowledgement,
      renderReleaseBanner: () => undefined,
      locateReleaseClose: vi.fn(),
    },
    theme: {},
    onFrame,
    rows: () => 10,
    dock: vi.fn(() => dock),
    document: vi.fn((width: number) => ({ rows: documentRows, promptAnchors, liveTailStartRow: undefined, width })),
    queued: () => [],
    liveStatus: () => ["working"],
    diagnostics: () => [],
  } as unknown as ShellLayoutPorts;
  return { ports, viewport, onFrame, setCandidate: (value: boolean) => { candidate = value; } };
}

describe("shell layouts", () => {
  it("renders the pinned document above the dock and clears the editor pointer frame", () => {
    const { ports, viewport } = harness();
    const layout = new PinnedLayout(ports);
    expect(layout.render(20)).toEqual(["doc", "dock"]);
    expect(viewport.setEditorPointerFrame).toHaveBeenCalledWith(undefined);
    expect(layout.composed()).toBeUndefined();
    expect(layout.compositions()).toEqual({ full: 0, dockOnly: 0 });
  });

  it("composes the custom viewport with the document one column narrower and the status in the tail", () => {
    const { ports, viewport, onFrame } = harness();
    const layout = new ViewportLayout(ports);
    expect(layout.render(20)).toEqual(["doc", "working", "dock"]);
    expect(ports.document).toHaveBeenCalledWith(19);
    expect(viewport.setEditorPointerFrame).toHaveBeenCalledWith({ rowStart: 10, rowEnd: 10 });
    expect(onFrame).toHaveBeenCalledOnce();
    expect(layout.composed()).toMatchObject({ viewportRevision: 1 });
  });

  it("reuses the last frame for a safe keystroke only while nothing else changed", () => {
    const { ports, viewport, setCandidate } = harness();
    const layout = new ViewportLayout(ports);
    layout.render(20);
    setCandidate(true);
    expect(layout.render(20)).toEqual(["reused", "dock"]);
    setCandidate(true);
    layout.invalidate();
    layout.render(20);
    setCandidate(true);
    viewport.presentationRevision = 2;
    layout.render(20);
    expect(layout.compositions()).toEqual({ full: 3, dockOnly: 1 });
  });

  it("never reuses a frame under a copy acknowledgement", () => {
    const { ports, setCandidate } = harness({ copyAcknowledgement: "copied" });
    const layout = new ViewportLayout(ports);
    layout.render(20);
    setCandidate(true);
    layout.render(20);
    expect(layout.compositions()).toEqual({ full: 2, dockOnly: 0 });
  });
});
