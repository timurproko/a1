import type {
  OwnedUiSessionSettingKey,
  OwnedUiSessionSettingsPort,
  OwnedUiSessionSettingsSnapshot,
  OwnedUiSettingOwner,
  OwnedUiSettingOwnerHandlers,
} from "../../contracts/owned-ui/index.js";
import type { OwnedUiPresenterTerminal } from "./shell-host.js";
import type { OwnedUiSessionShellRoot } from "./session-shell-root.js";

/** What the session's live setting effects reach: terminal modes, root presentation, and the presenter's progress flag. */
export interface SessionSettingsTargets {
  readonly terminal: Pick<OwnedUiPresenterTerminal, "setHardwareCursor" | "setClearOnShrink" | "setWheelScrollLines">;
  readonly root: Pick<OwnedUiSessionShellRoot,
    | "setEditorPaddingX" | "setAutocompleteMaxVisible" | "setOutputPad" | "setHideThinkingBlock"
    | "setMermaidRenderingMode" | "setImagePresentation" | "setFullscreenCopyOnSelect">;
  setTerminalProgress(enabled: boolean): void;
}

interface SettingBinding {
  /** The owner that binds the live effect; null for a value applied only from the initial snapshot. */
  readonly owner: OwnedUiSettingOwner | null;
  readonly key: OwnedUiSessionSettingKey;
  /** Validates and installs one live value, throwing the owner's message for an invalid one. */
  live(value: unknown): void;
  /** Installs this setting's value from the initial snapshot, when it applies one. */
  seed?(snapshot: OwnedUiSessionSettingsSnapshot): void;
}

const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
const isNumber = (value: unknown): value is number => typeof value === "number";
const isOutputPad = (value: unknown): value is 0 | 1 => value === 0 || value === 1;
const isMermaidMode = (value: unknown): value is "off" | "final" | "streaming" =>
  value === "off" || value === "final" || value === "streaming";
const isImageWidth = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
const isWheelDistance = (value: unknown): value is "auto" | number =>
  value === "auto" || typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= 100;

function snapshotValue(snapshot: OwnedUiSessionSettingsSnapshot, key: OwnedUiSessionSettingKey): unknown {
  const values: Readonly<Partial<Record<OwnedUiSessionSettingKey, unknown>>> = snapshot;
  return values[key];
}

/** One validated setting; `seeded` also installs the snapshot's value at bind time. */
function setting<T>(
  owner: OwnedUiSettingOwner,
  key: OwnedUiSessionSettingKey,
  invalid: string,
  accepts: (value: unknown) => value is T,
  apply: (value: T) => void,
  seeded = true,
): SettingBinding {
  return {
    owner,
    key,
    live: value => {
      if (!accepts(value)) throw new TypeError(invalid);
      apply(value);
    },
    ...(seeded ? {
      seed: (snapshot: OwnedUiSessionSettingsSnapshot) => {
        const value = snapshotValue(snapshot, key);
        if (accepts(value)) apply(value);
      },
    } : {}),
  };
}

function settingBindings(
  targets: SessionSettingsTargets,
  snapshot: OwnedUiSessionSettingsSnapshot,
  customViewport: boolean,
  bare: boolean,
): readonly SettingBinding[] {
  const { root, terminal } = targets;
  let showImages = snapshot.showImages;
  let imageWidthCells = snapshot.imageWidthCells;
  const presentImages = () => root.setImagePresentation(showImages, imageWidthCells);
  return [
    // Invariant: bare A1 prints only the resume hint at exit, so the pinned exit-output
    // choice is hidden there and cannot be bound; the comparison profile binds and honors it.
    ...(bare ? [] : [{ owner: "shutdown" as const, key: "fullscreenExitOutput" as const, live: () => {} }]),
    setting("terminal", "showHardwareCursor", "Hardware cursor setting is invalid", isBoolean, value => terminal.setHardwareCursor(value)),
    setting("terminal", "clearOnShrink", "Clear-on-shrink setting is invalid", isBoolean, value => terminal.setClearOnShrink(value)),
    setting("terminal", "showTerminalProgress", "Terminal progress setting is invalid", isBoolean, value => targets.setTerminalProgress(value)),
    setting("shell", "editorPaddingX", "Editor padding is invalid", isNumber, value => root.setEditorPaddingX(value)),
    setting("shell", "autocompleteMaxVisible", "Autocomplete maximum is invalid", isNumber, value => root.setAutocompleteMaxVisible(value)),
    setting("shell", "outputPad", "Output padding is invalid", isOutputPad, value => root.setOutputPad(value)),
    setting("shell", "hideThinkingBlock", "Thinking-block visibility is invalid", isBoolean, value => root.setHideThinkingBlock(value)),
    setting("shell", "mermaidRenderingMode", "Mermaid mode is invalid", isMermaidMode, value => root.setMermaidRenderingMode(value)),
    setting("shell", "showImages", "Image visibility is invalid", isBoolean, value => { showImages = value; presentImages(); }, false),
    setting("shell", "imageWidthCells", "Image width is invalid", isImageWidth, value => { imageWidthCells = value; presentImages(); }, false),
    { owner: null, key: "imageWidthCells", live: () => {}, seed: presentImages },
    // Invariant: the custom viewport owns copy-on-select; the pinned comparison profile keeps Pi's wheel distance.
    customViewport
      ? setting("shell", "fullscreenCopyOnSelect", "Fullscreen copy-on-select setting is invalid", isBoolean, value => root.setFullscreenCopyOnSelect(value))
      : setting("shell", "fullscreenWheelScrollLines", "Fullscreen wheel-scroll distance is invalid", isWheelDistance, value => terminal.setWheelScrollLines(value), false),
    ...(customViewport ? [] : [{
      owner: null,
      key: "fullscreenCopyOnSelect" as const,
      live: () => {},
      seed: (initial: OwnedUiSessionSettingsSnapshot) => root.setFullscreenCopyOnSelect(initial.fullscreenCopyOnSelect),
    }]),
  ];
}

/**
 * Applies the snapshot's presentation settings, then binds every live setting effect the session
 * owns, one owner at a time. The returned function releases the owners in reverse; a failed bind
 * releases the owners already bound before it throws.
 */
export function bindSessionSettings(
  settings: Pick<OwnedUiSessionSettingsPort, "bindOwner" | "productMode">,
  snapshot: OwnedUiSessionSettingsSnapshot,
  targets: SessionSettingsTargets,
  options: { readonly customViewport: boolean },
): () => void {
  const bindings = settingBindings(targets, snapshot, options.customViewport, settings.productMode === "bare");
  for (const binding of bindings) binding.seed?.(snapshot);
  const owners = [...new Set(bindings.flatMap(binding => binding.owner === null ? [] : [binding.owner]))];
  const releases: (() => void)[] = [];
  const release = () => {
    for (const unbind of releases.splice(0).reverse()) unbind();
  };
  try {
    for (const owner of owners) {
      const handlers: OwnedUiSettingOwnerHandlers = {};
      for (const binding of bindings.filter(candidate => candidate.owner === owner)) {
        handlers[binding.key] = { apply: value => binding.live(value) };
      }
      releases.push(settings.bindOwner(owner, handlers));
    }
  } catch (error) {
    release();
    throw error;
  }
  return release;
}
