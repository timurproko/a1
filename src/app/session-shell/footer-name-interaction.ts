import type { OwnedUiShellViewComponentPort, OwnedUiShellFooterControl } from "../../contracts/owned-ui/index.js";
import type { TerminalRuntimePort } from "../../contracts/presentation/index.js";
import { routeMouseInput, type RoutedMouseInput } from "../../ui/components/index.js";
import { withinTailControl, type TailControlRegion } from "./viewport-pointer.js";

export interface FooterNameTargetPort {
  region(control?: OwnedUiShellFooterControl): TailControlRegion | undefined;
  setPointer(pointer: { readonly column: number; readonly row: number } | undefined): void;
  render(footer: OwnedUiShellViewComponentPort, width: number, height: number, enabled: boolean): readonly string[];
}

class FooterNameTarget {
  #regions: Array<TailControlRegion & { readonly command: OwnedUiShellFooterControl }> = [];
  #pointer: { readonly column: number; readonly row: number } | undefined;
  #hovered: OwnedUiShellFooterControl | undefined;

  region(control: OwnedUiShellFooterControl = "name"): TailControlRegion | undefined { return this.#regions.find(region => region.command === control); }
  setPointer(pointer: { readonly column: number; readonly row: number } | undefined): void { this.#pointer = pointer; }

  render(footer: OwnedUiShellViewComponentPort, width: number, height: number, enabled: boolean): readonly string[] {
    this.#regions = [];
    if (!enabled) {
      this.#hovered = undefined;
      footer.setFooterHovered?.(undefined);
      return [];
    }
    let rows = footer.render(width);
    for (const span of footer.footerControlSpans?.() ?? []) {
      const row = height - rows.length + span.row + 1;
      if (row > 0 && span.width > 0) this.#regions.push({ command: span.command,
        rowStart: row, rowEnd: row, columnStart: span.column + 2, columnEnd: span.column + span.width + 1,
      });
    }
    const pointer = this.#pointer;
    const hovered = pointer === undefined ? undefined
      : this.#regions.find(region => withinTailControl(region, pointer.column, pointer.row))?.command;
    if (hovered !== this.#hovered) {
      this.#hovered = hovered;
      footer.setFooterHovered?.(hovered);
      rows = footer.render(width);
    }
    return rows;
  }
}

interface FooterNamePorts {
  readonly root: { readonly chrome: { footerName: FooterNameTargetPort | undefined }; usesDefaultInputSurface(): boolean; handleInput(data: string): void };
  readonly terminal: Pick<TerminalRuntimePort, "hasOverlay" | "requestRender">;
  readonly edit: (control: OwnedUiShellFooterControl) => void;
}

/** Routes footer control hover and direct editing without submitting or altering the prompt draft. */
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
      const eligible = !terminal.hasOverlay();
      root.chrome.footerName?.setPointer(eligible ? event : undefined);
      terminal.requestRender();
      const command = eligible ? (["name", "models", "thinking"] as const).find(control => {
        const region = root.chrome.footerName?.region(control);
        return region !== undefined && withinTailControl(region, event.column, event.row);
      }) : undefined;
      if (command === undefined || event.kind !== "press" || event.button !== 0) return false;
      this.#draining = true;
      if (root.usesDefaultInputSurface()) this.#ports.edit(command);
      else root.handleInput("\x1b");
      return true;
    });
  }

  onSessionReplaced(): void { this.#draining = false; this.#ports.root.chrome.footerName?.setPointer(undefined); }
  dispose(): void { this.onSessionReplaced(); }
}
