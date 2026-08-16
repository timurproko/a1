// Mechanically adapted from Pi commit 53fa77c
// packages/coding-agent/src/modes/interactive/components/trust-selector.ts (MIT).
// Local modifications: inject trust options and remap theme/import boundaries.
import { DynamicBorder, keyHint, rawKeyHint } from "@earendil-works/pi-coding-agent";
import { Container, getKeybindings, Spacer, Text } from "@earendil-works/pi-tui";
import { piTheme } from "../theme/theme.js";

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
    this.addChild(new DynamicBorder());
    this.addChild(new Spacer(1));
    this.addChild(new Text(piTheme().fg("accent", piTheme().bold("Project trust")), 1, 0));
    this.addChild(new Text(piTheme().fg("muted", options.cwd), 1, 0));
    this.addChild(new Spacer(1));
    this.addChild(new Text(piTheme().fg("muted", `Saved decision: ${formatDecision(this.trustOptions[0]?.savedPath, options.savedDecision)}`), 1, 0));
    this.addChild(new Text(piTheme().fg("muted", `Current session: ${options.projectTrusted ? "trusted" : "untrusted"}`), 1, 0));
    this.addChild(new Spacer(1));
    this.listContainer = new Container();
    this.addChild(this.listContainer);
    this.addChild(new Spacer(1));
    this.addChild(new Text(`${rawKeyHint("↑↓", "navigate")}  ${keyHint("tui.select.confirm", "save")}  ${keyHint("tui.select.cancel", "cancel")}`, 1, 0));
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
      this.listContainer.addChild(new Text(`${prefix}${label}${current ? piTheme().fg("success", " ✓") : ""}`, 1, 0));
    }
  }
}
