import { ThinkingSelectorComponent } from "../startup-public.js";
import { OwnedThinkingSelectorComponent, type ThinkingSelectorLevel } from "./upstream/components/thinking-selector.js";
import { componentPort, ensureTheme, type PiShellComponentPort } from "./shell-shared-facade.js";

export interface PiShellThinkingSelectorPresentation {
  readonly profile: "bare";
  readonly cycleBinding: string | readonly string[];
}

function displayKeybinding(binding: string | readonly string[]): string {
  const keys = typeof binding === "string" ? [binding] : binding;
  return keys.map(key => key.split("+").map(part => {
    const display = process.platform === "darwin" && part.toLowerCase() === "alt" ? "option" : part;
    return display.charAt(0).toUpperCase() + display.slice(1);
  }).join("+")).join("/");
}

/** Lazily loaded because thinking-selector code does not belong to the startup graph before `/thinking` opens. */
export function createPiShellThinkingSelector(
  currentLevel: ThinkingSelectorLevel,
  availableLevels: readonly ThinkingSelectorLevel[],
  onSelect: (level: string) => void,
  onCancel: () => void,
  onSelectAsDefault?: (level: string) => void,
  defaultLevel?: ThinkingSelectorLevel,
  presentation?: PiShellThinkingSelectorPresentation,
): PiShellComponentPort {
  ensureTheme();
  if (presentation?.profile === "bare") {
    const cycleKey = displayKeybinding(presentation.cycleBinding);
    const selector = new OwnedThinkingSelectorComponent(
      currentLevel,
      [...availableLevels],
      onSelect,
      onCancel,
      cycleKey || "Unbound",
      onSelectAsDefault,
      defaultLevel,
    );
    return componentPort(selector, data => selector.handleInput(data));
  }
  const selector = new ThinkingSelectorComponent(currentLevel, [...availableLevels], onSelect, onCancel, onSelectAsDefault, defaultLevel);
  const list = selector.getSelectList();
  return componentPort(selector, data => list.handleInput(data));
}
