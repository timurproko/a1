import { rawKeyHint, VERSION } from "@earendil-works/pi-coding-agent";
import {
  Spacer,
  Text,
  type Component,
  type TUI,
} from "#pi-tui";
import type {
  OwnedUiSessionViewModel,
} from "../../../contracts/owned-ui/index.js";
import { SessionFooter } from "./upstream/components/session-footer.js";
import { WorkingStatusIndicator } from "./upstream/components/status-indicator.js";
import {
  PINNED_PI_LAYOUT,
  piTheme,
} from "./theme.js";
import {
  createTuiFacade,
  ensureTheme,
  type PiShellViewComponentPort,
  type PiShellStatusPort,
  type PiShellStatusPlacement,
  type PiShellQueuedInputPort,
  type PiShellHeaderPort,
  type PiShellResourceSection,
  type PiShellResourceEntry,
  type PiShellLoadedResourcesPort,
  type PiShellStartupNotice,
  type PiShellHeaderOptions,
  type PiShellEditorOptions,
} from "./shell-shared-facade.js";

export function createPiShellHeader(options: PiShellHeaderOptions = {}): PiShellHeaderPort {
  ensureTheme();
  let expanded = options.expanded ?? false;
  const compact = new Text(compactHeaderText(), 1, 0);
  const full = new Text(expandedHeaderText(), 1, 0);
  const notices = (options.notices ?? []).map(notice => new Text(noticeText(notice), 1, 0));
  return {
    get expanded() { return expanded; },
    setExpanded(value) { expanded = value; },
    render(width) {
      if (options.quiet) return [];
      return [
        ...new Spacer(1).render(width),
        ...(expanded ? full : compact).render(width),
        ...notices.flatMap(notice => ["", ...notice.render(width)]),
        ...new Spacer(1).render(width),
      ];
    },
    invalidate() {
      compact.invalidate();
      full.invalidate();
      for (const notice of notices) notice.invalidate();
    },
  };
}

export function createPiShellLoadedResources(
  resources: readonly PiShellResourceEntry[],
  initialExpanded = false,
): PiShellLoadedResourcesPort {
  ensureTheme();
  let expanded = initialExpanded;
  return {
    setExpanded(value) { expanded = value; },
    render(width) {
      const rows: string[] = [];
      const sections: readonly PiShellResourceSection[] = ["Context", "Skills", "Prompts", "Extensions", "Themes"];
      for (const section of sections) {
        const entries = resources.filter(entry => entry.section === section && !entry.diagnostic);
        if (entries.length === 0) continue;
        if (rows.length === 0 && section === "Context") rows.push("");
        const labels = expanded
          ? entries.map(entry => entry.sourcePath ?? entry.label).sort((left, right) => left.localeCompare(right))
          : entries.map(entry => entry.label).sort((left, right) => left.localeCompare(right));
        const body = expanded
          ? labels.map(label => piTheme().fg("dim", `  ${label}`)).join("\n")
          : piTheme().fg("dim", `  ${labels.join(", ")}`);
        rows.push(...new Text(`${piTheme().fg("mdHeading", `[${section}]`)}\n${body}`, 0, 0).render(width), "");
      }
      const diagnostics = resources.filter(entry => entry.diagnostic);
      for (const group of ["Skills", "Prompts", "Extensions", "Themes"] as const) {
        const entries = diagnostics.filter(entry => entry.section === group);
        if (entries.length === 0) continue;
        const title = group === "Skills" ? "Skill conflicts" : group === "Prompts" ? "Prompt conflicts" : group === "Extensions" ? "Extension issues" : "Theme conflicts";
        const body = entries.map(entry => `  ${entry.sourcePath ? `${entry.sourcePath}\n    ` : ""}${entry.diagnostic}`).join("\n");
        rows.push(...new Text(`${piTheme().fg("warning", `[${title}]`)}\n${piTheme().fg("warning", body)}`, 0, 0).render(width), "");
      }
      return rows.length === 0 ? rows : [...rows, ""];
    },
    invalidate() {},
  };
}

export function createPiShellStatus(
  view: OwnedUiSessionViewModel,
  formatProgressStatus: (message: string) => string,
  runtime?: Pick<PiShellEditorOptions, "getColumns" | "getRows" | "requestRender">,
): PiShellStatusPort {
  ensureTheme();
  const statusUi = createTuiFacade(runtime ?? { getColumns: () => 80, getRows: () => 24, requestRender() {} });
  let workingOverride: string | undefined;
  let outputPad: 0 | 1 = PINNED_PI_LAYOUT.outputPad;
  let placement: PiShellStatusPlacement = statusPlacement(view, workingOverride);
  let component = statusComponent(view, statusUi, workingOverride, outputPad, formatProgressStatus, placement);
  let signature = statusSignature(view, workingOverride, outputPad, placement);
  const rebuild = () => {
    const nextPlacement = statusPlacement(view, workingOverride);
    const nextSignature = statusSignature(view, workingOverride, outputPad, nextPlacement);
    if (nextSignature === signature) return;
    if (component !== undefined && "dispose" in component && typeof component.dispose === "function") component.dispose();
    placement = nextPlacement;
    signature = nextSignature;
    component = statusComponent(view, statusUi, workingOverride, outputPad, formatProgressStatus, placement);
  };
  return {
    render: width => component?.render(width) ?? [],
    renderDock: width => placement === "dock" ? component?.render(width) ?? [] : [],
    renderLive: width => placement === "live" ? component?.render(width) ?? [] : [],
    placement: () => placement,
    invalidate: () => component?.invalidate(),
    update(next) {
      view = next;
      rebuild();
    },
    setWorkingOverride(message) {
      workingOverride = message;
      rebuild();
    },
    setOutputPad(padding) {
      outputPad = padding;
      rebuild();
    },
    dispose() {
      if (component !== undefined && "dispose" in component && typeof component.dispose === "function") component.dispose();
      component = undefined;
    },
  };
}

export function createPiShellFooter(view: OwnedUiSessionViewModel, cwd: string): PiShellViewComponentPort {
  ensureTheme();
  const footer = new SessionFooter(() => view, cwd);
  return {
    render: width => footer.render(width),
    invalidate: () => footer.invalidate(),
    update(next) { view = next; },
    dispose: () => footer.dispose(),
  };
}

export function createPiQueuedInputStatus(
  submissions: readonly string[],
  presentation: "pinned" | "custom-viewport" = "pinned",
): PiShellQueuedInputPort {
  const text = new Text(queuedInputText(submissions, presentation), 1, 0);
  return {
    render: width => submissions.length === 0 ? [] : text.render(width),
    invalidate: () => text.invalidate(),
    update(next) {
      submissions = next;
      text.setText(queuedInputText(next, presentation));
    },
  };
}


function statusPlacement(view: OwnedUiSessionViewModel, workingOverride: string | undefined): PiShellStatusPlacement {
  // Invariant: live spinner placement follows semantic lifecycle, not text. An extension
  // override is visible only when its lifecycle is busy, so a stale override cannot spin
  // after completion or make an idle informational status scrollable.
  if (view.lifecycle === "busy") return "live";
  if (view.lifecycle === "failed") return "dock";
  return view.status.workingMessage === null ? "hidden" : "dock";
}

function statusComponent(
  view: OwnedUiSessionViewModel,
  ui: TUI,
  workingOverride: string | undefined,
  outputPad: 0 | 1,
  formatProgressStatus: (message: string) => string,
  placement: PiShellStatusPlacement,
): Component | undefined {
  if (placement === "live") {
    return new WorkingStatusIndicator(ui, formatProgressStatus(workingOverride ?? view.status.workingMessage ?? "Working"));
  }
  if (placement === "dock") {
    if (view.lifecycle === "failed") {
      return new Text(piTheme().fg("error", view.status.diagnostics.at(-1) ?? "Session failed"), outputPad, 0);
    }
    return new Text(piTheme().fg("muted", view.status.workingMessage!), outputPad, 0);
  }
  return undefined;
}

function statusSignature(
  view: OwnedUiSessionViewModel,
  workingOverride: string | undefined,
  outputPad: 0 | 1,
  placement: PiShellStatusPlacement,
): string {
  return `${placement}\u0000${outputPad}\u0000${view.lifecycle}\u0000${workingOverride ?? ""}\u0000${view.status.workingMessage ?? ""}\u0000${view.status.diagnostics.at(-1) ?? ""}`;
}

function queuedInputText(
  submissions: readonly string[],
  presentation: "pinned" | "custom-viewport",
): string {
  if (submissions.length === 0) return "";
  const theme = piTheme();
  if (presentation === "pinned") {
    return submissions.map(submission => theme.fg("muted", `Steering: ${submission.replaceAll("\n", " ⏎ ")}`)).join("\n");
  }
  const messages = submissions.map(submission => theme.fg("dim", `Steering: ${submission.replaceAll("\n", " ⏎ ")}`));
  const dequeueHint = theme.fg("dim", "↳ Alt+Up to edit all queued messages");
  // Compatibility: the custom viewport matches Pi's interactive queue presentation while the
  // comparison shell remains byte-for-byte compatible with its pinned fixture.
  return ["", ...messages, dequeueHint].join("\n");
}

function compactHeaderText(): string {
  const theme = piTheme();
  const instructions = [
    rawKeyHint("escape", "interrupt"),
    rawKeyHint("ctrl+c/ctrl+d", "clear/exit"),
    rawKeyHint("/", "commands"),
    rawKeyHint("!", "bash"),
    rawKeyHint("ctrl+o", "more"),
  ].join(theme.fg("muted", " · "));
  const logo = theme.bold(theme.fg("accent", "pi")) + theme.fg("dim", ` v${VERSION}`);
  const compactOnboarding = theme.fg("dim", "Press ctrl+o to show full startup help and loaded resources.");
  const onboarding = theme.fg("dim", "Pi can explain its own features and look up its docs. Ask it how to use or extend Pi.");
  return `${logo}\n${instructions}\n${compactOnboarding}\n\n${onboarding}`;
}

function expandedHeaderText(): string {
  const instructions = [
    rawKeyHint("escape", "to interrupt"),
    rawKeyHint("ctrl+c", "to clear"),
    rawKeyHint("ctrl+c twice", "to exit"),
    rawKeyHint("ctrl+d", "to exit (empty)"),
    rawKeyHint(process.platform === "win32" ? "" : "ctrl+z", "to suspend"),
    rawKeyHint("ctrl+k", "to delete to end"),
    rawKeyHint("shift+tab", "to cycle thinking level"),
    rawKeyHint("ctrl+p/shift+ctrl+p", "to cycle models"),
    rawKeyHint("ctrl+l", "to select model"),
    rawKeyHint("ctrl+o", "to expand tools"),
    rawKeyHint("ctrl+t", "to expand thinking"),
    rawKeyHint("ctrl+g", "for external editor"),
    rawKeyHint("/", "for commands"),
    rawKeyHint("!", "to run bash"),
    rawKeyHint("!!", "to run bash (no context)"),
    rawKeyHint("alt+enter", "to queue follow-up"),
    rawKeyHint("alt+up", "to edit all queued messages"),
    rawKeyHint(process.platform === "win32" ? "alt+v" : "ctrl+v", "to paste image (with text fallback)"),
    rawKeyHint("drop files", "to attach"),
  ].join("\n");
  const theme = piTheme();
  const logo = theme.bold(theme.fg("accent", "pi")) + theme.fg("dim", ` v${VERSION}`);
  const onboarding = theme.fg("dim", "Pi can explain its own features and look up its docs. Ask it how to use or extend Pi.");
  return `${logo}\n${instructions}\n\n${onboarding}`;
}

function noticeText(notice: PiShellStartupNotice): string {
  const theme = piTheme();
  if (notice.kind === "info") return theme.fg("dim", notice.message);
  const prefix = notice.kind === "warning" ? "Warning" : "Error";
  return theme.fg(notice.kind, `${prefix}: ${notice.message}`);
}

