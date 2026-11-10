export interface PresentationComponentPort {
  render(width: number): readonly string[];
  invalidate(): void;
  handleInput?(data: string): void;
  /** Optional pointer input in one-based component-local coordinates. */
  handleLocalMouse?(event: { readonly kind: "press" | "release" | "motion" | "wheel-up" | "wheel-down"; readonly button: number; readonly column: number; readonly row: number }): void;
  setFocused?(focused: boolean): void;
  dispose?(): void;
}

/** A painted input surface in terminal coordinates (one-based, inclusive bounds). */
export interface PresentationPointerSurface {
  readonly component: PresentationComponentPort;
  readonly columnStart: number;
  readonly columnEnd: number;
  readonly rowStart: number;
  readonly rowEnd: number;
}

/** Compares only geometry and ownership, never animation content or transcript position. */
export function samePointerSurfaces(a: readonly PresentationPointerSurface[], b: readonly PresentationPointerSurface[]): boolean {
  return a.length === b.length && a.every((surface, index) => {
    const other = b[index]!;
    return surface.component === other.component && surface.columnStart === other.columnStart
      && surface.columnEnd === other.columnEnd && surface.rowStart === other.rowStart && surface.rowEnd === other.rowEnd;
  });
}
