/**
 * Provenance: @earendil-works/pi-coding-agent 1.5.0 (MIT), commit f9a26365568127461c47a07a37dcb42c140a3ac5,
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
<<<<<<< a1
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import type { KeybindingsManager } from "../adjacent/core/keybindings.js";
import { editInExternalEditor } from "../external-editor.js";
import { addPiModalHeader, adoptPiModalFrame } from "../../modal-frame.js";
import { DIALOG_CLOSE_SHORTCUT_HINT, getPiSelectListTheme, paintPiBorder, piTheme, renderPiModalShortcutHints } from "../../theme.js";

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
    const header = addPiModalHeader(this, new DynamicBorder(paintPiBorder), new Text(piTheme().fg("accent", title), 0, 0));
    if (description) {
      this.addChild(new Spacer(1));
      this.addChild(new Text(piTheme().fg("text", description), 0, 0));
    }
    this.addChild(new Spacer(1));
    this.#editor = new Editor(tui, {
      borderColor: text => piTheme().fg("borderMuted", text),
      selectList: getPiSelectListTheme(),
    }, editorOptions);
    if (prefill) this.#editor.setText(prefill);
    this.#editor.onSubmit = onSubmit;
    this.addChild(this.#editor);
    this.addChild(new Spacer(1));
    const hint = renderPiModalShortcutHints([
      { key: this.#keybindings.getKeys("tui.select.confirm").join("/"), action: "submit" },
      { key: this.#keybindings.getKeys("tui.input.newLine").join("/"), action: "newline" },
      { key: this.#keybindings.getKeys("app.editor.external").join("/"), action: "external editor" },
      DIALOG_CLOSE_SHORTCUT_HINT,
    ]);
    this.addChild(new Text(hint, 0, 0));
    this.addChild(new Spacer(1));
    this.addChild(new DynamicBorder(paintPiBorder));
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
||||||| pi 1.4.0
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

		this.addChild(new Spacer(1));

		// Add hint
		const hint =
			keyHint("tui.select.confirm", "submit") +
			"  " +
			keyHint("tui.input.newLine", "newline") +
			"  " +
			keyHint("tui.select.cancel", "cancel") +
			`  ${keyHint("app.editor.external", "external editor")}`;
		this.addChild(new Text(hint, 1, 0));

		this.addChild(new Spacer(1));

		// Add bottom border
		this.addChild(new DynamicBorder());
	}

	handleInput(keyData: string): void {
		const kb = getKeybindings();
		// Escape or Ctrl+C to cancel
		if (kb.matches(keyData, "tui.select.cancel")) {
			this.onCancelCallback();
			return;
		}

		// External editor (app keybinding)
		if (this.keybindings.matches(keyData, "app.editor.external")) {
			void this.handleOpenExternalEditor();
			return;
		}

		// Forward to editor
		this.editor.handleInput(keyData);
	}

	private async handleOpenExternalEditor(): Promise<void> {
		const content = this.editor.getText();
		this.tui.stop();
		try {
			const result = await editInExternalEditor({
				command: this.externalEditorCommand,
				content,
			});
			if (result.status === "complete") {
				this.editor.setText(result.content);
			}
		} finally {
			this.tui.start();
			this.tui.requestRender(true);
		}
	}
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
	/** Shows external editor failures; renders nothing while empty. */
	private externalEditorStatus = new Text("", 1, 0);

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
		this.addChild(this.externalEditorStatus);

		this.addChild(new Spacer(1));

		// Add hint
		const hint =
			keyHint("tui.select.confirm", "submit") +
			"  " +
			keyHint("tui.input.newLine", "newline") +
			"  " +
			keyHint("tui.select.cancel", "cancel") +
			`  ${keyHint("app.editor.external", "external editor")}`;
		this.addChild(new Text(hint, 1, 0));

		this.addChild(new Spacer(1));

		// Add bottom border
		this.addChild(new DynamicBorder());
	}

	handleInput(keyData: string): void {
		const kb = getKeybindings();
		// Escape or Ctrl+C to cancel
		if (kb.matches(keyData, "tui.select.cancel")) {
			this.onCancelCallback();
			return;
		}

		// External editor (app keybinding)
		if (this.keybindings.matches(keyData, "app.editor.external")) {
			void this.handleOpenExternalEditor();
			return;
		}

		// Forward to editor
		this.editor.handleInput(keyData);
	}

	private async handleOpenExternalEditor(): Promise<void> {
		const content = this.editor.getText();
		this.tui.stop();
		try {
			const result = await editInExternalEditor({
				command: this.externalEditorCommand,
				content,
			});
			this.externalEditorStatus.setText(result.status === "failed" ? theme.fg("warning", result.message) : "");
			if (result.status === "complete") {
				this.editor.setText(result.content);
			}
		} finally {
			this.tui.start();
			this.tui.requestRender(true);
		}
	}
>>>>>>> pi 1.5.0
}
