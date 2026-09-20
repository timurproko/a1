/**
 * Provenance: @earendil-works/pi-coding-agent 0.86.0 (MIT), commit ecac0a9c4edad3dac5d9f8b40e0c7db7a56471fc,
 * packages/coding-agent/src/modes/interactive/components/status-indicator.ts.
 * Modifications: Mechanical source port with public package-root keybinding, Loader, and owned
 * theme/countdown imports plus ECMAScript private fields.
 * Deviations: status-indicator-public-boundaries.
 */
import { type Component, Loader, type LoaderIndicatorOptions, type TUI, truncateToWidth } from "@earendil-works/pi-tui";
import { keyText } from "@earendil-works/pi-coding-agent";
import { piTheme } from "../theme/theme.js";
import { CountdownTimer } from "./countdown-timer.js";

export type StatusIndicatorKind = "working" | "retry" | "compaction" | "branchSummary";

export class StatusIndicator extends Loader {
  readonly kind: StatusIndicatorKind;

  constructor(
    kind: StatusIndicatorKind,
    ui: TUI,
    spinnerColorFn: (str: string) => string,
    messageColorFn: (str: string) => string,
    message: string,
    indicator?: LoaderIndicatorOptions,
  ) {
    super(ui, spinnerColorFn, messageColorFn, message, indicator);
    this.kind = kind;
  }

<<<<<<< a1
  dispose(): void {
    this.stop();
  }
||||||| pi 0.85.1
	dispose(): void {
		this.stop();
	}
=======
	renderInBorder(width: number): string {
		const line = super.render(width + 2)[1] ?? "";
		return truncateToWidth(line.startsWith(" ") ? line.slice(1).trimEnd() : line.trimEnd(), width, "");
	}

	renderSpinnerInBorder(width: number): string {
		return truncateToWidth(this.getRenderedIndicator(), width, "");
	}

	dispose(): void {
		this.stop();
	}
>>>>>>> pi 0.86.0
}

export class WorkingStatusIndicator extends StatusIndicator {
<<<<<<< a1
  constructor(ui: TUI, message: string, indicator?: LoaderIndicatorOptions, colorFn?: (text: string) => string) {
    super("working", ui, colorFn ?? (spinner => piTheme().fg("accent", spinner)), colorFn ?? (text => piTheme().fg("muted", text)), message, indicator);
  }

  renderInBorder(width: number): string {
    const line = super.render(width + 2)[1] ?? "";
    return truncateToWidth(line.startsWith(" ") ? line.slice(1).trimEnd() : line.trimEnd(), width, "");
  }

  renderSpinnerInBorder(width: number): string {
    return truncateToWidth(this.getRenderedIndicator(), width, "");
  }
||||||| pi 0.85.1
	constructor(ui: TUI, message: string, indicator?: WorkingIndicatorOptions, colorFn?: (text: string) => string) {
		super(
			"working",
			ui,
			colorFn ?? ((text) => theme.fg("accent", text)),
			colorFn ?? ((text) => theme.fg("muted", text)),
			message,
			indicator,
		);
	}

	renderInBorder(width: number): string {
		const line = super.render(width + 2)[1] ?? "";
		return truncateToWidth(line.startsWith(" ") ? line.slice(1).trimEnd() : line.trimEnd(), width, "");
	}

	renderSpinnerInBorder(width: number): string {
		return truncateToWidth(this.getRenderedIndicator(), width, "");
	}
=======
	constructor(ui: TUI, message: string, indicator?: WorkingIndicatorOptions, colorFn?: (text: string) => string) {
		super(
			"working",
			ui,
			colorFn ?? ((text) => theme.fg("accent", text)),
			colorFn ?? ((text) => theme.fg("muted", text)),
			message,
			indicator,
		);
	}
>>>>>>> pi 0.86.0
}

export class RetryStatusIndicator extends StatusIndicator {
  #countdown: CountdownTimer | undefined;

  constructor(ui: TUI, attempt: number, maxAttempts: number, delayMs: number) {
    const retryMessage = (seconds: number) =>
      `Retrying (${attempt}/${maxAttempts}) in ${seconds}s... (${keyText("app.interrupt")} to cancel)`;
    super("retry", ui, spinner => piTheme().fg("warning", spinner), text => piTheme().fg("muted", text), retryMessage(Math.ceil(delayMs / 1000)));
    this.#countdown = new CountdownTimer(delayMs, ui, seconds => this.setMessage(retryMessage(seconds)), () => {
      this.#countdown = undefined;
    });
  }

  override dispose(): void {
    this.#countdown?.dispose();
    this.#countdown = undefined;
    super.dispose();
  }
}

export type CompactionStatusReason = "manual" | "threshold" | "overflow";

export class CompactionStatusIndicator extends StatusIndicator {
  constructor(ui: TUI, reason: CompactionStatusReason) {
    const cancelHint = `(${keyText("app.interrupt")} to cancel)`;
    const label = reason === "manual"
      ? `Compacting context... ${cancelHint}`
      : `${reason === "overflow" ? "Context overflow detected, " : ""}Auto-compacting... ${cancelHint}`;
    super("compaction", ui, spinner => piTheme().fg("accent", spinner), text => piTheme().fg("muted", text), label);
  }
}

export class BranchSummaryStatusIndicator extends StatusIndicator {
  constructor(ui: TUI) {
    super(
      "branchSummary",
      ui,
      spinner => piTheme().fg("accent", spinner),
      text => piTheme().fg("muted", text),
      `Summarizing branch... (${keyText("app.interrupt")} to cancel)`,
    );
  }
}

export class IdleStatus implements Component {
  invalidate(): void {}
  render(width: number): string[] {
    const emptyLine = " ".repeat(width);
    return [emptyLine, emptyLine];
  }
}
