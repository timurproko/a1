import type { PaneInputResult, PaneMouseEvent, PaneRect } from "../ui-components/index.js";

export interface AppSize {
  readonly width: number;
  readonly height: number;
}

/**
 * What a host offers a presented app. An app reaches the terminal, the pinned
 * shell, or another app only through these — never around them.
 */
export interface AppHostServices {
  getSize(): AppSize;
  requestRender(): void;
  close(): void;
  /** Restores the surface that opened this app without closing the host. */
  returnToPrevious(): void;
  /**
   * Whether an idle interrupt closes the presented app. Every host chooses
   * explicitly: a standalone screen closes, a persistent host stays open.
   */
  readonly closeOnInterrupt: boolean;
}

export interface UiApp {
  readonly id: string;
  render(rect: PaneRect, host: AppHostServices): readonly string[];
  onInput?(data: string, host: AppHostServices): PaneInputResult;
  onMouse?(event: PaneMouseEvent, host: AppHostServices): PaneInputResult;
  onActivate?(host: AppHostServices): void;
  onClose?(host: AppHostServices): void;
}

export interface AppRegistration {
  readonly id: string;
  /** Route that opens the app, without its leading slash. */
  readonly route: string;
  create(): UiApp;
}

const ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;

export function assertAppRegistration(registration: AppRegistration): void {
  if (!ID_PATTERN.test(registration.id)) {
    throw new Error(`owned UI app id is not a bounded slug: ${registration.id}`);
  }
  if (!ID_PATTERN.test(registration.route)) {
    throw new Error(`owned UI app ${registration.id} has an invalid route: ${registration.route}`);
  }
  if (typeof registration.create !== "function") {
    throw new TypeError(`owned UI app ${registration.id} has no create()`);
  }
}
