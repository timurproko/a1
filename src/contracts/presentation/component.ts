export interface PresentationComponentPort {
  render(width: number): readonly string[];
  invalidate(): void;
  handleInput?(data: string): void;
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
