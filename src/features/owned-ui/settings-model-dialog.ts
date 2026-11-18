import { DIALOG_BACK_SHORTCUT_HINT, DIALOG_CLOSE_SHORTCUT_HINT, wrapChoiceIndex } from "../../contracts/presentation/index.js";
import type { DialogRow } from "../../ui/components/index.js";
import {
  LineInput,
  ShortcutRegistry,
  assertNoShortcutConflicts,
  configureDialogChoiceCapacity,
  configureDialogTextRows,
  handleLineInputKey,
  humanizeLabel,
  renderSteppedDialogPanel,
  type PaneInputResult,
  type UiTheme,
} from "../../ui/components/index.js";
import type { OwnedSettingsManager, OwnedUiSettingsEntry } from "../../ui/settings/index.js";
import { changeFailure, structuredValue } from "./settings-edits.js";
import type { SettingsDialogList } from "./settings-dialog-list.js";
import type { StructuredEdit } from "./settings-configure-state.js";
export type { StructuredEdit } from "./settings-configure-state.js";
import { SETTINGS_APP_ID } from "./settings-route.js";

const MODEL_SCOPE = `${SETTINGS_APP_ID}-models`;
const MODEL_LEVEL_SCOPE = `${SETTINGS_APP_ID}-model-levels`;

type ModelAction = "edit-filter" | "previous" | "next" | "select" | "close" | "back";
const MODEL_SHORTCUTS = new ShortcutRegistry<ModelAction>();
MODEL_SHORTCUTS.declare({ key: "edit", scope: MODEL_SCOPE, description: "Search models", section: "Choose", hint: { keys: "Type", does: "search" } }, "edit-filter");
MODEL_SHORTCUTS.declare({ key: "up", scope: MODEL_SCOPE, description: "Previous model", section: "Choose" }, "previous");
MODEL_SHORTCUTS.declare({ key: "down", scope: MODEL_SCOPE, description: "Next model", section: "Choose" }, "next");
MODEL_SHORTCUTS.declare({ key: "enter", scope: MODEL_SCOPE, description: "Select model", section: "Choose", hint: { keys: "Enter", does: "select" } }, "select");
MODEL_SHORTCUTS.declare({ key: "escape", scope: MODEL_SCOPE, description: "Close selector", section: "Choose", hint: { keys: DIALOG_CLOSE_SHORTCUT_HINT.key, does: DIALOG_CLOSE_SHORTCUT_HINT.action } }, "close");
MODEL_SHORTCUTS.declare({ key: "up", scope: MODEL_LEVEL_SCOPE, description: "Previous level", section: "Choose", hint: { keys: "↑↓", does: "navigate" } }, "previous");
MODEL_SHORTCUTS.declare({ key: "down", scope: MODEL_LEVEL_SCOPE, description: "Next level", section: "Choose", hint: { keys: "↑↓", does: "navigate" } }, "next");
MODEL_SHORTCUTS.declare({ key: "enter", scope: MODEL_LEVEL_SCOPE, description: "Select level", section: "Choose", hint: { keys: "Enter", does: "select" } }, "select");
MODEL_SHORTCUTS.declare({ key: "escape", scope: MODEL_LEVEL_SCOPE, description: "Return to models", section: "Choose", hint: { keys: DIALOG_BACK_SHORTCUT_HINT.key, does: DIALOG_BACK_SHORTCUT_HINT.action } }, "back");
assertNoShortcutConflicts(MODEL_SHORTCUTS.assemble());

/** What the model dialog asks of the settings screen that owns it. */
export interface ModelDialogActions {
  readonly session: Pick<OwnedSettingsManager, "change">;
  close(): void;
  /** Show the dialog again, as after a failed save. */
  reopen(open: StructuredEdit): void;
  /** Save a changed record, rolling back if the source refuses it. */
  save(open: StructuredEdit, previous: Readonly<Record<string, boolean | string>>, forward: Readonly<Record<string, boolean | string>>): void;
}

interface ModelLevelOption {
  readonly value: string;
  readonly label: string;
  readonly description: string;
}

/**
 * One key in the default-model selector or the two-step thinking-level dialog. `key` is the
 * named key for `data`; typed text that names no shortcut edits the search.
 */
export function modelDialogKey(open: StructuredEdit, data: string, key: string, actions: ModelDialogActions): PaneInputResult {
  if (open.modelDialog === "default" || open.step === "model") {
    const flags = filteredModelFlags(open);
    const action = MODEL_SHORTCUTS.resolve(key, MODEL_SCOPE) ?? "edit-filter";
    if (action === "close") {
      actions.close();
      return { consumed: true };
    }
    if (action === "previous" || action === "next") {
      open.index = wrapChoiceIndex(open.index, action === "next" ? 1 : -1, flags.length);
      return { consumed: true };
    }
    if (action === "select") return activateModelDialog(open, open.index, actions);
    if (open.filter === null) return { consumed: true, render: false };
    handleLineInputKey(open.filter, data);
    open.index = 0;
    return { consumed: true };
  }

  const selected = open.entry.flags.find(flag => flag.key === open.modelKey);
  const choices = selected === undefined ? [] : modelLevelOptions(open, selected);
  const action = MODEL_SHORTCUTS.resolve(key, MODEL_LEVEL_SCOPE);
  if (action === "back") {
    returnToModels(open);
    return { consumed: true };
  }
  if (action === "previous" || action === "next") {
    open.index = wrapChoiceIndex(open.index, action === "next" ? 1 : -1, choices.length);
    return { consumed: true };
  }
  if (action === "select") return activateModelDialog(open, open.index, actions);
  return { consumed: true, render: false };
}

/** Activate an explicit semantic choice, without borrowing the keyboard-active row for a mouse click. */
export function activateModelDialog(open: StructuredEdit, index: number, actions: ModelDialogActions): PaneInputResult {
  open.pointer.invalidate();
  if (open.modelDialog === "default" || open.step === "model") {
    const selected = filteredModelFlags(open)[index];
    if (selected === undefined) return { consumed: true, render: false };
    if (open.modelDialog === "default") selectDefaultModel(open, selected.key, actions);
    else {
      open.modelIndex = open.index;
      open.modelKey = selected.key;
      open.step = "level";
      const options = modelLevelOptions(open, selected);
      const current = structuredValue(open.entry, open.record)[selected.key];
      open.index = Math.max(0, options.findIndex(option => option.value === current));
    }
  } else {
    const selected = open.entry.flags.find(flag => flag.key === open.modelKey);
    const choice = selected === undefined ? undefined : modelLevelOptions(open, selected)[index];
    if (selected === undefined || choice === undefined) return { consumed: true, render: false };
    const previous = { ...open.record };
    open.record[selected.key] = choice.value;
    actions.save(open, previous, { ...open.record });
    returnToModels(open);
  }
  return { consumed: true };
}

export function modelDialogLines(open: StructuredEdit, width: number, height: number, theme: UiTheme, list: SettingsDialogList): readonly string[] {
  if (open.modelDialog === "default") {
    const flags = filteredModelFlags(open);
    const current = typeof open.entry.rawValue === "string" ? open.entry.rawValue : null;
    const rows: readonly DialogRow[] = flags.length === 0
      ? [{ label: "No models found", value: "" }]
      : flags.map(flag => ({
        ...modelLabelParts(flag.label ?? humanizeLabel(flag.key)),
        ...(flag.key === current ? { successSuffix: "✓" } : {}),
        value: "",
      }));
    const description = open.error ?? "Select the model used for new sessions";
    const visible = list.project(rows, open.index, configureDialogChoiceCapacity(height, true, configureDialogTextRows(description, width)));
    open.windowStart = open.index - visible.index;
    return renderSteppedDialogPanel({
      ...(flags.length === 0 ? {} : { pointer: open.pointer }),
      ...list.presentation(), compact: height < 10,
      title: "Default Model", description, input: open.filter ?? new LineInput(""),
      rows: visible.rows, index: visible.index, hint: MODEL_SHORTCUTS.hintEntries(MODEL_SCOPE),
    }, width, theme);
  }
  if (open.step === "model") {
    const flags = filteredModelFlags(open);
    const stored = structuredValue(open.entry, open.record);
    const allRows: readonly DialogRow[] = flags.length === 0
      ? [{ label: "No models found", value: "" }]
      : flags.map(flag => ({
        ...modelLabelParts(flag.label ?? humanizeLabel(flag.key)),
        value: stored[flag.key] === undefined ? "" : String(stored[flag.key]),
      }));
    const description = "Select a model to configure";
    const visible = list.project(allRows, open.index, configureDialogChoiceCapacity(height, true, configureDialogTextRows(description, width)));
    open.windowStart = open.index - visible.index;
    return renderSteppedDialogPanel({
      ...(flags.length === 0 ? {} : { pointer: open.pointer }),
      ...list.presentation(), compact: height < 10,
      title: "Thinking Level",
      step: 1,
      steps: 2,
      description,
      ...(open.filter === null ? {} : { input: open.filter }),
      rows: visible.rows,
      index: visible.index,
      hint: MODEL_SHORTCUTS.hintEntries(MODEL_SCOPE),
    }, width, theme);
  }

  const selected = open.entry.flags.find(flag => flag.key === open.modelKey);
  const current = selected === undefined ? undefined : structuredValue(open.entry, open.record)[selected.key];
  const allRows: readonly DialogRow[] = (selected === undefined ? [] : modelLevelOptions(open, selected)).map(choice => ({
    label: choice.value === current ? `✓ ${choice.label}` : choice.label,
    value: choice.description,
  }));
  const description = `Select default thinking level for ${selected?.label ?? open.modelKey ?? "model"}`;
  const visible = list.project(allRows, open.index, configureDialogChoiceCapacity(height, false, configureDialogTextRows(description, width)));
  open.windowStart = open.index - visible.index;
  return renderSteppedDialogPanel({
    pointer: open.pointer, ...list.presentation(), compact: height < 10,
    title: "Thinking Level",
    step: 2,
    steps: 2,
    description,
    rows: visible.rows,
    index: visible.index,
    hint: MODEL_SHORTCUTS.hintEntries(MODEL_LEVEL_SCOPE),
  }, width, theme);
}

// Concurrency: the dialog closes at once; a refused save reopens it with the reason.
function selectDefaultModel(open: StructuredEdit, model: string, actions: ModelDialogActions): void {
  open.error = null;
  actions.close();
  void actions.session.change(open.entry.backend, open.entry.id, model).then(outcome => {
    const failure = changeFailure(outcome);
    if (failure !== null) {
      open.error = `Could not save: ${failure}`;
      actions.reopen(open);
    }
  });
}

function returnToModels(open: StructuredEdit): void {
  open.step = "model";
  open.modelKey = null;
  open.index = open.modelIndex;
}

function filteredModelFlags(open: StructuredEdit): readonly OwnedUiSettingsEntry["flags"][number][] {
  const needle = open.filter?.value.trim().toLowerCase() ?? "";
  return open.entry.flags.filter(flag => needle.length === 0
    || (flag.label ?? humanizeLabel(flag.key)).toLowerCase().includes(needle)
    || flag.description.toLowerCase().includes(needle)
    || flag.key.toLowerCase().includes(needle));
}

function modelLevelOptions(
  open: StructuredEdit,
  selected: OwnedUiSettingsEntry["flags"][number],
): readonly ModelLevelOption[] {
  const fallback = String(selected.fallback);
  const supported = (selected.choices ?? [])
    .filter(choice => choice !== fallback)
    .map(choice => ({ value: choice, label: choice, description: thinkingLevelDescription(choice) }));
  return structuredValue(open.entry, open.record)[selected.key] === undefined
    ? supported
    : [...supported, { value: fallback, label: "(clear override)", description: "Revert to global default" }];
}

function modelLabelParts(label: string): Pick<DialogRow, "label" | "labelSuffix"> {
  const match = /^(.*?)(\s+\[[^\]]+\])$/u.exec(label);
  return match === null ? { label } : { label: match[1] ?? label, labelSuffix: match[2] ?? "" };
}

function thinkingLevelDescription(level: string): string {
  switch (level) {
    case "default": return "global default";
    case "off": return "No reasoning";
    case "minimal": return "Very brief reasoning (~1k tokens)";
    case "low": return "Light reasoning (~2k tokens)";
    case "medium": return "Moderate reasoning (~8k tokens)";
    case "high": return "Deep reasoning (~16k tokens)";
    case "xhigh": return "Extra-high reasoning (~32k tokens)";
    case "max": return "Maximum reasoning";
    default: return "";
  }
}
