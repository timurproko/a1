import type { PiShellComponentPort, PiShellEditorPort } from "../../integrations/pi/components/shell-shared-facade.js";
import { classifyPiTuiInput, type PiTuiInputSurfaceKind } from "../../integrations/pi/tui-runtime/input-presentation-coordinator.js";
import type { SessionViewportController } from "./session-viewport-controller.js";

export interface InputSurfaceSwitchPorts {
  /** Whether keystrokes that cannot change the transcript may repaint the dock alone. */
  readonly dockInputReuse: boolean;
  readonly viewport: Pick<SessionViewportController, "invalidateInputSurface" | "presentationRevision">;
  /** The surface changed; listeners outside the root react. */
  readonly onChanged?: () => void;
}

/**
 * Which component receives the dock's input: the prompt editor, or a selector, dialog, or prompt
 * that temporarily replaces it. It also records whether the latest keystroke is safe for a
 * dock-only repaint; that receipt-time evidence never authorizes reuse by itself.
 */
export class InputSurfaceSwitch {
  readonly #editor: PiShellEditorPort;
  readonly #ports: InputSurfaceSwitchPorts;
  #surface: PiShellComponentPort;
  #coordination: PiTuiInputSurfaceKind = "editor";
  #dockInputCandidate = false;
  // Invariant: receipt-time eligibility is evidence, never authorization for composition-time reuse.
  #dockInputRevision: number | undefined;

  constructor(editor: PiShellEditorPort, ports: InputSurfaceSwitchPorts) {
    this.#editor = editor;
    this.#ports = ports;
    this.#surface = editor;
  }

  get surface(): PiShellComponentPort {
    return this.#surface;
  }

  get coordination(): PiTuiInputSurfaceKind {
    return this.#coordination;
  }

  get usesEditor(): boolean {
    return this.#surface === this.#editor;
  }

  get dockInputCandidate(): boolean {
    return this.#dockInputCandidate;
  }

  get dockInputRevision(): number | undefined {
    return this.#dockInputRevision;
  }

  /**
   * Shows `component` in the dock, or the editor for null. Returns false when the surface is
   * unchanged, in which case only its coordination kind is updated.
   */
  set(component: PiShellComponentPort | null, disposePrevious: boolean, coordination: Exclude<PiTuiInputSurfaceKind, "editor">): boolean {
    const next = component ?? this.#editor;
    const nextCoordination = next === this.#editor ? "editor" : coordination;
    if (next === this.#surface) {
      this.#coordination = nextCoordination;
      return false;
    }
    this.#dockInputCandidate = false;
    this.#ports.viewport.invalidateInputSurface();
    this.#surface.setFocused?.(false);
    if (disposePrevious && this.#surface !== this.#editor) this.#surface.dispose?.();
    this.#surface = next;
    this.#coordination = nextCoordination;
    this.#ports.onChanged?.();
    this.#surface.setFocused?.(true);
    return true;
  }

  handleInput(data: string): void {
    this.#dockInputCandidate = this.#ports.dockInputReuse && classifyPiTuiInput(data, this.#coordination) === "safe";
    this.#dockInputRevision = this.#dockInputCandidate ? this.#ports.viewport.presentationRevision : undefined;
    try {
      this.#surface.handleInput?.(data);
    } catch (error) {
      this.#dockInputCandidate = false;
      throw error;
    }
  }

  /** Reads and clears the dock-only candidate for one composition. */
  takeDockInputCandidate(): boolean {
    const candidate = this.#dockInputCandidate;
    this.#dockInputCandidate = false;
    return candidate;
  }

  /** Something outside the dock changed, so the latest keystroke no longer qualifies for reuse. */
  clearDockInputCandidate(): void {
    this.#dockInputCandidate = false;
    this.#dockInputRevision = undefined;
  }

  /** Disposes a replacement surface; the editor is disposed by its owner. */
  dispose(): void {
    this.clearDockInputCandidate();
    if (this.#surface !== this.#editor) this.#surface.dispose?.();
  }
}
