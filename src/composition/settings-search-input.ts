import type {
  SettingsSearchInputFactory,
  SettingsSearchInputOptions,
} from "../features/owned-ui/settings-search-input.js";
import { editorInsertedText } from "../integrations/pi/components/owned-editor-ux.js";
import { createPiShellEditor } from "../integrations/pi/components/shell-editor-autocomplete.js";
import {
  piShellTruncateToWidth,
  piShellVisibleWidth,
  type PiKeybindingsHost,
} from "../integrations/pi/components/shell-shared-facade.js";
import { backgroundSgrSpan } from "../ui/components/spans.js";
import { caretCell } from "../ui/components/line-input.js";
import { paintTextSelection } from "../ui/components/text-selection.js";
import { PromptInput } from "../ui/components/prompt-input.js";

export interface SettingsSearchInputFactoryOptions {
  readonly keybindings?: PiKeybindingsHost;
  readonly agentDir?: string;
  readonly cwd?: string;
}

/** Builds Settings search from the same configurable owned editor used by the agent prompt. */
export function createSettingsSearchInputFactory(
  options: SettingsSearchInputFactoryOptions = {},
): SettingsSearchInputFactory {
  return {
    isTextInput: data => {
      const text = editorInsertedText(data);
      return text !== undefined && /[^\p{Cc}]/u.test(text);
    },
    create: surface => createSettingsSearchInput(surface, options),
  };
}

function createSettingsSearchInput(
  surface: SettingsSearchInputOptions,
  options: SettingsSearchInputFactoryOptions,
) {
  let columns = 80;
  const editor = createPiShellEditor({
    keybindingProfile: "a1",
    inputCapabilities: {
      singleLine: true,
      paste: false,
      autocomplete: false,
      placeholder: "Search settings",
    },
    ...(options.keybindings === undefined ? {} : { keybindings: options.keybindings }),
    ...(options.agentDir === undefined ? {} : { agentDir: options.agentDir }),
    cwd: options.cwd ?? process.cwd(),
    getColumns: () => columns,
    getRows: surface.getRows,
    requestRender: surface.requestRender,
    onSubmit: () => {},
    onCopyText: text => surface.copyText(text),
    paintEditorSelection: (line, from, to, atomic) => atomic
      ? backgroundSgrSpan(line, from, to, "\u001b[7m", "\u001b[27m", piShellVisibleWidth)
      : paintTextSelection(line, from, to, piShellVisibleWidth, true),
    promptPresentation: {
      input: new PromptInput({ fg: (token, text) => surface.theme.fg(token, text) }, {
        measure: piShellVisibleWidth,
        truncate: piShellTruncateToWidth,
      }),
      styleSuggestion: text => surface.theme.fg("dim", text),
      styleSuggestionCaret: caretCell,
    },
  });
  editor.setFocused?.(true);
  return {
    render(width: number) {
      columns = width;
      return editor.render(width);
    },
    handleInput: (data: string) => editor.handleInput?.(data),
    handlePointer: (event: Parameters<typeof editor.handlePointer>[0]) => editor.handlePointer(event),
    getText: () => editor.getText(),
    hasSelection: () => editor.hasSelection(),
    ownsPointer: () => editor.ownsPointer(),
    setFocused: (focused: boolean) => editor.setFocused?.(focused),
  };
}
