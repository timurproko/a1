import { wrapChoiceIndex, type TerminalComponentPort } from "../../contracts/presentation/index.js";
import { DialogPointer, type PaneMouseEvent, LineInput, handleLineInputKey, ShortcutRegistry, configureDialogChoiceCapacity, renderSteppedDialogPanel, type UiTheme } from "../../ui/components/index.js";

const APPS = [
  { id: "agent", label: "Agent" },
  { id: "settings", label: "Settings" },
  { id: "changelog", label: "Changelog" },
  { id: "hotkeys", label: "Hotkeys" },
] as const;
type AppId = typeof APPS[number]["id"];
const SCOPE = "apps";
const SHORTCUTS = new ShortcutRegistry<"previous" | "next" | "open" | "close">();
SHORTCUTS.declare({ key: "up", scope: SCOPE, description: "Previous app", hint: { keys: "↑↓", does: "navigate" } }, "previous");
SHORTCUTS.declare({ key: "down", scope: SCOPE, description: "Next app", hint: { keys: "↑↓", does: "navigate" } }, "next");
SHORTCUTS.declare({ key: "enter", scope: SCOPE, description: "Open app", hint: { keys: "Enter", does: "open" } }, "open");
SHORTCUTS.declare({ key: "escape", scope: SCOPE, description: "Close Launcher", hint: { keys: "Esc", does: "close" } }, "close");

/** A compact application chooser; actions return to the same session and never launch a process. */
export class AppsDialog implements TerminalComponentPort {
  readonly #input = new LineInput();
  #index = 0;
  readonly #pointer = new DialogPointer<number>();
  #visibleStart = 0;
  readonly ports: {
    theme(): UiTheme;
    height(): number;
    legacyKey(data: string): string;
    select(id: AppId): void;
    cancel(): void;
    requestRender(): void;
  };
  constructor(ports: AppsDialog["ports"]) { this.ports = ports; }

  #matches() { return APPS.filter(app => app.label.toLowerCase().includes(this.#input.value.toLowerCase())); }

  render(width: number): readonly string[] {
    const matches = this.#matches();
    const height = Math.max(1, this.ports.height());
    const compact = height < 12;
    const capacity = compact ? Math.max(1, height - 3) : configureDialogChoiceCapacity(height, true, 0);
    const start = Math.max(0, this.#index - capacity + 1);
    this.#visibleStart = start;
    if (matches.length === 0) this.#pointer.invalidate();
    return renderSteppedDialogPanel({
      ...(matches.length === 0 ? {} : { pointer: this.#pointer }),
      title: "Launcher", input: this.#input, compact,
      rows: matches.length === 0 ? [{ label: "No apps found", value: "" }]
        : matches.slice(start, start + capacity).map(app => ({ label: app.label, value: "" })),
      index: matches.length === 0 ? -1 : this.#index - start,
      hint: [{ key: "Type", action: "search" }, ...SHORTCUTS.hintEntries(SCOPE)],
    }, width, this.ports.theme()).slice(0, height);
  }

  clearMouseHover(): void { this.#pointer.clearHover(); }
  cancelDialog(): void { this.ports.cancel(); }

  handleLocalMouse(event: PaneMouseEvent): void {
    const clicked = this.#pointer.handle(event);
    if (clicked !== undefined) {
      const app = this.#matches()[this.#visibleStart + clicked];
      if (app !== undefined) this.ports.select(app.id);
    }
    this.ports.requestRender();
  }

  handleInput(data: string): void {
    this.#pointer.invalidate();
    const key = this.ports.legacyKey(data);
    const token = key === "\u001b[A" ? "up" : key === "\u001b[B" ? "down"
      : key === "\r" || key === "\n" ? "enter" : key === "\u001b" || key === "\u0003" ? "escape" : "edit";
    const action = SHORTCUTS.resolve(token, SCOPE);
    const matches = this.#matches();
    if (action === "close") { this.ports.cancel(); return; }
    if (action === "open") {
      const selected = matches[this.#index];
      if (selected !== undefined) this.ports.select(selected.id);
      return;
    }
    if (action === "previous" || action === "next") {
      this.#index = wrapChoiceIndex(this.#index, action === "next" ? 1 : -1, matches.length);
    } else {
      handleLineInputKey(this.#input, key);
      this.#index = 0;
    }
    this.ports.requestRender();
  }

  invalidate(): void { this.#pointer.invalidate(); }
}
