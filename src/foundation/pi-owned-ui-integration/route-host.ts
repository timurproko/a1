/**
 * The seam between the pinned shell and A1-owned screens. The shell asks whether
 * a route is claimed, mounts whatever surface it is handed, and forwards keys to
 * it — it never learns what an app is, and the app layer never reaches into the
 * shell.
 */

export interface UiRouteSurface {
  readonly id: string;
  /** Renders exactly `height` rows of at most `width` columns. */
  render(width: number, height: number): readonly string[];
  /** True when the key was consumed; false leaves it to the shell. */
  handleInput(data: string): boolean;
  /** True once the surface has asked to be dismissed. */
  isClosed(): boolean;
  close(): void;
  /** Called by the shell when the surface should repaint. */
  onRenderRequested(listener: () => void): void;
}

export interface UiRouteHost {
  /** True when a declared A1-owned surface claims this route. */
  claims(route: string): boolean;
  /** Opens the route's surface, or null when it could not be presented. */
  open(route: string): UiRouteSurface | null;
}
