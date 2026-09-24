import {
  Input,
  Key,
  getKeybindings,
  matchesKey,
  truncateToWidth,
  type Component,
  type Focusable,
} from "@earendil-works/pi-tui";
import { DynamicBorder } from "../startup-public.js";
import { PiModalFrame } from "./modal-frame.js";
import { piTheme, renderPiModalShortcutHints, type PiModalShortcutHint } from "./theme.js";

export type ModelsDialogFilter = "all" | "scoped";

export interface ModelsDialogModel {
  readonly provider: string;
  readonly id: string;
  readonly name: string;
}

export interface ModelsDialogConfig {
  /** The authenticated catalog; rows never widen beyond it. */
  readonly models: readonly ModelsDialogModel[];
  /** `provider/id` of the active model, or null before one is set. */
  readonly activeModelId: string | null;
  /** The explicit cycling scope the session currently uses, in order. */
  readonly scopeIds: readonly string[];
  /** The last persisted scope, in order; the dirty comparison baseline. */
  readonly savedScopeIds: readonly string[];
  readonly initialQuery?: string;
  readonly initialFilter?: ModelsDialogFilter;
  readonly refreshStatus?: string;
}

export interface ModelsDialogCallbacks {
  /** Enter on a row: the shell switches through its workflow and closes the dialog on success. */
  onSelect(modelId: string): void;
  /** Every scope or order edit, session-only. */
  onScopeChange(scopeIds: readonly string[]): void;
  /** Ctrl+S: a resolved promise clears the dirty state for exactly the saved snapshot; a rejection keeps it. */
  onSave(scopeIds: readonly string[]): Promise<void> | void;
  onCancel(): void;
  requestRender(): void;
}

const MAX_VISIBLE_ROWS = 10;
const MODELS_TITLE = "Models";
const REFRESHING_TITLE_MIN_DURATION_MS = 1_000;
const REFRESHED_TITLE_DURATION_MS = 1_000;

interface ModelsDialogRow {
  readonly fullId: string;
  readonly model: ModelsDialogModel;
}

class ModalTitleLine implements Component {
  #text = "";

  setText(text: string): void { this.#text = text; }
  invalidate(): void {}
  render(width: number): string[] { return [truncateToWidth(this.#text, width)]; }
}

function fullModelId(model: ModelsDialogModel): string {
  return `${model.provider}/${model.id}`;
}

function sameOrder(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function matchesQuery(model: ModelsDialogModel, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return true;
  return `${model.id} ${model.name} ${model.provider} ${fullModelId(model)}`.toLowerCase().includes(normalized);
}

function keyLabel(action: Parameters<ReturnType<typeof getKeybindings>["getKeys"]>[0]): string {
  return getKeybindings().getKeys(action)
    .map(key => key.split("+").map(part => process.platform === "darwin" && part.toLowerCase() === "alt" ? "option" : part).join("+"))
    .join("/");
}

/**
 * Bare A1's one model-management dialog: a searchable catalog with `all`/`scoped` filters where
 * Enter switches the active model, Space edits the session's cycling scope, and Ctrl+S persists
 * that scope. The component owns only presentation state (query, filter, selection, desired and
 * saved scope, refresh status); every switch, scope write, and save goes through its callbacks.
 */
export class ModelsDialogComponent implements Component, Focusable {
  readonly #input = new Input();
  readonly #title = new ModalTitleLine();
  readonly #body: Component = {
    invalidate: () => this.#input.invalidate(),
    render: width => this.#renderBody(width),
  };
  readonly #frame = new PiModalFrame(new DynamicBorder(), [this.#title, this.#body], new DynamicBorder());
  readonly #callbacks: ModelsDialogCallbacks;
  #models: ModelsDialogModel[] = [];
  #activeModelId: string | null;
  #scopeIds: string[];
  #savedScopeIds: string[];
  #filter: ModelsDialogFilter;
  #selectedIndex = 0;
  #preferredId: string | undefined;
  #refreshStatus: { readonly message: string; readonly kind: "warning" } | undefined;
  #refreshing = false;
  #refreshStartedAt: number | undefined;
  #refreshOutcomeTimer: ReturnType<typeof setTimeout> | undefined;
  #refreshed = false;
  #refreshDismissalTimer: ReturnType<typeof setTimeout> | undefined;
  #disposed = false;
  #focused = false;

  constructor(config: ModelsDialogConfig, callbacks: ModelsDialogCallbacks) {
    this.#callbacks = callbacks;
    this.#activeModelId = config.activeModelId;
    this.#scopeIds = [...config.scopeIds];
    this.#savedScopeIds = [...config.savedScopeIds];
    this.#filter = config.initialFilter ?? "all";
    if (config.refreshStatus !== undefined) {
      this.#refreshing = true;
      this.#refreshStartedAt = Date.now();
    }
    if (config.initialQuery) this.#input.setValue(config.initialQuery);
    this.#replaceModels(config.models);
    const rows = this.#rows();
    const activeIndex = rows.findIndex(row => row.fullId === this.#activeModelId);
    this.#selectedIndex = activeIndex >= 0 ? activeIndex : 0;
  }

  get focused(): boolean {
    return this.#focused;
  }

  set focused(value: boolean) {
    this.#focused = value;
    this.#input.focused = value;
  }

  /** True while the desired scope or order differs from the last successful save. */
  get dirty(): boolean {
    return !sameOrder(this.#scopeIds, this.#savedScopeIds);
  }

  get filter(): ModelsDialogFilter {
    return this.#filter;
  }

  get query(): string {
    return this.#input.getValue();
  }

  get scopeIds(): readonly string[] {
    return [...this.#scopeIds];
  }

  get selectedModelId(): string | undefined {
    return this.#rows()[this.#selectedIndex]?.fullId;
  }

  /** Replace the catalog after a refresh; query, filter, surviving selection, scope edits, and dirty state stay. */
  updateModels(models: readonly ModelsDialogModel[]): void {
    const selectedId = this.selectedModelId;
    this.#replaceModels(models);
    this.#restoreSelection(selectedId);
  }

  setRefreshStatus(message: string, kind: "muted" | "success" | "warning"): void {
    if (this.#disposed) return;
    if (kind === "muted") {
      this.#clearRefreshOutcome();
      this.#clearRefreshDismissal();
      this.#refreshStatus = undefined;
      this.#refreshing = true;
      this.#refreshStartedAt = Date.now();
      this.#refreshed = false;
      return;
    }
    const visibleMs = this.#refreshStartedAt === undefined ? REFRESHING_TITLE_MIN_DURATION_MS : Date.now() - this.#refreshStartedAt;
    const remainingMs = Math.max(0, REFRESHING_TITLE_MIN_DURATION_MS - visibleMs);
    if (this.#refreshing && remainingMs > 0) {
      this.#clearRefreshOutcome();
      const timer = setTimeout(() => {
        if (this.#refreshOutcomeTimer !== timer) return;
        this.#refreshOutcomeTimer = undefined;
        if (this.#disposed) return;
        this.#applyRefreshOutcome(message, kind);
        this.#callbacks.requestRender();
      }, remainingMs);
      timer.unref?.();
      this.#refreshOutcomeTimer = timer;
      return;
    }
    this.#clearRefreshOutcome();
    this.#applyRefreshOutcome(message, kind);
  }

  dispose(): void {
    this.#disposed = true;
    this.#clearRefreshOutcome();
    this.#clearRefreshDismissal();
    this.#refreshing = false;
    this.#refreshStartedAt = undefined;
    this.#refreshed = false;
  }

  invalidate(): void {
    this.#input.invalidate();
  }

  handleInput(data: string): void {
    const kb = getKeybindings();
    const rows = this.#rows();
    this.#clampSelection(rows);
    const selected = rows[this.#selectedIndex];
    // Rationale: an emptied filter keeps the last highlighted model so switching filters lands back on it.
    const preferredId = selected?.fullId ?? this.#preferredId;
    this.#preferredId = preferredId;

    if (kb.matches(data, "tui.select.up")) {
      if (rows.length > 0) this.#selectedIndex = this.#selectedIndex === 0 ? rows.length - 1 : this.#selectedIndex - 1;
      return;
    }
    if (kb.matches(data, "tui.select.down")) {
      if (rows.length > 0) this.#selectedIndex = this.#selectedIndex === rows.length - 1 ? 0 : this.#selectedIndex + 1;
      return;
    }
    if (kb.matches(data, "tui.input.tab")) {
      this.#filter = this.#filter === "all" ? "scoped" : "all";
      this.#restoreSelection(preferredId);
      return;
    }
    if (data === " ") {
      if (selected) this.#setScope(this.#scopeIds.includes(selected.fullId)
        ? this.#scopeIds.filter(id => id !== selected.fullId)
        : [...this.#scopeIds, selected.fullId], selected.fullId);
      return;
    }
    if (kb.matches(data, "tui.select.confirm")) {
      if (selected) this.#callbacks.onSelect(selected.fullId);
      return;
    }
    if (kb.matches(data, "app.models.save")) {
      this.#save();
      return;
    }
    if (kb.matches(data, "app.models.enableAll")) {
      const targets = this.#bulkTargets(rows);
      this.#setScope([...this.#scopeIds, ...targets.filter(id => !this.#scopeIds.includes(id))], selected?.fullId);
      return;
    }
    if (kb.matches(data, "app.models.clearAll")) {
      const targets = new Set(this.#bulkTargets(rows));
      this.#setScope(this.#scopeIds.filter(id => !targets.has(id)), selected?.fullId);
      return;
    }
    if (kb.matches(data, "app.models.toggleProvider")) {
      if (!selected) return;
      const providerIds = this.#models.filter(model => model.provider === selected.model.provider).map(fullModelId);
      const allScoped = providerIds.every(id => this.#scopeIds.includes(id));
      this.#setScope(allScoped
        ? this.#scopeIds.filter(id => !providerIds.includes(id))
        : [...this.#scopeIds, ...providerIds.filter(id => !this.#scopeIds.includes(id))], selected.fullId);
      return;
    }
    const reorderUp = kb.matches(data, "app.models.reorderUp");
    if (reorderUp || kb.matches(data, "app.models.reorderDown")) {
      if (!selected) return;
      const index = this.#scopeIds.indexOf(selected.fullId);
      const target = index + (reorderUp ? -1 : 1);
      if (index < 0 || target < 0 || target >= this.#scopeIds.length) return;
      const next = [...this.#scopeIds];
      next[index] = next[target]!;
      next[target] = selected.fullId;
      this.#setScope(next, selected.fullId);
      return;
    }
    if (matchesKey(data, Key.ctrl("c"))) {
      if (this.#input.getValue().length > 0) {
        this.#input.setValue("");
        this.#selectedIndex = 0;
        return;
      }
      this.#callbacks.onCancel();
      return;
    }
    if (kb.matches(data, "tui.select.cancel")) {
      this.#callbacks.onCancel();
      return;
    }
    const before = this.#input.getValue();
    this.#input.handleInput(data);
    if (this.#input.getValue() !== before) this.#selectedIndex = 0;
  }

  render(width: number): string[] {
    const theme = piTheme();
    this.#title.setText(theme.fg("accent", theme.bold(MODELS_TITLE))
      + (this.dirty ? theme.fg("warning", " (unsaved)") : "")
      + (this.#refreshing ? theme.fg("muted", " (refreshing)") : "")
      + (this.#refreshed ? theme.fg("success", " (refreshed)") : ""));
    return this.#frame.render(width);
  }

  #applyRefreshOutcome(message: string, kind: "success" | "warning"): void {
    this.#clearRefreshDismissal();
    this.#refreshing = false;
    this.#refreshStartedAt = undefined;
    this.#refreshed = kind === "success";
    this.#refreshStatus = kind === "warning" ? { message, kind } : undefined;
    if (kind !== "success") return;
    const timer = setTimeout(() => {
      if (this.#refreshDismissalTimer !== timer) return;
      this.#refreshDismissalTimer = undefined;
      if (this.#disposed) return;
      this.#refreshed = false;
      this.#callbacks.requestRender();
    }, REFRESHED_TITLE_DURATION_MS);
    timer.unref?.();
    this.#refreshDismissalTimer = timer;
  }

  #clearRefreshOutcome(): void {
    if (this.#refreshOutcomeTimer === undefined) return;
    clearTimeout(this.#refreshOutcomeTimer);
    this.#refreshOutcomeTimer = undefined;
  }

  #clearRefreshDismissal(): void {
    if (this.#refreshDismissalTimer === undefined) return;
    clearTimeout(this.#refreshDismissalTimer);
    this.#refreshDismissalTimer = undefined;
  }

  #renderBody(width: number): string[] {
    const theme = piTheme();
    const lines: string[] = [];
    const push = (line = ""): void => { lines.push(truncateToWidth(line, width)); };
    const rows = this.#rows();
    this.#clampSelection(rows);

    push(theme.fg("dim", "Filter: ")
      + theme.fg(this.#filter === "all" ? "accent" : "dim", "all")
      + theme.fg("dim", " | ")
      + theme.fg(this.#filter === "scoped" ? "accent" : "dim", "scoped"));
    push();
    for (const line of this.#input.render(width)) push(line);
    push();

    if (rows.length === 0) {
      push(theme.fg("muted", `  ${this.#emptyText()}`));
    } else {
      const startIndex = Math.max(0, Math.min(this.#selectedIndex - Math.floor(MAX_VISIBLE_ROWS / 2), rows.length - MAX_VISIBLE_ROWS));
      const endIndex = Math.min(startIndex + MAX_VISIBLE_ROWS, rows.length);
      for (let index = startIndex; index < endIndex; index += 1) {
        const row = rows[index]!;
        const selected = index === this.#selectedIndex;
        const scoped = this.#scopeIds.includes(row.fullId);
        // Invariant: arrow, scope marker, model id, [provider], then the active checkmark, in that order.
        const prefix = selected ? theme.fg("accent", "→ ") : "  ";
        const marker = scoped ? theme.fg("success", "●") : theme.fg("dim", "○");
        const label = selected ? theme.fg("accent", row.model.id) : row.model.id;
        const provider = theme.fg("muted", `[${row.model.provider}]`);
        const active = row.fullId === this.#activeModelId ? ` ${theme.fg("success", "✓")}` : "";
        push(`${prefix}${marker} ${label} ${provider}${active}`);
      }
      if (startIndex > 0 || endIndex < rows.length) push(theme.fg("muted", `  (${this.#selectedIndex + 1}/${rows.length})`));
      const selectedRow = rows[this.#selectedIndex];
      if (selectedRow) {
        push();
        push(theme.fg("muted", `  Model Name: ${selectedRow.model.name}`));
      }
    }

    push();
    if (this.#refreshStatus !== undefined) push(theme.fg(this.#refreshStatus.kind, `  ${this.#refreshStatus.message}`));
    push(renderPiModalShortcutHints(this.#hints()));
    return lines;
  }

  #hints(): readonly PiModalShortcutHint[] {
    const tab = keyLabel("tui.input.tab");
    const confirm = keyLabel("tui.select.confirm");
    const save = keyLabel("app.models.save");
    return [
      { action: "type to search" },
      { key: "↑↓", action: "navigate" },
      ...(tab.length === 0 ? [] : [{ key: tab, action: "filter" }]),
      ...(confirm.length === 0 ? [] : [{ key: confirm, action: "switch" }]),
      { key: "space", action: "scope" },
      ...(save.length === 0 ? [] : [{ key: save, action: "save" }]),
      { key: "esc", action: "close" },
    ];
  }

  #emptyText(): string {
    if (this.#input.getValue().trim().length > 0) return "No matching models";
    if (this.#filter === "scoped") return "No scoped models";
    return "No models available. Use /login to add providers.";
  }

  #replaceModels(models: readonly ModelsDialogModel[]): void {
    this.#models = [...models].sort((left, right) => left.provider.localeCompare(right.provider) || left.id.localeCompare(right.id));
  }

  #rows(): readonly ModelsDialogRow[] {
    const query = this.#input.getValue();
    const byId = new Map(this.#models.map(model => [fullModelId(model), model]));
    const ordered = this.#filter === "scoped"
      // Rationale: the scoped view lists the desired cycling order, then saved members removed in this session so they can be restored.
      ? [...this.#scopeIds, ...this.#savedScopeIds.filter(id => !this.#scopeIds.includes(id))].flatMap(id => {
          const model = byId.get(id);
          return model === undefined ? [] : [model];
        })
      : this.#models;
    return ordered.filter(model => matchesQuery(model, query)).map(model => ({ fullId: fullModelId(model), model }));
  }

  #bulkTargets(rows: readonly ModelsDialogRow[]): readonly string[] {
    // Compatibility: like the pinned scoped selector, a live search narrows bulk actions to the visible rows.
    return this.#input.getValue().length > 0 || this.#filter === "scoped" ? rows.map(row => row.fullId) : this.#models.map(fullModelId);
  }

  #clampSelection(rows: readonly ModelsDialogRow[]): void {
    this.#selectedIndex = Math.min(this.#selectedIndex, Math.max(0, rows.length - 1));
  }

  #restoreSelection(fullId: string | undefined): void {
    const rows = this.#rows();
    const index = fullId === undefined ? -1 : rows.findIndex(row => row.fullId === fullId);
    this.#selectedIndex = index >= 0 ? index : Math.min(this.#selectedIndex, Math.max(0, rows.length - 1));
  }

  #setScope(next: readonly string[], keepSelected: string | undefined): void {
    if (sameOrder(next, this.#scopeIds)) return;
    this.#scopeIds = [...next];
    this.#restoreSelection(keepSelected);
    this.#callbacks.onScopeChange([...this.#scopeIds]);
  }

  #save(): void {
    const snapshot = [...this.#scopeIds];
    let outcome: Promise<void> | void;
    try {
      outcome = this.#callbacks.onSave(snapshot);
    } catch {
      return;
    }
    Promise.resolve(outcome).then(() => {
      if (this.#disposed) return;
      // Invariant: only the exact snapshot that persisted becomes the baseline; later edits stay dirty.
      this.#savedScopeIds = snapshot;
      this.#callbacks.requestRender();
    }, () => {
      if (!this.#disposed) this.#callbacks.requestRender();
    });
  }
}
