/**
 * Provenance: @earendil-works/pi-coding-agent 1.5.1 (MIT), commit dd30101cfc5b0609411dd80b6f93adbc14db14cf,
 * packages/coding-agent/src/modes/interactive/components/trust-selector.ts.
 * Modifications: Source-synchronized trust port with injected public options and shared framing; bare
 * A1 opts into Title Case, selected backgrounds, circular navigation, aligned decisions and no
 * saved-path suffix while comparison styling and trust effects remain unchanged.
 * Deviations: owned-modal-shortcut-hints, standard-trust-dialog-styling.
 */
import { wrapChoiceIndex } from "../../../../../contracts/presentation/index.js";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { Container, getKeybindings, Spacer, Text } from "@earendil-works/pi-tui";
import { addPiModalHeader, adoptPiModalFrame } from "../../modal-frame.js";
import { DIALOG_CLOSE_SHORTCUT_HINT, piTheme, renderPiModalShortcutHints, renderPiModalListRow } from "../../theme.js";

export interface TrustDecision { readonly path: string; readonly decision: boolean }
export interface TrustUpdate { readonly path: string; readonly decision: boolean | null }
export interface TrustOption {
  readonly label: string;
  readonly trusted: boolean;
  readonly updates: readonly TrustUpdate[];
  readonly savedPath?: string;
}

function formatDecision(trustPath: string | undefined, decision: TrustDecision | null): string {
  if (decision === null) return "none";
  const label = decision.decision ? "trusted" : "untrusted";
  if (trustPath !== undefined && decision.path !== trustPath) return `${label} (inherited from ${decision.path})`;
  return `${label} (${decision.path})`;
}

export class TrustSelectorComponent extends Container {
  private selectedIndex: number;
  private readonly listContainer: Container;
  private readonly trustOptions: readonly TrustOption[];
  private readonly standardStyle: boolean;
  readonly handleInput: (data: string) => void;

  constructor(options: {
    readonly cwd: string;
    readonly standardStyle?: boolean;
    readonly savedDecision: TrustDecision | null;
    readonly projectTrusted: boolean;
    readonly trustOptions: readonly TrustOption[];
    readonly onSelect: (selection: { readonly trusted: boolean; readonly updates: readonly TrustUpdate[] }) => void;
    readonly onCancel: () => void;
  }) {
    super();
    this.trustOptions = options.trustOptions;
    this.standardStyle = options.standardStyle === true;
    const isSaved = (option: TrustOption) => option.savedPath !== undefined
      && options.savedDecision?.decision === option.trusted
      && options.savedDecision.path === option.savedPath;
    this.selectedIndex = Math.max(0, this.trustOptions.findIndex(isSaved));
    const header = addPiModalHeader(this, new DynamicBorder(text => piTheme().fg("border", text)), new Text(piTheme().fg("accent", piTheme().bold(this.standardStyle ? "Project Trust" : "Project trust")), 0, 0));
    this.addChild(new Text(piTheme().fg("muted", options.cwd), 0, 0));
    this.addChild(new Spacer(1));
    const saved = this.standardStyle
      ? options.savedDecision === null ? "none" : options.savedDecision.decision ? "trusted" : "untrusted"
      : formatDecision(this.trustOptions[0]?.savedPath, options.savedDecision);
    this.addChild(new Text(`${piTheme().fg("muted", "Saved decision:")}${this.standardStyle ? "  " : " "}${piTheme().fg("text", saved)}`, 0, 0));
    this.addChild(new Text(`${piTheme().fg("muted", "Current session:")} ${piTheme().fg("text", options.projectTrusted ? "trusted" : "untrusted")}`, 0, 0));
    this.addChild(new Spacer(1));
    this.listContainer = new Container();
    this.addChild(this.listContainer);
    this.addChild(new Spacer(1));
    const keybindings = getKeybindings();
    this.addChild(new Text(renderPiModalShortcutHints([
      { key: "↑↓", action: "navigate" },
      { key: keybindings.getKeys("tui.select.confirm").join("/"), action: "save" },
      DIALOG_CLOSE_SHORTCUT_HINT,
    ]), 0, 0));
    this.addChild(new DynamicBorder(text => piTheme().fg("border", text)));
    adoptPiModalFrame(this, { topIndex: 0, bottomIndex: this.children.length - 1, header });
    this.updateList();
    this.handleInput = data => {
      const kb = getKeybindings();
      if (kb.matches(data, "tui.select.up") || data === "k") this.selectedIndex = this.standardStyle ? wrapChoiceIndex(this.selectedIndex, -1, this.trustOptions.length) : Math.max(0, this.selectedIndex - 1);
      else if (kb.matches(data, "tui.select.down") || data === "j") this.selectedIndex = this.standardStyle ? wrapChoiceIndex(this.selectedIndex, 1, this.trustOptions.length) : Math.min(this.trustOptions.length - 1, this.selectedIndex + 1);
      else if (kb.matches(data, "tui.select.confirm") || data === "\n") {
        const selected = this.trustOptions[this.selectedIndex];
        if (selected) options.onSelect({ trusted: selected.trusted, updates: selected.updates });
        return;
      } else if (kb.matches(data, "tui.select.cancel")) {
        options.onCancel();
        return;
      } else return;
      this.updateList();
    };
  }

  private updateList(): void {
    this.listContainer.clear();
    for (let index = 0; index < this.trustOptions.length; index += 1) {
      const option = this.trustOptions[index];
      if (!option) continue;
      const selected = index === this.selectedIndex;
      const prefix = selected ? piTheme().fg("accent", "→ ") : "  ";
      if (this.standardStyle) {
        this.listContainer.addChild({
          render: width => {
            const theme = piTheme();
            const arrow = selected ? theme.fg("accent", "→ ") : "  ";
            return [renderPiModalListRow(`${arrow}${theme.fg("text", option.label)}`, width, selected)];
          },
          invalidate: () => {},
        });
      } else {
        const label = selected ? piTheme().fg("accent", option.label) : piTheme().fg("text", option.label);
        this.listContainer.addChild(new Text(`${prefix}${label}`, 0, 0));
      }
    }
  }
}
