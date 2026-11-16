import type { OwnedUiShellComponentPort, OwnedUiShellComponents, OwnedUiShellViewComponentPort } from "../../contracts/owned-ui/index.js";
import type { TerminalOverlayHandle, TerminalRuntimePort } from "../../contracts/presentation/index.js";
import { routeMouseInput, type RoutedMouseInput } from "../../ui/components/index.js";
import { withinTailControl, type TailControlRegion } from "./viewport-pointer.js";

/** Painted footer-name geometry and hover, independent of prompt and transcript selection. */
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

interface FooterNameMenuPorts {
  readonly root: { readonly chrome: { footerName: FooterNameTargetPort | undefined }; usesDefaultInputSurface(): boolean };
  readonly terminal: Pick<TerminalRuntimePort, "showOverlay" | "hasOverlay" | "requestRender"> & { viewport(): { readonly rows: number }; readonly renderNow?: () => void };
  readonly create: OwnedUiShellComponents["dialogs"]["sessionNameMenu"];
  readonly edit: () => void;
}

/** Footer-only hover and context routing, independent of prompt submission and draft ownership. */
export class FooterNameMenu {
  readonly #ports: FooterNameMenuPorts;
  #menu: { readonly surface: OwnedUiShellComponentPort; readonly handle: TerminalOverlayHandle } | undefined;
  #drainButton: number | undefined;

  constructor(ports: FooterNameMenuPorts) { this.#ports = ports; ports.root.chrome.footerName = new FooterNameTarget(); }

  handleInput(data: string): RoutedMouseInput {
    // A paste is field input, never a source of pointer actions.
    if (data.startsWith("\x1b[200~")) return { data, consumed: false };
    return routeMouseInput(data, event => {
      if (this.#drainButton !== undefined) {
        if (event.kind === "release") this.#drainButton = undefined;
        return true;
      }
      const menu = this.#menu;
      if (menu !== undefined) {
        const bounds = menu.handle.getBounds();
        const inside = bounds !== undefined && event.column >= bounds.col + 1 && event.column <= bounds.col + bounds.width
          && event.row >= bounds.row + 1 && event.row <= bounds.row + bounds.height;
        if (!inside && event.kind === "press") {
          this.#drainButton = event.button;
          this.close();
        } else if (bounds !== undefined) {
          if (inside && event.kind === "press" && event.button === 0) this.#drainButton = 0;
          menu.surface.handleLocalMouse?.({ ...event, column: event.column - bounds.col, row: event.row - bounds.row });
        }
        return true;
      }
      const { root, terminal } = this.#ports;
      const eligible = root.usesDefaultInputSurface() && !terminal.hasOverlay();
      root.chrome.footerName?.setPointer(eligible ? event : undefined);
      terminal.requestRender();
      const region = eligible ? root.chrome.footerName?.region() : undefined;
      if (region === undefined || !withinTailControl(region, event.column, event.row)
        || event.kind !== "press" || event.button !== 2) return false;
      root.chrome.footerName?.setPointer(undefined);
      const surface = this.#ports.create(() => { this.close(); this.#ports.edit(); }, () => this.close(), () => terminal.requestRender());
      const viewport = terminal.viewport();
      const handle = terminal.showOverlay(surface, {
        width: 6, row: "100%", offsetY: region.rowStart - viewport.rows - 1,
        col: region.columnStart - 1, inputCoordination: "owned",
      });
      this.#menu = { surface, handle };
      return true;
    });
  }

  close(): void {
    const menu = this.#menu;
    this.#menu = undefined;
    menu?.handle.hide();
    this.#ports.root.chrome.footerName?.setPointer(undefined);
    this.#ports.terminal.requestRender();
  }

  onSessionReplaced(): void { this.close(); this.#drainButton = undefined; }
  dispose(): void { this.close(); this.#drainButton = undefined; }
}
