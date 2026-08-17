/**
 * Adapted from @earendil-works/pi-coding-agent 0.84.2
 * packages/coding-agent/src/modes/interactive/components/extension-editor.ts (MIT).
 * Modifications: root public pi-tui singleton, owned keybindings/theme seam, owned external-editor import.
 */
import {
  Container,
  Editor,
  getKeybindings,
  Spacer,
  Text,
  type TUI,
} from "@earendil-works/pi-tui";
import { DynamicBorder, getSelectListTheme } from "@earendil-works/pi-coding-agent";
import type { KeybindingsManager } from "../adjacent/core/keybindings.js";
import { editInExternalEditor } from "../external-editor.js";
import { piTheme } from "../../theme.js";

type HintKey = "tui.select.confirm" | "tui.input.newLine" | "tui.select.cancel" | "app.editor.external";

function keyText(keybinding: HintKey): string {
  return getKeybindings().getKeys(keybinding as never).join("/");
}

function keyHint(keybinding: HintKey, description: string): string {
  return piTheme().fg("dim", keyText(keybinding)) + piTheme().fg("muted", ` ${description}`);
}

export class ExtensionEditorComponent extends Container {
  readonly #editor: Editor;
  readonly #tui: TUI;
  readonly #keybindings: KeybindingsManager;
  readonly #externalEditorCommand: string;
  readonly #onCancel: () => void;
  #focused = false;

  get focused(): boolean {
    return this.#focused;
  }

  set focused(value: boolean) {
    this.#focused = value;
    this.#editor.focused = value;
  }

  constructor(
    tui: TUI,
    keybindings: KeybindingsManager,
    title: string,
    prefill: string | undefined,
    onSubmit: (value: string) => void,
    onCancel: () => void,
    options?: { readonly paddingX?: number; readonly autocompleteMaxVisible?: number },
    externalEditorCommand?: string,
  ) {
    super();
    this.#tui = tui;
    this.#keybindings = keybindings;
    this.#onCancel = onCancel;
    this.#externalEditorCommand = externalEditorCommand
      || process.env.VISUAL
      || process.env.EDITOR
      || (process.platform === "win32" ? "notepad" : "nano");
    this.addChild(new DynamicBorder());
    this.addChild(new Spacer(1));
    this.addChild(new Text(piTheme().fg("accent", title), 1, 0));
    this.addChild(new Spacer(1));
    this.#editor = new Editor(tui, {
      borderColor: text => piTheme().fg("borderMuted", text),
      selectList: getSelectListTheme(),
    }, options);
    if (prefill) this.#editor.setText(prefill);
    this.#editor.onSubmit = onSubmit;
    this.addChild(this.#editor);
    this.addChild(new Spacer(1));
    const hint = keyHint("tui.select.confirm", "submit")
      + "  " + keyHint("tui.input.newLine", "newline")
      + "  " + keyHint("tui.select.cancel", "cancel")
      + "  " + keyHint("app.editor.external", "external editor");
    this.addChild(new Text(hint, 1, 0));
    this.addChild(new Spacer(1));
    this.addChild(new DynamicBorder());
  }

  handleInput(data: string): void {
    const keybindings = getKeybindings();
    if (keybindings.matches(data, "tui.select.cancel")) {
      this.#onCancel();
      return;
    }
    if (this.#keybindings.matches(data, "app.editor.external")) {
      void this.#handleOpenExternalEditor();
      return;
    }
    this.#editor.handleInput(data);
  }

  async #handleOpenExternalEditor(): Promise<void> {
    const content = this.#editor.getText();
    this.#tui.stop();
    try {
      const result = await editInExternalEditor({ command: this.#externalEditorCommand, content });
      if (result.status === "complete") this.#editor.setText(result.content);
    } finally {
      this.#tui.start();
      this.#tui.requestRender(true);
    }
  }
}
