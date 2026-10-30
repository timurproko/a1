import { heldNativeHyperlinkStyle } from "../../ui/components/spans.js";
import type {
  TranscriptPromptAnchor,
  TranscriptViewportFrameInput,
} from "../../ui/components/transcript-viewport.js";
import type { PiShellComponentPort } from "../../integrations/pi/components/shell-shared-facade.js";
import type { DockLayout, ShellLayout, ShellLayoutPorts } from "./shell-layout.js";

interface VisibleViewportSnapshot {
  readonly width: number;
  readonly height: number;
  readonly documentRows: readonly string[];
  readonly transientSignature: string;
  readonly promptAnchors: readonly TranscriptPromptAnchor[];
  readonly dockLength: number;
  readonly inputSurface: PiShellComponentPort;
  readonly viewportRevision: number;
  readonly selectionRevision: number;
  readonly pointerPosition: TranscriptViewportFrameInput["pointerPosition"];
}

/**
 * Bare A1's custom viewport: a bounded transcript viewport above the dock, composed by the session
 * viewport controller. It owns the snapshot that lets a safe keystroke repaint only the dock.
 */
export class ViewportLayout implements ShellLayout {
  readonly #ports: ShellLayoutPorts;
  #snapshot: VisibleViewportSnapshot | undefined;
  #fullCompositions = 0;
  #dockOnlyCompositions = 0;

  constructor(ports: ShellLayoutPorts) {
    this.#ports = ports;
  }

  invalidate(): void {
    this.#snapshot = undefined;
  }

  composed(): VisibleViewportSnapshot | undefined {
    return this.#snapshot;
  }

  compositions(): { readonly full: number; readonly dockOnly: number } {
    return { full: this.#fullCompositions, dockOnly: this.#dockOnlyCompositions };
  }

  render(width: number): readonly string[] {
    const { viewport, input, dockChrome } = this.#ports;
    const height = Math.max(0, this.#ports.rows());
    const dock = this.#ports.dock(width);
    const diagnostics = this.#ports.diagnostics();
    const promptOverlay = dockChrome.renderPromptOverlay(diagnostics, width);
    // Invariant: auto/always own one stable final-column gutter. Every scrollable
    // surface ends before it; the dock remains full-width and hidden mode returns it.
    const documentWidth = viewport.config.scrollbarAppearance === "hidden"
      ? width
      : Math.max(1, width - 1);
    const document = this.#ports.document(documentWidth);
    const steeringRows = this.#ports.queued(documentWidth);
    const releaseBanner = dockChrome.renderReleaseBanner(diagnostics, documentWidth);
    // Rationale: the release notice rides the bottom-aligned tail directly above Working, so it
    // never displaces transcript content and scrolls away with the live status.
    // Invariant: when idle the banner's last row sits on the line Working would occupy.
    const statusRows = [...releaseBanner?.rows ?? [], ...this.#ports.liveStatus(documentWidth)];
    const transientSignature = transientRowsSignature(steeringRows, statusRows);
    const snapshot = this.#snapshot;
    // Invariant: paint-only feedback may cover either viewport or dock cells, so
    // ordinary dock-only reuse cannot safely omit its overlay composition.
    const dockInputCandidate = input.dockInputCandidate && promptOverlay === undefined;
    // Concurrency: input may change after a keyboard receipt but before its paint.
    // Capture only the live inputs this composition will actually represent.
    const inputSurface = input.surface;
    const dockRows = dock.rows;
    const dockStartRow = height - dockRows.length + 1;
    const copyableDockRows = this.#copyableDockRows(dock);
    this.#placeInputFrames(dock, width, height, dockStartRow);
    const viewportRevision = viewport.presentationRevision;
    const selectionRevision = viewport.selectionRevision;
    const pointerPosition = viewport.pointerPosition;
    input.takeDockInputCandidate();
    let frame = dockInputCandidate
      && snapshot !== undefined
      && snapshot.width === width
      && snapshot.height === height
      && snapshot.documentRows === document.rows
      && snapshot.transientSignature === transientSignature
      && snapshot.promptAnchors === document.promptAnchors
      && snapshot.dockLength === dockRows.length
      && snapshot.inputSurface === inputSurface
      && snapshot.viewportRevision === viewportRevision
      && snapshot.selectionRevision === selectionRevision
      ? viewport.composeDockOnly(dockRows, width, height, copyableDockRows)
      : null;
    if (frame === null) {
      frame = viewport.compose({
        // Performance: do not copy the complete document on unchanged dock-only input.
        // Steering and Working retain their one non-persistent viewport-tail ownership.
        documentRows: [...document.rows, ...steeringRows, ...statusRows],
        ...(viewport.transcriptPointerSelecting
          ? { paintDocumentRow: heldNativeHyperlinkStyle }
          : {}),
        // Invariant: this boundary tracks persistent transcript rows for streaming and
        // geometry; transient Steering and Working rows remain complete-frame selectable.
        selectableDocumentRowCount: document.rows.length,
        ...(document.liveTailStartRow === undefined ? {} : { liveTailStartRow: document.liveTailStartRow }),
        bottomAlignedTailRowCount: steeringRows.length + statusRows.length,
        dockRows,
        copyableDockRows,
        promptAnchors: document.promptAnchors,
        width,
        height,
        // Invariant: the control belongs immediately above the complete dock and
        // floats over transient viewport content rather than consuming a dock row.
        bottomControlRow: Math.max(0, height - Math.min(height, dockRows.length) - 1),
        ...(promptOverlay === undefined || height <= 0 ? {} : {
          frameOverlay: {
            row: Math.max(1, Math.min(height, dockStartRow + dock.inputOffset - 1)),
            text: promptOverlay,
          },
        }),
        theme: this.#ports.theme,
      });
      this.#fullCompositions += 1;
    } else this.#dockOnlyCompositions += 1;
    dockChrome.locateReleaseClose(frame, releaseBanner, document.rows.length + steeringRows.length + statusRows.length, statusRows.length);
    this.#snapshot = {
      width,
      height,
      documentRows: document.rows,
      transientSignature,
      promptAnchors: document.promptAnchors,
      dockLength: dockRows.length,
      inputSurface,
      // Invariant: a callback during composition cannot bless older rows with its
      // newer revision. Its ordinary pending render will publish the newer state.
      viewportRevision,
      selectionRevision: frame.descriptor.selectionRevision,
      pointerPosition,
    };
    this.#ports.onFrame?.(frame);
    return frame.rows;
  }

  #copyableDockRows(dock: DockLayout): NonNullable<TranscriptViewportFrameInput["copyableDockRows"]> {
    // Rationale: rendered chip tags are lossy presentation (truncated labels), so a frame drag over
    // a draft holding chips stays visual-only; editor-owned word/line selection still copies the
    // expanded chip text through its semantic route.
    const draft = this.#ports.input.usesEditor ? this.#ports.editor.getText() : "";
    const promptCopyRows = draft.length > 0
      && !draft.split("\n").some(line => this.#ports.promptChips.atomicRanges(line).length > 0)
      ? Math.max(0, dock.inputRows - 2)
      : 0;
    return [
      ...dock.copyableMessageRows,
      ...Array.from({ length: promptCopyRows }, (_value, index) => ({
        row: dock.editorOffset + index + 1,
        prompt: index === 0 ? "first" as const : "continuation" as const,
      })),
      ...Array.from({ length: dock.footerRows }, (_value, index) => ({
        row: dock.rows.length - dock.footerRows + index,
      })),
    ];
  }

  // Invariant: pointer routing needs the replacement surface's frame, or the editor's rows when it is active.
  #placeInputFrames(dock: DockLayout, width: number, height: number, dockStartRow: number): void {
    const { viewport, input } = this.#ports;
    viewport.setInputSurfaceFrame(input.usesEditor ? undefined : {
      component: input.surface,
      columnStart: 1,
      columnEnd: width,
      rowStart: Math.max(1, dockStartRow + dock.editorOffset),
      rowEnd: Math.min(height, dockStartRow + dock.editorOffset + dock.inputRows - 1),
    });
    viewport.setEditorPointerFrame(input.usesEditor
      ? {
          rowStart: dockStartRow + dock.editorOffset,
          rowEnd: dockStartRow + dock.editorOffset + dock.inputRows - 1,
        }
      : undefined);
  }
}

function transientRowsSignature(
  steeringRows: readonly string[],
  statusRows: readonly string[],
): string {
  return `${steeringRows.length}\u0000${steeringRows.join("\u0000")}\u0001${statusRows.length}\u0000${statusRows.join("\u0000")}`;
}
