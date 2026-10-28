import type { ImageAttachmentError, OwnedUiSessionViewModel } from "../../contracts/owned-ui/index.js";
import { COPY_ACKNOWLEDGEMENT_DURATION_MS } from "../../ui/components/selection-copy.js";
import type { TranscriptViewportFrame } from "../../ui/components/transcript-viewport.js";
import {
  renderPiShellCommandMessage,
  renderPiShellReleaseUpdateBanner,
  renderPiShellStatusText,
  type PiShellReleaseUpdateBanner,
} from "../../integrations/pi/components/shell-presenters-info.js";
import { PINNED_PI_LAYOUT, piTheme } from "../../integrations/pi/components/upstream/theme/theme.js";
import { piShellTruncateToWidth } from "../../integrations/pi/components/shell-shared-facade.js";
import type { SessionViewportController, TailControlRegion } from "./session-viewport-controller.js";
import { parseReleaseUpdateDiagnostic } from "./transcript-document.js";

// Invariant: the notice is dock chrome, never transcript content; the custom viewport alone uses it.
export interface DockNotice {
  readonly kind: "status" | "warning" | "error" | "new-session";
  readonly message: string;
  readonly errorCode?: ImageAttachmentError["code"];
}

export interface DockChromePorts {
  /** Chrome changed; the root invalidates its chrome components. */
  readonly invalidateChrome: () => void;
  readonly requestRender: () => void;
  readonly viewport: Pick<SessionViewportController, "tailControlHovered" | "setTailControl">;
}

/**
 * The transient chrome around bare A1's dock: the one command notice above the editor, the release
 * banner above Working with its close control, and the short copy acknowledgement.
 */
export class DockChrome {
  readonly #ports: DockChromePorts;
  #notice: DockNotice | undefined;
  // Invariant: bare A1 docks the release notice above the live status; closing it lasts for this session only.
  #releaseDismissed = false;
  #releaseCloseTarget: TailControlRegion | undefined;
  #copyAcknowledgement: string | undefined;
  #copyAcknowledgementTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(ports: DockChromePorts) {
    this.#ports = ports;
  }

  get notice(): DockNotice | undefined {
    return this.#notice;
  }

  setNotice(notice: DockNotice): void {
    this.#notice = notice;
    this.#ports.invalidateChrome();
  }

  dismissNotice(): void {
    if (this.#notice === undefined) return;
    this.#notice = undefined;
    this.#ports.invalidateChrome();
  }

  /** Forgets the notice without a chrome invalidation; the caller invalidates as part of a larger change. */
  forgetNotice(): void {
    this.#notice = undefined;
  }

  renderNotice(width: number, outputPad: 0 | 1): readonly string[] {
    const notice = this.#notice;
    if (notice === undefined) return [];
    if (notice.kind === "status") {
      // Compatibility: Pi pads its status text by one cell regardless of the output pad setting.
      return ["", ...renderPiShellStatusText(notice.message, width, PINNED_PI_LAYOUT.outputPad)];
    }
    return renderPiShellCommandMessage({
      kind: notice.kind === "new-session" ? "accent" : notice.kind,
      message: notice.message,
    }, width, outputPad);
  }

  showCopyAcknowledgement(message: string): void {
    this.clearCopyAcknowledgement(false);
    this.#copyAcknowledgement = message;
    const timer = setTimeout(() => {
      if (this.#copyAcknowledgementTimer !== timer) return;
      this.#copyAcknowledgementTimer = undefined;
      this.#copyAcknowledgement = undefined;
      this.#ports.invalidateChrome();
      this.#ports.requestRender();
    }, COPY_ACKNOWLEDGEMENT_DURATION_MS);
    timer.unref?.();
    this.#copyAcknowledgementTimer = timer;
    this.#ports.invalidateChrome();
    this.#ports.requestRender();
  }

  clearCopyAcknowledgement(requestRender: boolean): void {
    if (this.#copyAcknowledgementTimer !== undefined) clearTimeout(this.#copyAcknowledgementTimer);
    this.#copyAcknowledgementTimer = undefined;
    if (this.#copyAcknowledgement === undefined) return;
    this.#copyAcknowledgement = undefined;
    this.#ports.invalidateChrome();
    if (requestRender) this.#ports.requestRender();
  }

  renderCopyAcknowledgement(width: number): string | undefined {
    if (this.#copyAcknowledgement === undefined || width <= 0) return undefined;
    return piTheme().fg("accent", piShellTruncateToWidth(this.#copyAcknowledgement, width));
  }

  renderReleaseBanner(diagnostics: OwnedUiSessionViewModel["diagnostics"], width: number): PiShellReleaseUpdateBanner | undefined {
    if (this.#releaseDismissed) return undefined;
    const diagnostic = diagnostics.findLast(item => item.code === "release-update");
    const release = diagnostic === undefined ? null : parseReleaseUpdateDiagnostic(diagnostic.message);
    if (release === null) return undefined;
    return renderPiShellReleaseUpdateBanner(release, width, this.#ports.viewport.tailControlHovered(this.#releaseCloseTarget));
  }

  locateReleaseClose(
    frame: TranscriptViewportFrame,
    banner: PiShellReleaseUpdateBanner | undefined,
    tailEnd: number,
    tailLength: number,
  ): void {
    // Invariant: the tail is the document suffix, so the control's document row is fixed relative to its
    // end; alignment gap rows precede it and the viewport scroll decides whether it is on screen.
    const bannerStart = tailEnd + frame.descriptor.transientAlignmentGapRows - tailLength - frame.scrollTop + 1;
    const rowStart = banner === undefined ? 0 : Math.max(1, bannerStart + banner.close.rowStart);
    const rowEnd = banner === undefined ? 0 : Math.min(frame.hits.viewportHeight, bannerStart + banner.close.rowEnd);
    this.#releaseCloseTarget = banner !== undefined && rowStart <= rowEnd
      ? { rowStart, rowEnd, columnStart: banner.close.columnStart, columnEnd: banner.close.columnEnd }
      : undefined;
    this.#ports.viewport.setTailControl(this.#releaseCloseTarget === undefined ? undefined : {
      ...this.#releaseCloseTarget,
      activate: () => {
        this.#releaseDismissed = true;
        this.#releaseCloseTarget = undefined;
      },
    });
  }
}
