/**
 * Provenance: @earendil-works/pi-coding-agent 0.87.1 (MIT), commit f07218c4d4bbc12bef056a7058c3dd49dfe41abe,
 * packages/coding-agent/src/modes/interactive/components/extension-editor.ts.
 * Modifications: Mechanical port: remap pi-tui to the root public singleton, use owned
 * keybindings/theme and external-editor seams, preserve editor layout, hints, focus, submission,
 * cancellation, and external-editor lifecycle; bare A1 uses the shared semantic modal shortcut row and
 * compact padded modal frame.
 * Deviations: owned-modal-shortcut-hints.
 */
import {
  Container,
  Editor,
  Spacer,
  Text,
  type TUI,
} from "@earendil-works/pi-tui";
import { DynamicBorder, getSelectListTheme } from "@earendil-works/pi-coding-agent";
import type { KeybindingsManager } from "../adjacent/core/keybindings.js";
import { editInExternalEditor } from "../external-editor.js";
import { addPiModalHeader, adoptPiModalFrame } from "../../modal-frame.js";
import { piTheme, renderPiModalShortcutHints } from "../../theme.js";

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
    options?: { readonly paddingX?: number; readonly autocompleteMaxVisible?: number; readonly description?: string },
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
    const { description, ...editorOptions } = options ?? {};
    const header = addPiModalHeader(this, new DynamicBorder(), new Text(piTheme().fg("accent", title), 0, 0));
    if (description) {
      this.addChild(new Spacer(1));
      this.addChild(new Text(piTheme().fg("text", description), 0, 0));
    }
    this.addChild(new Spacer(1));
    this.#editor = new Editor(tui, {
      borderColor: text => piTheme().fg("borderMuted", text),
      selectList: getSelectListTheme(),
    }, editorOptions);
    if (prefill) this.#editor.setText(prefill);
    this.#editor.onSubmit = onSubmit;
    this.addChild(this.#editor);
    this.addChild(new Spacer(1));
    const hint = renderPiModalShortcutHints([
      { key: this.#keybindings.getKeys("tui.select.confirm").join("/"), action: "submit" },
      { key: this.#keybindings.getKeys("tui.input.newLine").join("/"), action: "newline" },
      { key: this.#keybindings.getKeys("tui.select.cancel").join("/"), action: "cancel" },
      { key: this.#keybindings.getKeys("app.editor.external").join("/"), action: "external editor" },
    ]);
    this.addChild(new Text(hint, 0, 0));
    this.addChild(new Spacer(1));
    this.addChild(new DynamicBorder());
    adoptPiModalFrame(this, { topIndex: 0, bottomIndex: this.children.length - 1, header });
  }

  handleInput(data: string): void {
    if (this.#keybindings.matches(data, "tui.select.cancel")) {
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
