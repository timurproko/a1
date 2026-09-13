import { TuiAltScreen, isFocusable, type Component, type OverlayHandle, type OverlayOptions } from "#pi-tui";
import type { PresentationComponentPort, PresentationPointerSurface } from "../../../contracts/presentation/index.js";
import type { PiTuiOverlayOptions } from "./contracts.js";

/** Observes public component renders in compositor order, without accessing renderer state. */
export class OverlayGeometryTracker {
  #frame: readonly PresentationPointerSurface[] | null = [];
  #pending: PresentationPointerSurface[] | undefined;
  #columns = 0;
  #rows = 0;

  readonly ports = new WeakMap<Component, PresentationComponentPort>();

  constructor(readonly publish: (surfaces: readonly PresentationPointerSurface[] | null) => void) {}

  invalidate(): void {
    if (this.#frame === null) return;
    this.#frame = null;
    this.publish(null);
  }

  begin(columns: number, rows: number): void {
    this.#columns = columns;
    this.#rows = rows;
    this.#pending = [];
  }

  record(component: PresentationComponentPort, options: PiTuiOverlayOptions | undefined, width: number, height: number): void {
    if (this.#pending === undefined) return;
    const region = overlayPointerSurface(component, options, width, height, this.#columns, this.#rows);
    if (region !== undefined) this.#pending.push(region);
  }

  end(): void {
    const next = this.#pending ?? [];
    this.#pending = undefined;
    if (this.#frame !== null && samePointerSurfaces(this.#frame, next)) return;
    this.#frame = next;
    this.publish(next);
  }
}

/** The protected composition hook brackets the actual visible, focus-ordered overlay renders. */
export class GeometryObservedAltScreen extends TuiAltScreen {
  geometry: OverlayGeometryTracker | undefined;
  readonly #overlayComponents = new WeakMap<Component, Component>();

  get overlayFocused(): boolean {
    return this.isOverlayFocused();
  }

  override setFocus(component: Component | null): void {
    super.setFocus(component === null ? null : this.#overlayComponents.get(component) ?? component);
  }

  override showOverlay(component: Component, options?: OverlayOptions): OverlayHandle {
    // Compatibility: all overlay entries cross the public method, including the runtime's search
    // dialog. Observe a wrapper, never replace a method on an installed component.
    const geometry = this.geometry;
    const port = geometry?.ports.get(component) ?? component;
    const wrapper: Component & { focused: boolean } = {
      get focused() { return isFocusable(component) && component.focused; },
      set focused(value) { if (isFocusable(component)) component.focused = value; },
      get wantsKeyRelease() { return component.wantsKeyRelease ?? false; },
      render(width) {
        const lines = component.render(width);
        geometry?.record(port, options, width, lines.length);
        return lines;
      },
      invalidate: () => component.invalidate(),
      handleInput: data => component.handleInput?.(data),
    };
    this.#overlayComponents.set(component, wrapper);
    geometry?.invalidate();
    const handle = super.showOverlay(wrapper, options);
    return {
      hide: () => { geometry?.invalidate(); handle.hide(); this.#overlayComponents.delete(component); },
      setHidden: hidden => {
        if (hidden !== handle.isHidden()) geometry?.invalidate();
        handle.setHidden(hidden);
      },
      isHidden: () => handle.isHidden(),
      focus: () => { geometry?.invalidate(); handle.focus(); },
      unfocus: target => {
        geometry?.invalidate();
        if (target === undefined) handle.unfocus();
        else handle.unfocus({ target: target.target === null ? null : this.#overlayComponents.get(target.target) ?? target.target });
      },
      isFocused: () => handle.isFocused(),
    };
  }

  override hideOverlay(): void {
    this.geometry?.invalidate();
    super.hideOverlay();
  }

  protected override compositeOverlays(lines: string[], width: number, height: number): string[] {
    this.geometry?.begin(width, height);
    const result = super.compositeOverlays(lines, width, height);
    this.geometry?.end();
    return result;
  }
}

/** Compare only geometry and ownership, never animation content or transcript position. */
export function samePointerSurfaces(a: readonly PresentationPointerSurface[], b: readonly PresentationPointerSurface[]): boolean {
  return a.length === b.length && a.every((surface, index) => {
    const other = b[index]!;
    return surface.component === other.component && surface.columnStart === other.columnStart
      && surface.columnEnd === other.columnEnd && surface.rowStart === other.rowStart && surface.rowEnd === other.rowEnd;
  });
}

/**
 * Resolve the pinned public overlay options against the actual render width/height.
 * The runtime still owns layout and painting. Independent terminal-cell tests certify
 * this option-to-hit-region projection against its compositor, including clipping.
 */
export function overlayPointerSurface(
  component: PresentationComponentPort,
  options: PiTuiOverlayOptions | undefined,
  width: number,
  renderedHeight: number,
  columns: number,
  rows: number,
): PresentationPointerSurface | undefined {
  const opt = options ?? {};
  const margin = typeof opt.margin === "number"
    ? { top: opt.margin, right: opt.margin, bottom: opt.margin, left: opt.margin }
    : opt.margin ?? {};
  const top = Math.max(0, margin.top ?? 0);
  const right = Math.max(0, margin.right ?? 0);
  const bottom = Math.max(0, margin.bottom ?? 0);
  const left = Math.max(0, margin.left ?? 0);
  const availableHeight = Math.max(1, rows - top - bottom);
  const availableWidth = Math.max(1, columns - left - right);
  const limit = size(opt.maxHeight, rows);
  const height = limit === undefined ? renderedHeight : Math.min(renderedHeight, Math.floor(Math.max(1, Math.min(limit, availableHeight))));
  const anchor = opt.anchor ?? "center";
  const anchorRow = anchor.startsWith("top-") ? top
    : anchor.startsWith("bottom-") ? top + availableHeight - height
    : top + Math.floor((availableHeight - height) / 2);
  const anchorColumn = anchor.endsWith("-left") || anchor === "left-center" ? left
    : anchor.endsWith("-right") || anchor === "right-center" ? left + availableWidth - width
    : left + Math.floor((availableWidth - width) / 2);
  const row = Math.max(top, Math.min(
    position(opt.row, top, availableHeight, height, anchorRow) + (opt.offsetY ?? 0), rows - bottom - height,
  ));
  const column = Math.max(left, Math.min(
    position(opt.col, left, availableWidth, width, anchorColumn) + (opt.offsetX ?? 0), columns - right - width,
  ));
  if (height <= 0 || row >= rows || column >= columns) return undefined;
  return {
    component,
    rowStart: row + 1,
    rowEnd: Math.min(rows, row + height),
    columnStart: column + 1,
    columnEnd: Math.min(columns, column + width),
  };
}

function size(value: number | string | undefined, extent: number): number | undefined {
  if (typeof value !== "string") return value;
  const match = /^(\d+(?:\.\d+)?)%$/.exec(value);
  return match === null ? undefined : Math.floor(extent * Number(match[1]) / 100);
}

function position(value: number | string | undefined, margin: number, available: number, extent: number, anchor: number): number {
  if (value === undefined) return anchor;
  if (typeof value === "number") return value;
  const percent = size(value, Math.max(0, available - extent));
  return percent === undefined ? margin + Math.floor((available - extent) / 2) : margin + percent;
}
