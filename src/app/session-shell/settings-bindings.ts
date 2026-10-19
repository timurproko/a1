import type {
  OwnedUiJsonValue,
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
  /** Rejects an invalid value with the message the owner reports; absent for an effect-free binding. */
  readonly invalid?: string;
  readonly accepts?: (value: OwnedUiJsonValue) => boolean;
  /** Installs a validated value; also applied once to the initial snapshot. */
  readonly apply: (value: never) => void;
  readonly initial: boolean;
}

const isBoolean = (value: OwnedUiJsonValue) => typeof value === "boolean";
const isNumber = (value: OwnedUiJsonValue) => typeof value === "number";

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
  const bindings: SettingBinding[] = [
    // Invariant: bare A1 prints only the resume hint at exit, so the pinned exit-output
    // choice is hidden there and cannot be bound; the comparison profile binds and honors it.
    ...(bare ? [] : [{ owner: "shutdown" as const, key: "fullscreenExitOutput" as const, apply: () => {}, initial: false }]),
    { owner: "terminal", key: "showHardwareCursor", invalid: "Hardware cursor setting is invalid", accepts: isBoolean, apply: (value: boolean) => terminal.setHardwareCursor(value), initial: true },
    { owner: "terminal", key: "clearOnShrink", invalid: "Clear-on-shrink setting is invalid", accepts: isBoolean, apply: (value: boolean) => terminal.setClearOnShrink(value), initial: true },
    { owner: "terminal", key: "showTerminalProgress", invalid: "Terminal progress setting is invalid", accepts: isBoolean, apply: (value: boolean) => targets.setTerminalProgress(value), initial: true },
    { owner: "shell", key: "editorPaddingX", invalid: "Editor padding is invalid", accepts: isNumber, apply: (value: number) => root.setEditorPaddingX(value), initial: true },
    { owner: "shell", key: "autocompleteMaxVisible", invalid: "Autocomplete maximum is invalid", accepts: isNumber, apply: (value: number) => root.setAutocompleteMaxVisible(value), initial: true },
    { owner: "shell", key: "outputPad", invalid: "Output padding is invalid", accepts: value => value === 0 || value === 1, apply: (value: 0 | 1) => root.setOutputPad(value), initial: true },
    { owner: "shell", key: "hideThinkingBlock", invalid: "Thinking-block visibility is invalid", accepts: isBoolean, apply: (value: boolean) => root.setHideThinkingBlock(value), initial: true },
    {
      owner: "shell", key: "mermaidRenderingMode", invalid: "Mermaid mode is invalid",
      accepts: value => value === "off" || value === "final" || value === "streaming",
      apply: (value: "off" | "final" | "streaming") => root.setMermaidRenderingMode(value), initial: true,
    },
    { owner: "shell", key: "showImages", invalid: "Image visibility is invalid", accepts: isBoolean, apply: (value: boolean) => { showImages = value; presentImages(); }, initial: false },
    {
      owner: "shell", key: "imageWidthCells", invalid: "Image width is invalid",
      accepts: value => typeof value === "number" && Number.isSafeInteger(value) && value >= 1,
      apply: (value: number) => { imageWidthCells = value; presentImages(); }, initial: false,
    },
    { owner: null, key: "imageWidthCells", apply: presentImages, initial: true },
    // Invariant: the custom viewport owns copy-on-select; the pinned comparison profile keeps Pi's wheel distance.
    customViewport
      ? { owner: "shell", key: "fullscreenCopyOnSelect", invalid: "Fullscreen copy-on-select setting is invalid", accepts: isBoolean, apply: (value: boolean) => root.setFullscreenCopyOnSelect(value), initial: true }
      : {
          owner: "shell", key: "fullscreenWheelScrollLines", invalid: "Fullscreen wheel-scroll distance is invalid",
          accepts: value => value === "auto" || typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= 100,
          apply: (value: "auto" | number) => terminal.setWheelScrollLines(value), initial: false,
        },
    ...(customViewport ? [] : [{ owner: null, key: "fullscreenCopyOnSelect" as const, apply: (value: boolean) => root.setFullscreenCopyOnSelect(value), initial: true }]),
  ];
  return bindings;
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
  for (const binding of bindings) {
    if (binding.initial) binding.apply(snapshot[binding.key as keyof OwnedUiSessionSettingsSnapshot] as never);
  }
  const owners = [...new Set(bindings.flatMap(binding => binding.owner === null ? [] : [binding.owner]))];
  const releases: (() => void)[] = [];
  const release = () => {
    for (const unbind of releases.splice(0).reverse()) unbind();
  };
  try {
    for (const owner of owners) {
      const handlers: OwnedUiSettingOwnerHandlers = {};
      for (const binding of bindings.filter(candidate => candidate.owner === owner)) {
        handlers[binding.key] = {
          apply: value => {
            if (binding.accepts !== undefined && !binding.accepts(value)) throw new TypeError(binding.invalid);
            binding.apply(value as never);
          },
        };
      }
      releases.push(settings.bindOwner(owner, handlers));
    }
  } catch (error) {
    release();
    throw error;
  }
  return release;
}
