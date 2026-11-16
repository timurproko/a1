import type { OwnedUiShellViewComponentPort } from "../../contracts/owned-ui/index.js";
import type { TerminalRuntimePort } from "../../contracts/presentation/index.js";
import { routeMouseInput, type RoutedMouseInput } from "../../ui/components/index.js";
import { withinTailControl, type TailControlRegion } from "./viewport-pointer.js";

export interface FooterNameTargetPort {
  region(): TailControlRegion | undefined;
  setPointer(pointer: { readonly column: number; readonly row: number } | undefined): void;
  render(footer: OwnedUiShellViewComponentPort, width: number, height: number, enabled: boolean): readonly string[];
}

class FooterNameTarget {
  #region: TailControlRegion | undefined;
  #pointer: { readonly column: number; readonly row: number } | undefined;
  #hovered = false;

  region(): TailControlRegion | undefined { return this.#region; }
  setPointer(pointer: { readonly column: number; readonly row: number } | undefined): void { this.#pointer = pointer; }

  render(footer: OwnedUiShellViewComponentPort, width: number, height: number, enabled: boolean): readonly string[] {
    this.#region = undefined;
    if (!enabled) {
      this.#hovered = false;
      footer.setNameHovered?.(false);
      return [];
    }
    let rows = footer.render(width);
    const span = footer.footerNameSpan?.();
    if (span !== undefined && span.width > 0) {
      const row = height - rows.length + span.row + 1;
      if (row > 0) this.#region = {
        rowStart: row, rowEnd: row, columnStart: span.column + 2, columnEnd: span.column + span.width + 1,
      };
    }
    const hovered = this.#region !== undefined && this.#pointer !== undefined
      && withinTailControl(this.#region, this.#pointer.column, this.#pointer.row);
    if (hovered !== this.#hovered) {
      this.#hovered = hovered;
      footer.setNameHovered?.(hovered);
      rows = footer.render(width);
    }
    return rows;
  }
}

interface FooterNamePorts {
  readonly root: { readonly chrome: { footerName: FooterNameTargetPort | undefined }; usesDefaultInputSurface(): boolean };
  readonly terminal: Pick<TerminalRuntimePort, "hasOverlay" | "requestRender">;
  readonly edit: () => void;
}

/** Routes footer-name hover and direct editing without submitting or altering the prompt draft. */
export class FooterNameInteraction {
  readonly #ports: FooterNamePorts;
  #draining = false;

  constructor(ports: FooterNamePorts) { this.#ports = ports; ports.root.chrome.footerName = new FooterNameTarget(); }

  handleInput(data: string): RoutedMouseInput {
    // Protocol: paste payloads are field text, never pointer actions.
    if (data.startsWith("\x1b[200~")) return { data, consumed: false };
    return routeMouseInput(data, event => {
      if (this.#draining) {
        if (event.kind === "release") this.#draining = false;
        return true;
      }
      const { root, terminal } = this.#ports;
      const eligible = root.usesDefaultInputSurface() && !terminal.hasOverlay();
      root.chrome.footerName?.setPointer(eligible ? event : undefined);
      terminal.requestRender();
      const region = eligible ? root.chrome.footerName?.region() : undefined;
      if (region === undefined || !withinTailControl(region, event.column, event.row)
        || event.kind !== "press" || event.button !== 0) return false;
      this.#draining = true;
      root.chrome.footerName?.setPointer(undefined);
      this.#ports.edit();
      return true;
    });
  }

  onSessionReplaced(): void { this.#draining = false; this.#ports.root.chrome.footerName?.setPointer(undefined); }
  dispose(): void { this.onSessionReplaced(); }
}
