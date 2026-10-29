import type { OwnedUiSessionViewModel } from "../../contracts/owned-ui/index.js";
import type {
  TranscriptViewportFrame,
  TranscriptViewportFrameInput,
  TranscriptViewportTheme,
} from "../../ui/components/transcript-viewport.js";
import type { PiShellEditorPort } from "../../integrations/pi/components/shell-shared-facade.js";
import type { DockChrome } from "./dock-chrome.js";
import type { InputSurfaceSwitch } from "./input-surface-switch.js";
import type { PromptChipStore } from "./prompt-chips.js";
import type { SessionViewportController } from "./session-viewport-controller.js";
import type { TranscriptDocumentLayout } from "./transcript-document.js";

/** The dock's rows and where its input and footer sit inside them. */
export interface DockLayout {
  readonly rows: readonly string[];
  readonly inputOffset: number;
  readonly editorOffset: number;
  readonly inputRows: number;
  readonly footerRows: number;
  /** Exact status, warning, error, command-result, and notice rows; queued and structural rows stay excluded. */
  readonly copyableMessageRows: NonNullable<TranscriptViewportFrameInput["copyableDockRows"]>;
}

/** What a layout reads from the shell root to compose one frame. */
export interface ShellLayoutPorts {
  readonly viewport: SessionViewportController;
  readonly input: InputSurfaceSwitch;
  readonly editor: Pick<PiShellEditorPort, "getText">;
  readonly promptChips: Pick<PromptChipStore, "atomicRanges">;
  readonly dockChrome: Pick<DockChrome, "renderPromptOverlay" | "renderReleaseBanner" | "locateReleaseClose">;
  readonly theme: TranscriptViewportTheme;
  readonly onFrame?: (frame: TranscriptViewportFrame) => void;
  rows(): number;
  dock(width: number): DockLayout;
  document(width: number): TranscriptDocumentLayout;
  queued(width: number): readonly string[];
  liveStatus(width: number): readonly string[];
  diagnostics(): OwnedUiSessionViewModel["diagnostics"];
}

/**
 * How one session's root composes a frame. The root picks one layout at construction and never
 * consults the layout mode again on the render path.
 */
export interface ShellLayout {
  render(width: number): readonly string[];
  /** Visible content changed outside a render, so the next frame may not reuse the last one. */
  invalidate(): void;
  /** What the last composed frame represented, for payload-free evidence; undefined before one exists. */
  composed(): { readonly viewportRevision: number; readonly pointerPosition: TranscriptViewportFrameInput["pointerPosition"] } | undefined;
  compositions(): { readonly full: number; readonly dockOnly: number };
}

/** The pinned comparison profile: the whole document above the dock; the terminal host scrolls it. */
export class PinnedLayout implements ShellLayout {
  readonly #ports: ShellLayoutPorts;

  constructor(ports: ShellLayoutPorts) {
    this.#ports = ports;
  }

  render(width: number): readonly string[] {
    this.#ports.viewport.setEditorPointerFrame(undefined);
    return [...this.#ports.document(width).rows, ...this.#ports.dock(width).rows];
  }

  invalidate(): void {}

  composed(): undefined {
    return undefined;
  }

  compositions(): { readonly full: number; readonly dockOnly: number } {
    return { full: 0, dockOnly: 0 };
  }
}
