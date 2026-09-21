/**
 * Provenance: @earendil-works/pi-coding-agent 0.86.1 (MIT), commit 13cbf77df2396303013a41646bcfa77b4271ae56,
 * packages/coding-agent/src/modes/interactive/components/extension-editor.ts.
 * Modifications: Mechanical port: remap pi-tui to the root public singleton, use owned
 * keybindings/theme and external-editor seams, preserve editor layout, hints, focus, submission,
 * cancellation, and external-editor lifecycle.
 * Deviations: none.
 */
import {
  Container,
  Editor,
  Spacer,
  Text,
  type TUI,
} from "@earendil-works/pi-tui";
<<<<<<< a1
import { DynamicBorder, getSelectListTheme } from "@earendil-works/pi-coding-agent";
import type { KeybindingsManager } from "../adjacent/core/keybindings.js";
import { editInExternalEditor } from "../external-editor.js";
import { piTheme } from "../../theme.js";
||||||| pi 0.86.0
import type { KeybindingsManager } from "../../../core/keybindings.ts";
import { editInExternalEditor } from "../external-editor.ts";
import { getEditorTheme, theme } from "../theme/theme.ts";
import { DynamicBorder } from "./dynamic-border.ts";
import { keyHint } from "./keybinding-hints.ts";

export class ExtensionEditorComponent extends Container implements Focusable {
	private editor: Editor;
	private onSubmitCallback: (value: string) => void;
	private onCancelCallback: () => void;
	private tui: TUI;
	private keybindings: KeybindingsManager;
	private externalEditorCommand: string;

	private _focused = false;
	get focused(): boolean {
		return this._focused;
	}
	set focused(value: boolean) {
		this._focused = value;
		this.editor.focused = value;
	}

	constructor(
		tui: TUI,
		keybindings: KeybindingsManager,
		title: string,
		prefill: string | undefined,
		onSubmit: (value: string) => void,
		onCancel: () => void,
		options?: EditorOptions,
		externalEditorCommand?: string,
	) {
		super();

		this.tui = tui;
		this.keybindings = keybindings;
		this.externalEditorCommand =
			externalEditorCommand ||
			process.env.VISUAL ||
			process.env.EDITOR ||
			(process.platform === "win32" ? "notepad" : "nano");
		this.onSubmitCallback = onSubmit;
		this.onCancelCallback = onCancel;

		// Add top border
		this.addChild(new DynamicBorder());
		this.addChild(new Spacer(1));

		// Add title
		this.addChild(new Text(theme.fg("accent", title), 1, 0));
		this.addChild(new Spacer(1));
=======
import type { KeybindingsManager } from "../../../core/keybindings.ts";
import { editInExternalEditor } from "../external-editor.ts";
import { getEditorTheme, theme } from "../theme/theme.ts";
import { DynamicBorder } from "./dynamic-border.ts";
import { keyHint } from "./keybinding-hints.ts";

export interface ExtensionEditorOptions extends EditorOptions {
	description?: string;
}

export class ExtensionEditorComponent extends Container implements Focusable {
	private editor: Editor;
	private onSubmitCallback: (value: string) => void;
	private onCancelCallback: () => void;
	private tui: TUI;
	private keybindings: KeybindingsManager;
	private externalEditorCommand: string;

	private _focused = false;
	get focused(): boolean {
		return this._focused;
	}
	set focused(value: boolean) {
		this._focused = value;
		this.editor.focused = value;
	}

	constructor(
		tui: TUI,
		keybindings: KeybindingsManager,
		title: string,
		prefill: string | undefined,
		onSubmit: (value: string) => void,
		onCancel: () => void,
		options?: ExtensionEditorOptions,
		externalEditorCommand?: string,
	) {
		super();

		this.tui = tui;
		this.keybindings = keybindings;
		this.externalEditorCommand =
			externalEditorCommand ||
			process.env.VISUAL ||
			process.env.EDITOR ||
			(process.platform === "win32" ? "notepad" : "nano");
		this.onSubmitCallback = onSubmit;
		this.onCancelCallback = onCancel;
		const { description, ...editorOptions } = options ?? {};

		// Add top border
		this.addChild(new DynamicBorder());
		this.addChild(new Spacer(1));

		// Add title and optional description
		this.addChild(new Text(theme.fg("accent", title), 1, 0));
		if (description) {
			this.addChild(new Spacer(1));
			this.addChild(new Text(theme.fg("text", description), 1, 0));
		}
		this.addChild(new Spacer(1));
>>>>>>> pi 0.86.1

<<<<<<< a1
type HintKey = "tui.select.confirm" | "tui.input.newLine" | "tui.select.cancel" | "app.editor.external";
||||||| pi 0.86.0
		// Create editor
		this.editor = new Editor(tui, getEditorTheme(), options);
		if (prefill) {
			this.editor.setText(prefill);
		}
		// Wire up Enter to submit (Shift+Enter for newlines, like the main editor)
		this.editor.onSubmit = (text: string) => {
			this.onSubmitCallback(text);
		};
		this.addChild(this.editor);
=======
		// Create editor
		this.editor = new Editor(tui, getEditorTheme(), editorOptions);
		if (prefill) {
			this.editor.setText(prefill);
		}
		// Wire up Enter to submit (Shift+Enter for newlines, like the main editor)
		this.editor.onSubmit = (text: string) => {
			this.onSubmitCallback(text);
		};
		this.addChild(this.editor);
>>>>>>> pi 0.86.1

function keyHint(keybindings: KeybindingsManager, keybinding: HintKey, description: string): string {
  return piTheme().fg("dim", keybindings.getKeys(keybinding).join("/")) + piTheme().fg("muted", ` ${description}`);
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
    const hint = keyHint(this.#keybindings, "tui.select.confirm", "submit")
      + "  " + keyHint(this.#keybindings, "tui.input.newLine", "newline")
      + "  " + keyHint(this.#keybindings, "tui.select.cancel", "cancel")
      + "  " + keyHint(this.#keybindings, "app.editor.external", "external editor");
    this.addChild(new Text(hint, 1, 0));
    this.addChild(new Spacer(1));
    this.addChild(new DynamicBorder());
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
