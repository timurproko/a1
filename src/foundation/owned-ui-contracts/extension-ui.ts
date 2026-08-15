export const OWNED_UI_EXTENSION_CONTRACT_VERSION = 1 as const;

export const OWNED_UI_EXTENSION_UI_CALLBACKS = Object.freeze([
  "select",
  "confirm",
  "input",
  "notify",
  "onTerminalInput",
  "setStatus",
  "setWorkingMessage",
  "setWorkingVisible",
  "setWorkingIndicator",
  "setHiddenThinkingLabel",
  "setWidget",
  "setFooter",
  "setHeader",
  "setTitle",
  "custom",
  "pasteToEditor",
  "setEditorText",
  "getEditorText",
  "editor",
  "addAutocompleteProvider",
  "setEditorComponent",
  "getEditorComponent",
  "getAllThemes",
  "getTheme",
  "setTheme",
  "getToolsExpanded",
  "setToolsExpanded",
] as const);

export const OWNED_UI_EXTENSION_UI_PROPERTIES = Object.freeze(["theme"] as const);

export const OWNED_UI_EXTENSION_RENDER_CALLBACKS = Object.freeze([
  "tool.renderCall",
  "tool.renderResult",
  "message",
  "entry",
  "markdownTransformer",
] as const);

export type OwnedUiExtensionUiCallback = typeof OWNED_UI_EXTENSION_UI_CALLBACKS[number];
export type OwnedUiExtensionUiProperty = typeof OWNED_UI_EXTENSION_UI_PROPERTIES[number];
export type OwnedUiExtensionRenderCallback = typeof OWNED_UI_EXTENSION_RENDER_CALLBACKS[number];
export type OwnedUiExtensionNotificationSeverity = "info" | "warning" | "error";
export type OwnedUiExtensionWidgetPlacement = "aboveEditor" | "belowEditor";
export type OwnedUiExtensionSizeValue = number | `${number}%`;
export type OwnedUiExtensionOverlayAnchor =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "bottom-center"
  | "left-center"
  | "right-center";

export type OwnedUiExtensionThemeColor =
  | "accent"
  | "border"
  | "borderAccent"
  | "borderMuted"
  | "success"
  | "error"
  | "warning"
  | "muted"
  | "dim"
  | "text"
  | "thinkingText"
  | "userMessageText"
  | "customMessageText"
  | "customMessageLabel"
  | "toolTitle"
  | "toolOutput"
  | "mdHeading"
  | "mdLink"
  | "mdLinkUrl"
  | "mdCode"
  | "mdCodeBlock"
  | "mdCodeBlockBorder"
  | "mdQuote"
  | "mdQuoteBorder"
  | "mdHr"
  | "mdListBullet"
  | "toolDiffAdded"
  | "toolDiffRemoved"
  | "toolDiffContext"
  | "syntaxComment"
  | "syntaxKeyword"
  | "syntaxFunction"
  | "syntaxVariable"
  | "syntaxString"
  | "syntaxNumber"
  | "syntaxType"
  | "syntaxOperator"
  | "syntaxPunctuation"
  | "thinkingOff"
  | "thinkingMinimal"
  | "thinkingLow"
  | "thinkingMedium"
  | "thinkingHigh"
  | "thinkingXhigh"
  | "thinkingMax"
  | "bashMode";

export type OwnedUiExtensionThemeBackground =
  | "selectedBg"
  | "scrollbarThumb"
  | "userMessageBg"
  | "customMessageBg"
  | "toolPendingBg"
  | "toolSuccessBg"
  | "toolErrorBg";

export interface OwnedUiExtensionDialogOptions {
  readonly signal?: AbortSignal;
  readonly timeout?: number;
}

export interface OwnedUiExtensionWorkingIndicatorOptions {
  readonly frames?: readonly string[];
  readonly intervalMs?: number;
}

export interface OwnedUiExtensionWidgetOptions {
  readonly placement?: OwnedUiExtensionWidgetPlacement;
}

export interface OwnedUiExtensionOverlayMargin {
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly left?: number;
}

export interface OwnedUiExtensionOverlayOptions {
  readonly width?: OwnedUiExtensionSizeValue;
  readonly minWidth?: number;
  readonly maxHeight?: OwnedUiExtensionSizeValue;
  readonly anchor?: OwnedUiExtensionOverlayAnchor;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly row?: OwnedUiExtensionSizeValue;
  readonly col?: OwnedUiExtensionSizeValue;
  readonly margin?: OwnedUiExtensionOverlayMargin | number;
  readonly visible?: (columns: number, rows: number) => boolean;
  readonly nonCapturing?: boolean;
}

export interface OwnedUiExtensionComponent {
  render(width: number): readonly string[];
  invalidate(): void;
  handleInput?(data: string): void;
  readonly wantsKeyRelease?: boolean;
  dispose?(): void;
}

export interface OwnedUiExtensionEditorComponent extends OwnedUiExtensionComponent {
  getText(): string;
  setText(text: string): void;
  handleInput(data: string): void;
  onSubmit?: (text: string) => void;
  onChange?: (text: string) => void;
  addToHistory?(text: string): void;
  insertTextAtCursor?(text: string): void;
  getExpandedText?(): string;
  setAutocompleteProvider?(provider: OwnedUiExtensionAutocompleteProvider): void;
  borderColor?: (text: string) => string;
  setPaddingX?(padding: number): void;
  setAutocompleteMaxVisible?(maximum: number): void;
}

export interface OwnedUiExtensionThemePort {
  readonly name?: string;
  readonly sourcePath?: string;
  fg(color: OwnedUiExtensionThemeColor, text: string): string;
  bg(color: OwnedUiExtensionThemeBackground, text: string): string;
  bold(text: string): string;
  italic(text: string): string;
  underline(text: string): string;
  inverse(text: string): string;
  strikethrough(text: string): string;
  getFgAnsi(color: OwnedUiExtensionThemeColor): string;
  getBgAnsi(color: OwnedUiExtensionThemeBackground): string;
  getColorMode(): "truecolor" | "256color";
  getThinkingBorderColor(level: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max"): (text: string) => string;
  getBashModeBorderColor(): (text: string) => string;
}

export interface OwnedUiExtensionSelectListThemePort {
  readonly selectedPrefix: (text: string) => string;
  readonly selectedText: (text: string) => string;
  readonly description: (text: string) => string;
  readonly scrollInfo: (text: string) => string;
  readonly noMatch: (text: string) => string;
}

export interface OwnedUiExtensionEditorThemePort {
  readonly borderColor: (text: string) => string;
  readonly selectList: OwnedUiExtensionSelectListThemePort;
}

export interface OwnedUiExtensionKeybindingsPort {
  matches(data: string, keybinding: string): boolean;
  getKeys(keybinding: string): readonly string[];
  getDefinition(keybinding: string): unknown;
  getConflicts(): readonly { readonly key: string; readonly keybindings: readonly string[] }[];
  setUserBindings(bindings: Readonly<Record<string, string | readonly string[]>>): void;
  getUserBindings(): Readonly<Record<string, string | readonly string[]>>;
  getResolvedBindings(): Readonly<Record<string, string | readonly string[]>>;
}

export interface OwnedUiExtensionTerminalPort {
  readonly columns: number;
  readonly rows: number;
  readonly kittyProtocolActive: boolean;
  start(onInput: (data: string) => void, onResize: () => void): void;
  stop(): void;
  drainInput(maximumMilliseconds?: number, idleMilliseconds?: number): Promise<void>;
  write(data: string): void;
  moveBy(lines: number): void;
  hideCursor(): void;
  showCursor(): void;
  clearLine(): void;
  clearFromCursor(): void;
  clearScreen(): void;
  setTitle(title: string): void;
  setProgress(active: boolean): void;
}

export type OwnedUiExtensionInputListener = (data: string) => { readonly consume?: boolean; readonly data?: string } | undefined;

export interface OwnedUiExtensionRuntimePort extends OwnedUiExtensionComponent {
  readonly mode: "regular" | "fullscreen";
  readonly children: readonly OwnedUiExtensionComponent[];
  readonly terminal: OwnedUiExtensionTerminalPort;
  readonly fullRedraws: number;
  addChild(component: OwnedUiExtensionComponent): void;
  removeChild(component: OwnedUiExtensionComponent): void;
  clear(): void;
  getShowHardwareCursor(): boolean;
  setShowHardwareCursor(enabled: boolean): void;
  getClearOnShrink(): boolean;
  setClearOnShrink(enabled: boolean): void;
  setFocus(component: OwnedUiExtensionComponent | null): void;
  showOverlay(component: OwnedUiExtensionComponent, options?: OwnedUiExtensionOverlayOptions): OwnedUiExtensionOverlayHandle;
  hideOverlay(): void;
  hasOverlay(): boolean;
  start(): void;
  stop(options?: { readonly preserveScreen?: boolean }): void;
  renderNow(force?: boolean): void;
  requestRender(force?: boolean): void;
  addInputListener(listener: OwnedUiExtensionInputListener): () => void;
  removeInputListener(listener: OwnedUiExtensionInputListener): void;
  onTerminalColorSchemeChange(listener: (scheme: "dark" | "light") => void): () => void;
  setTerminalColorSchemeNotifications(enabled: boolean): void;
  queryTerminalBackgroundColor(options: { readonly timeoutMs: number }): Promise<{ readonly r: number; readonly g: number; readonly b: number } | undefined>;
  queryTerminalColorScheme(options: { readonly timeoutMs: number }): Promise<"dark" | "light" | undefined>;
}

export interface OwnedUiExtensionComponentFactoryContext {
  readonly runtime: OwnedUiExtensionRuntimePort;
  readonly theme: OwnedUiExtensionThemePort;
  readonly keybindings: OwnedUiExtensionKeybindingsPort;
}

export type OwnedUiExtensionComponentFactory = (
  context: OwnedUiExtensionComponentFactoryContext,
) => OwnedUiExtensionComponent | Promise<OwnedUiExtensionComponent>;

export type OwnedUiExtensionCustomFactory<T> = (
  context: OwnedUiExtensionComponentFactoryContext & { readonly done: (result: T) => void },
) => OwnedUiExtensionComponent | Promise<OwnedUiExtensionComponent>;

export type OwnedUiExtensionEditorFactory = (
  context: OwnedUiExtensionComponentFactoryContext & { readonly editorTheme: OwnedUiExtensionEditorThemePort },
) => OwnedUiExtensionEditorComponent;

export interface OwnedUiExtensionOverlayHandle {
  hide(): void;
  setHidden(hidden: boolean): void;
  isHidden(): boolean;
  focus(): void;
  unfocus(options?: { readonly target: OwnedUiExtensionComponent | null }): void;
  isFocused(): boolean;
}

export interface OwnedUiExtensionCustomOptions {
  readonly overlay?: boolean;
  readonly overlayOptions?: OwnedUiExtensionOverlayOptions | (() => OwnedUiExtensionOverlayOptions);
  readonly onHandle?: (handle: OwnedUiExtensionOverlayHandle) => void;
}

export interface OwnedUiExtensionAutocompleteItem {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

export interface OwnedUiExtensionAutocompleteSuggestions {
  readonly items: readonly OwnedUiExtensionAutocompleteItem[];
  readonly prefix: string;
}

export interface OwnedUiExtensionAutocompleteProvider {
  readonly triggerCharacters?: readonly string[];
  getSuggestions(
    lines: readonly string[],
    cursorLine: number,
    cursorColumn: number,
    options: { readonly signal: AbortSignal; readonly force?: boolean },
  ): Promise<OwnedUiExtensionAutocompleteSuggestions | null>;
  applyCompletion(
    lines: readonly string[],
    cursorLine: number,
    cursorColumn: number,
    item: OwnedUiExtensionAutocompleteItem,
    prefix: string,
  ): { readonly lines: readonly string[]; readonly cursorLine: number; readonly cursorColumn: number };
  shouldTriggerFileCompletion?(lines: readonly string[], cursorLine: number, cursorColumn: number): boolean;
}

export type OwnedUiExtensionAutocompleteProviderFactory = (
  current: OwnedUiExtensionAutocompleteProvider,
) => OwnedUiExtensionAutocompleteProvider;

export interface OwnedUiExtensionFooterDataPort {
  getGitBranch(): string | null;
  getExtensionStatuses(): ReadonlyMap<string, string>;
  getAvailableProviderCount(): number;
  onBranchChange(listener: () => void): () => void;
}

export type OwnedUiExtensionFooterFactory = (
  context: OwnedUiExtensionComponentFactoryContext,
  footerData: OwnedUiExtensionFooterDataPort,
) => OwnedUiExtensionComponent;

export interface OwnedUiExtensionThemeInfo {
  readonly name: string;
  readonly path: string | undefined;
}

export interface OwnedUiExtensionUiPort {
  select(title: string, options: readonly string[], opts?: OwnedUiExtensionDialogOptions): Promise<string | undefined>;
  confirm(title: string, message: string, opts?: OwnedUiExtensionDialogOptions): Promise<boolean>;
  input(title: string, placeholder?: string, opts?: OwnedUiExtensionDialogOptions): Promise<string | undefined>;
  notify(message: string, type?: OwnedUiExtensionNotificationSeverity): void;
  onTerminalInput(handler: (data: string) => { readonly consume?: boolean; readonly data?: string } | undefined): () => void;
  setStatus(key: string, text: string | undefined): void;
  setWorkingMessage(message?: string): void;
  setWorkingVisible(visible: boolean): void;
  setWorkingIndicator(options?: OwnedUiExtensionWorkingIndicatorOptions): void;
  setHiddenThinkingLabel(label?: string): void;
  setWidget(
    key: string,
    content: readonly string[] | OwnedUiExtensionComponentFactory | undefined,
    options?: OwnedUiExtensionWidgetOptions,
  ): void;
  setFooter(factory: OwnedUiExtensionFooterFactory | undefined): void;
  setHeader(factory: OwnedUiExtensionComponentFactory | undefined): void;
  setTitle(title: string): void;
  custom<T>(factory: OwnedUiExtensionCustomFactory<T>, options?: OwnedUiExtensionCustomOptions): Promise<T>;
  pasteToEditor(text: string): void;
  setEditorText(text: string): void;
  getEditorText(): string;
  editor(title: string, prefill?: string): Promise<string | undefined>;
  addAutocompleteProvider(factory: OwnedUiExtensionAutocompleteProviderFactory): void;
  setEditorComponent(factory: OwnedUiExtensionEditorFactory | undefined): void;
  getEditorComponent(): OwnedUiExtensionEditorFactory | undefined;
  readonly theme: OwnedUiExtensionThemePort;
  getAllThemes(): readonly OwnedUiExtensionThemeInfo[];
  getTheme(name: string): OwnedUiExtensionThemePort | undefined;
  setTheme(theme: string | OwnedUiExtensionThemePort): { readonly success: boolean; readonly error?: string };
  getToolsExpanded(): boolean;
  setToolsExpanded(expanded: boolean): void;
}

export interface OwnedUiExtensionMessageRenderInput {
  readonly customType: string;
  readonly content: unknown;
  readonly display: boolean;
  readonly details?: unknown;
}

export interface OwnedUiExtensionEntryRenderInput {
  readonly customType: string;
  readonly data?: unknown;
}

export interface OwnedUiExtensionToolRenderContext {
  readonly args: unknown;
  readonly toolCallId: string;
  readonly state: unknown;
  readonly lastComponent: OwnedUiExtensionComponent | undefined;
  readonly cwd: string;
  readonly executionStarted: boolean;
  readonly argsComplete: boolean;
  readonly isPartial: boolean;
  readonly expanded: boolean;
  readonly showImages: boolean;
  readonly isError: boolean;
  invalidate(): void;
}

export interface OwnedUiExtensionRendererPort {
  renderMessage(
    message: OwnedUiExtensionMessageRenderInput,
    options: { readonly expanded: boolean; readonly outputPad: number },
    theme: OwnedUiExtensionThemePort,
  ): OwnedUiExtensionComponent | undefined;
  renderEntry(
    entry: OwnedUiExtensionEntryRenderInput,
    options: { readonly expanded: boolean },
    theme: OwnedUiExtensionThemePort,
  ): OwnedUiExtensionComponent | undefined;
  transformMarkdown(
    markdown: string,
    context: { readonly messageType: "user" | "assistant" | "assistant-thinking"; readonly isStreaming: boolean; readonly availableWidth: number },
  ): string;
  renderToolCall(args: unknown, theme: OwnedUiExtensionThemePort, context: OwnedUiExtensionToolRenderContext): OwnedUiExtensionComponent;
  renderToolResult(
    result: unknown,
    options: { readonly expanded: boolean; readonly isPartial: boolean },
    theme: OwnedUiExtensionThemePort,
    context: OwnedUiExtensionToolRenderContext,
  ): OwnedUiExtensionComponent;
}

export function assertOwnedUiExtensionUiPort(value: unknown): asserts value is OwnedUiExtensionUiPort {
  if (!isRecord(value)) throw new TypeError("owned-UI extension UI port must be an object");
  for (const callback of OWNED_UI_EXTENSION_UI_CALLBACKS) {
    if (typeof value[callback] !== "function") throw new TypeError(`owned-UI extension UI callback is missing: ${callback}`);
  }
  if (!isRecord(value.theme)) throw new TypeError("owned-UI extension theme port is missing");
  for (const callback of [
    "fg",
    "bg",
    "bold",
    "italic",
    "underline",
    "inverse",
    "strikethrough",
    "getFgAnsi",
    "getBgAnsi",
    "getColorMode",
    "getThinkingBorderColor",
    "getBashModeBorderColor",
  ]) {
    if (typeof value.theme[callback] !== "function") throw new TypeError(`owned-UI extension theme callback is missing: ${callback}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
