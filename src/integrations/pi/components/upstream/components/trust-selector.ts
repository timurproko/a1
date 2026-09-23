/**
 * Provenance: @earendil-works/pi-coding-agent 0.87.1 (MIT), commit f07218c4d4bbc12bef056a7058c3dd49dfe41abe,
 * packages/coding-agent/src/modes/interactive/components/trust-selector.ts.
 * Modifications: Mechanical source-synchronized trust selector port with injected public
 * ProjectTrustStore-derived options, remapped owned theme imports, and the shared bare-A1 modal
 * shortcut row and compact modal header.
 * Deviations: owned-modal-shortcut-hints.
 */
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { Container, getKeybindings, Spacer, Text } from "@earendil-works/pi-tui";
import { addPiModalHeader } from "../../modal-frame.js";
import { piTheme, renderPiModalShortcutHints } from "../../theme.js";

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
  readonly handleInput: (data: string) => void;

  constructor(options: {
    readonly cwd: string;
    readonly savedDecision: TrustDecision | null;
    readonly projectTrusted: boolean;
    readonly trustOptions: readonly TrustOption[];
    readonly onSelect: (selection: { readonly trusted: boolean; readonly updates: readonly TrustUpdate[] }) => void;
    readonly onCancel: () => void;
  }) {
    super();
    this.trustOptions = options.trustOptions;
    const isSaved = (option: TrustOption) => option.savedPath !== undefined
      && options.savedDecision?.decision === option.trusted
      && options.savedDecision.path === option.savedPath;
    this.selectedIndex = Math.max(0, this.trustOptions.findIndex(isSaved));
    addPiModalHeader(this, new DynamicBorder(), new Text(piTheme().fg("accent", piTheme().bold("Project trust")), 1, 0));
    this.addChild(new Text(piTheme().fg("muted", options.cwd), 1, 0));
    this.addChild(new Spacer(1));
    this.addChild(new Text(piTheme().fg("muted", `Saved decision: ${formatDecision(this.trustOptions[0]?.savedPath, options.savedDecision)}`), 1, 0));
    this.addChild(new Text(piTheme().fg("muted", `Current session: ${options.projectTrusted ? "trusted" : "untrusted"}`), 1, 0));
    this.addChild(new Spacer(1));
    this.listContainer = new Container();
    this.addChild(this.listContainer);
    this.addChild(new Spacer(1));
    const keybindings = getKeybindings();
    this.addChild(new Text(renderPiModalShortcutHints([
      { key: "↑↓", action: "navigate" },
      { key: keybindings.getKeys("tui.select.confirm").join("/"), action: "save" },
      { key: keybindings.getKeys("tui.select.cancel").join("/"), action: "cancel" },
    ]), 1, 0));
    this.addChild(new Spacer(1));
    this.addChild(new DynamicBorder());
    this.updateList(options.savedDecision);
    this.handleInput = data => {
      const kb = getKeybindings();
      if (kb.matches(data, "tui.select.up") || data === "k") this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      else if (kb.matches(data, "tui.select.down") || data === "j") this.selectedIndex = Math.min(this.trustOptions.length - 1, this.selectedIndex + 1);
      else if (kb.matches(data, "tui.select.confirm") || data === "\n") {
        const selected = this.trustOptions[this.selectedIndex];
        if (selected) options.onSelect({ trusted: selected.trusted, updates: selected.updates });
        return;
      } else if (kb.matches(data, "tui.select.cancel")) {
        options.onCancel();
        return;
      } else return;
      this.updateList(options.savedDecision);
    };
  }

  private updateList(savedDecision: TrustDecision | null): void {
    this.listContainer.clear();
    for (let index = 0; index < this.trustOptions.length; index += 1) {
      const option = this.trustOptions[index];
      if (!option) continue;
      const selected = index === this.selectedIndex;
      const current = option.savedPath !== undefined && savedDecision?.decision === option.trusted && savedDecision.path === option.savedPath;
      const prefix = selected ? piTheme().fg("accent", "→ ") : "  ";
      const label = selected ? piTheme().fg("accent", option.label) : piTheme().fg("text", option.label);
      const currentMarker = current ? piTheme().fg("accent", "✓ ") : "  ";
      this.listContainer.addChild(new Text(`${prefix}${currentMarker}${label}`, 1, 0));
    }
  }
}
