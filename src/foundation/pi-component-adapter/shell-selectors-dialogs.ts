import {
  ArminComponent,
  BorderedLoader,
  DynamicBorder,
  ExtensionSelectorComponent,
  getSelectListTheme,
  LoginDialogComponent,
  ModelSelectorComponent,
  OAuthSelectorComponent,
  SettingsSelectorComponent,
  ShowImagesSelectorComponent,
  type SessionInfo,
  type SessionTreeNode,
  type SettingsCallbacks,
  type SettingsConfig,
  ThemeSelectorComponent,
  ThinkingSelectorComponent,
  UserMessageSelectorComponent,
} from "@earendil-works/pi-coding-agent";
import {
  DaxnutsComponent,
} from "./upstream/components/daxnuts.js";
import {
  EarendilAnnouncementComponent,
} from "./upstream/components/earendil-announcement.js";
import {
  SessionSelectorComponent,
} from "./upstream/components/session-selector.js";
import {
  TreeSelectorComponent,
} from "./upstream/components/tree-selector.js";
import {
  Box,
  Container,
  SelectList,
  Spacer,
  Text,
  type SelectItem,
} from "#pi-tui";
import type {
  OwnedUiDialog,
} from "../owned-ui-contracts/index.js";
import {
  ScopedModelsSelectorComponent,
} from "./upstream/components/scoped-models-selector.js";
import {
  TrustSelectorComponent,
  type TrustDecision,
  type TrustOption,
  type TrustUpdate,
} from "./upstream/components/trust-selector.js";
import {
  PINNED_PI_LAYOUT,
  piTheme,
} from "./theme.js";
import {
  componentFromPort,
  componentPort,
  createTuiFacade,
  ensureTheme,
  isRecord,
  type PiShellComponentPort,
  type PiShellEditorOptions,
  type PiShellSelectorOption,
  type PiShellSelectorOptions,
} from "./shell-shared-facade.js";

export function createPiShellSelector(options: PiShellSelectorOptions): PiShellComponentPort {
  ensureTheme();
  const items = options.options.map(toSelectItem);
  const list = new SelectList(items, options.maxVisible ?? Math.min(PINNED_PI_LAYOUT.selectorMaxVisible, Math.max(1, items.length)), getSelectListTheme());
  if (options.onSelect !== undefined) list.onSelect = item => options.onSelect?.(item.value);
  if (options.onCancel !== undefined) list.onCancel = options.onCancel;
  if (!options.title) return componentPort(list);
  const container = new Container();
  container.addChild(new Text(piTheme().fg("accent", piTheme().bold(options.title)), PINNED_PI_LAYOUT.contentPaddingX, 0));
  container.addChild(list);
  return componentPort(container, data => list.handleInput(data));
}

export interface PiShellSettingsSelectorOptions {
  readonly config: SettingsConfig;
  readonly onChange: (callback: keyof SettingsCallbacks, value: unknown) => void;
  readonly onCancel: () => void;
}

export function createPiShellSettingsSelector(options: PiShellSettingsSelectorOptions): PiShellComponentPort {
  ensureTheme();
  const change = (name: keyof SettingsCallbacks) => (value?: unknown) => options.onChange(name, value);
  const callbacks: SettingsCallbacks = {
    onAutoCompactChange: change("onAutoCompactChange"),
    onShowImagesChange: change("onShowImagesChange"),
    onImageWidthCellsChange: change("onImageWidthCellsChange"),
    onAutoResizeImagesChange: change("onAutoResizeImagesChange"),
    onBlockImagesChange: change("onBlockImagesChange"),
    onEnableSkillCommandsChange: change("onEnableSkillCommandsChange"),
    onSteeringModeChange: change("onSteeringModeChange"),
    onFollowUpModeChange: change("onFollowUpModeChange"),
    onTransportChange: change("onTransportChange"),
    onHttpIdleTimeoutMsChange: change("onHttpIdleTimeoutMsChange"),
    onThinkingLevelChange: change("onThinkingLevelChange"),
    onThemeChange: change("onThemeChange"),
    onThemePreview: change("onThemePreview"),
    onHideThinkingBlockChange: change("onHideThinkingBlockChange"),
    onMermaidRenderingModeChange: change("onMermaidRenderingModeChange"),
    onShowCacheMissNoticesChange: change("onShowCacheMissNoticesChange"),
    onCollapseChangelogChange: change("onCollapseChangelogChange"),
    onEnableInstallTelemetryChange: change("onEnableInstallTelemetryChange"),
    onDoubleEscapeActionChange: change("onDoubleEscapeActionChange"),
    onTreeFilterModeChange: change("onTreeFilterModeChange"),
    onShowHardwareCursorChange: change("onShowHardwareCursorChange"),
    onEditorPaddingXChange: change("onEditorPaddingXChange"),
    onOutputPadChange: change("onOutputPadChange"),
    onAutocompleteMaxVisibleChange: change("onAutocompleteMaxVisibleChange"),
    onQuietStartupChange: change("onQuietStartupChange"),
    onDefaultProjectTrustChange: change("onDefaultProjectTrustChange"),
    onClearOnShrinkChange: change("onClearOnShrinkChange"),
    onShowTerminalProgressChange: change("onShowTerminalProgressChange"),
    onTuiModeChange: change("onTuiModeChange"),
    onFullscreenExitOutputChange: change("onFullscreenExitOutputChange"),
    onFullscreenScrollbarChange: change("onFullscreenScrollbarChange"),
    onWarningsChange: change("onWarningsChange"),
    onCancel: options.onCancel,
  };
  const selector = new SettingsSelectorComponent(options.config, callbacks);
  const settingsList = selector.getSettingsList();
  return componentPort(selector, data => settingsList.handleInput(data));
}

type PiModelSelectorArguments = ConstructorParameters<typeof ModelSelectorComponent>;

export interface PiShellModelSelectorOptions {
  readonly currentModel: unknown;
  readonly settingsManager: unknown;
  readonly modelRuntime: unknown;
  readonly scopedModels: readonly unknown[];
  readonly initialSearchInput?: string;
  readonly runtime: Pick<PiShellEditorOptions, "getColumns" | "getRows" | "requestRender">;
  readonly onSelect: PiModelSelectorArguments[5];
  readonly onCancel: () => void;
}

export function createPiShellModelSelector(options: PiShellModelSelectorOptions): PiShellComponentPort {
  ensureTheme();
  const selector = new ModelSelectorComponent(
    createTuiFacade(options.runtime),
    options.currentModel as PiModelSelectorArguments[1],
    options.settingsManager as PiModelSelectorArguments[2],
    options.modelRuntime as PiModelSelectorArguments[3],
    options.scopedModels as PiModelSelectorArguments[4],
    options.onSelect,
    options.onCancel,
    options.initialSearchInput,
  );
  return componentPort(selector);
}

export interface PiShellScopedModelDescriptor {
  readonly provider: string;
  readonly id: string;
  readonly name: string;
}

export interface PiShellScopedModelsSelectorOptions {
  readonly models: readonly PiShellScopedModelDescriptor[];
  readonly enabledModelIds: readonly string[] | null;
  readonly refreshStatus?: string;
  readonly onChange: (enabledModelIds: readonly string[] | null) => void | Promise<void>;
  readonly onPersist: (enabledModelIds: readonly string[] | null) => void | Promise<void>;
  readonly onCancel: () => void;
}

type PiScopedModel = ConstructorParameters<typeof ScopedModelsSelectorComponent>[0]["allModels"][number];

function toPiScopedModel(model: PiShellScopedModelDescriptor): PiScopedModel {
  const candidate: unknown = { provider: model.provider, id: model.id, name: model.name };
  if (!isPiScopedModel(candidate)) throw new TypeError("Pi scoped-model façade rejected malformed model metadata");
  return candidate;
}

function isPiScopedModel(value: unknown): value is PiScopedModel {
  return isRecord(value) && typeof value.provider === "string" && typeof value.id === "string" && typeof value.name === "string";
}

export interface PiShellScopedModelsSelectorPort extends PiShellComponentPort {
  updateModels(models: readonly PiShellScopedModelDescriptor[], enabledModelIds?: readonly string[] | null): void;
  setRefreshStatus(message: string, kind: "muted" | "success" | "warning"): void;
}

export function createPiShellScopedModelsSelector(options: PiShellScopedModelsSelectorOptions): PiShellScopedModelsSelectorPort {
  ensureTheme();
  const selector = new ScopedModelsSelectorComponent({
    allModels: options.models.map(toPiScopedModel),
    enabledModelIds: options.enabledModelIds === null ? null : [...options.enabledModelIds],
    ...(options.refreshStatus === undefined ? {} : { refreshStatus: options.refreshStatus }),
  }, {
    onChange: ids => options.onChange(ids),
    onPersist: ids => options.onPersist(ids),
    onCancel: options.onCancel,
  });
  return {
    ...componentPort(selector),
    updateModels(models, enabledModelIds) {
      selector.updateModels(models.map(toPiScopedModel), enabledModelIds === undefined
        ? undefined
        : enabledModelIds === null ? null : [...enabledModelIds]);
    },
    setRefreshStatus: (message, kind) => selector.setRefreshStatus(message, kind),
  };
}

export function createPiShellTrustSelector(options: {
  readonly cwd: string;
  readonly savedDecision: TrustDecision | null;
  readonly projectTrusted: boolean;
  readonly trustOptions: readonly TrustOption[];
  readonly onSelect: (selection: { readonly trusted: boolean; readonly updates: readonly TrustUpdate[] }) => void;
  readonly onCancel: () => void;
}): PiShellComponentPort {
  ensureTheme();
  return componentPort(new TrustSelectorComponent(options));
}

export function createPiShellSessionSelector(options: {
  readonly currentSessionsLoader: (onProgress?: (loaded: number, total: number) => void) => Promise<SessionInfo[]>;
  readonly allSessionsLoader: (onProgress?: (loaded: number, total: number) => void) => Promise<SessionInfo[]>;
  readonly onSelect: (path: string) => void;
  readonly onCancel: () => void;
  readonly onExit: () => void;
  readonly requestRender: () => void;
  readonly renameSession: (sessionFilePath: string, nextName: string | undefined) => Promise<void>;
  readonly currentSessionFilePath: string | undefined;
}): PiShellComponentPort {
  ensureTheme();
  const selector = new SessionSelectorComponent(
    options.currentSessionsLoader,
    options.allSessionsLoader,
    options.onSelect,
    options.onCancel,
    options.onExit,
    options.requestRender,
    { renameSession: options.renameSession, showRenameHint: true },
    options.currentSessionFilePath,
  );
  return componentPort(selector);
}

export function createPiShellTreeSelector(options: {
  readonly tree: readonly unknown[];
  readonly currentLeafId: string | null;
  readonly terminalHeight: number;
  readonly onSelect: (id: string) => void;
  readonly onCancel: () => void;
  readonly onLabelChange: (entryId: string, label: string | undefined) => void;
  readonly initialSelectedId?: string;
  readonly initialFilterMode?: "default" | "no-tools" | "user-only" | "labeled-only" | "all";
}): PiShellComponentPort {
  ensureTheme();
  return componentPort(new TreeSelectorComponent(
    [...options.tree] as SessionTreeNode[],
    options.currentLeafId,
    options.terminalHeight,
    options.onSelect,
    options.onCancel,
    options.onLabelChange,
    options.initialSelectedId,
    options.initialFilterMode,
  ));
}

export function createPiShellUserMessageSelector(
  messages: readonly PiShellSelectorOption[],
  onSelect: (id: string) => void,
  onCancel: () => void,
  initialSelectedId?: string,
): PiShellComponentPort {
  ensureTheme();
  const selector = new UserMessageSelectorComponent(
    messages.map(message => ({ id: message.id, text: message.label })),
    onSelect,
    onCancel,
    initialSelectedId,
  );
  const list = selector.getMessageList();
  return componentPort(selector, data => list.handleInput(data));
}

export interface PiShellLoginDialogPort extends PiShellComponentPort {
  showAuth(url: string, instructions?: string): void;
  showDeviceCode(info: { readonly verificationUri: string; readonly userCode: string }): void;
  showManualInput(message: string): Promise<string>;
  showPrompt(message: string, placeholder?: string): Promise<string>;
  showDetails(lines: readonly string[]): void;
  showInfo(message: string, links?: readonly { readonly label?: string; readonly url: string }[], showCloseHint?: boolean): void;
  showWaiting(message: string): void;
  showProgress(message: string): void;
}

export function createPiShellLoginDialog(
  runtime: Pick<PiShellEditorOptions, "getColumns" | "getRows" | "requestRender">,
  providerId: string,
  onComplete: (success: boolean, message?: string) => void,
  providerName?: string,
): PiShellLoginDialogPort {
  ensureTheme();
  const dialog = new LoginDialogComponent(createTuiFacade(runtime), providerId, onComplete, providerName);
  return {
    ...componentPort(dialog),
    showAuth: (url, instructions) => dialog.showAuth(url, instructions),
    showDeviceCode: info => dialog.showDeviceCode(info),
    showManualInput: message => dialog.showManualInput(message),
    showPrompt: (message, placeholder) => dialog.showPrompt(message, placeholder),
    showDetails: lines => dialog.showDetails([...lines]),
    showInfo: (message, links = [], showCloseHint = false) => dialog.showInfo(message, [...links], showCloseHint),
    showWaiting: message => dialog.showWaiting(message),
    showProgress: message => dialog.showProgress(message),
  };
}

export function createPiShellArmin(
  runtime: Pick<PiShellEditorOptions, "getColumns" | "getRows" | "requestRender">,
): PiShellComponentPort {
  ensureTheme();
  return componentPort(new ArminComponent(createTuiFacade(runtime)));
}

export function createPiShellDaxnuts(
  runtime: Pick<PiShellEditorOptions, "getColumns" | "getRows" | "requestRender">,
): PiShellComponentPort {
  ensureTheme();
  return componentPort(new DaxnutsComponent(createTuiFacade(runtime)));
}

export function createPiShellEarendilAnnouncement(): PiShellComponentPort {
  ensureTheme();
  return componentPort(new EarendilAnnouncementComponent());
}

export function createPiShellOperationLoader(
  runtime: Pick<PiShellEditorOptions, "getColumns" | "getRows" | "requestRender">,
  message: string,
): PiShellComponentPort {
  ensureTheme();
  return componentPort(new BorderedLoader(createTuiFacade(runtime), piTheme(), message));
}

export function createPiShellReloadBox(): PiShellComponentPort {
  ensureTheme();
  const container = new Container();
  const borderColor = (text: string) => piTheme().fg("border", text);
  container.addChild(new DynamicBorder(borderColor));
  container.addChild(new Spacer(1));
  container.addChild(new Text(piTheme().fg("muted", "Reloading keybindings, extensions, skills, prompts, themes, and context files..."), 1, 0));
  container.addChild(new Spacer(1));
  container.addChild(new DynamicBorder(borderColor));
  return componentPort(container);
}

export interface PiShellAuthProviderOption extends PiShellSelectorOption {
  readonly providerId: string;
  readonly authType: "oauth" | "api_key";
  readonly status?: {
    readonly type: "oauth" | "api_key";
    readonly source?: string;
  };
}

export function createPiShellAuthProviderSelector(
  mode: "login" | "logout",
  providers: readonly PiShellAuthProviderOption[],
  onSelect: (id: string) => void,
  onCancel: () => void,
): PiShellComponentPort {
  ensureTheme();
  const selector = new OAuthSelectorComponent(mode, providers.map(provider => ({
    id: provider.providerId,
    name: provider.label,
    authType: provider.authType,
    ...(provider.status === undefined ? {} : { status: provider.status }),
  })), (providerId, authType) => {
    const selected = providers.find(provider => provider.providerId === providerId && provider.authType === authType);
    if (selected) onSelect(selected.id);
  }, onCancel);
  return componentPort(selector);
}

export function createPiShellExtensionSelector(
  title: string,
  options: readonly string[],
  onSelect: (value: string) => void,
  onCancel: () => void,
): PiShellComponentPort {
  ensureTheme();
  return componentPort(new ExtensionSelectorComponent(title, [...options], onSelect, onCancel));
}

export function createPiShellThinkingSelector(
  currentLevel: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max",
  availableLevels: readonly ("off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max")[],
  onSelect: (level: string) => void,
  onCancel: () => void,
): PiShellComponentPort {
  ensureTheme();
  const selector = new ThinkingSelectorComponent(currentLevel, [...availableLevels], onSelect, onCancel);
  const list = selector.getSelectList();
  return componentPort(selector, data => list.handleInput(data));
}

export function createPiShellThemeSelector(
  currentTheme: string,
  onSelect: (theme: string) => void,
  onCancel: () => void,
  onPreview: (theme: string) => void,
): PiShellComponentPort {
  ensureTheme();
  const selector = new ThemeSelectorComponent(currentTheme, onSelect, onCancel, onPreview);
  const list = selector.getSelectList();
  return componentPort(selector, data => list.handleInput(data));
}

export function createPiShellShowImagesSelector(
  currentValue: boolean,
  onSelect: (show: boolean) => void,
  onCancel: () => void,
): PiShellComponentPort {
  ensureTheme();
  const selector = new ShowImagesSelectorComponent(currentValue, onSelect, onCancel);
  const list = selector.getSelectList();
  return componentPort(selector, data => list.handleInput(data));
}

export function createPiShellDialog(
  dialog: OwnedUiDialog,
  handlers: { readonly onSelect?: (id: string) => void; readonly onCancel?: () => void } = {},
): PiShellComponentPort {
  ensureTheme();
  const selector = createPiShellSelector({
    title: dialog.title,
    options: dialogOptions(dialog),
    maxVisible: 8,
    ...(handlers.onSelect === undefined ? {} : { onSelect: handlers.onSelect }),
    ...(handlers.onCancel === undefined ? {} : { onCancel: handlers.onCancel }),
  });
  const box = new Box(1, 1);
  box.addChild(componentFromPort(selector));
  return componentPort(box, data => selector.handleInput?.(data));
}


function toSelectItem(option: PiShellSelectorOption): SelectItem {
  return {
    value: option.id,
    label: option.label,
    ...(option.description === undefined ? {} : { description: option.description }),
  };
}

function dialogOptions(dialog: OwnedUiDialog): readonly PiShellSelectorOption[] {
  if (isRecord(dialog.payload) && Array.isArray(dialog.payload.options)) {
    const values = dialog.payload.options.filter(isRecord).flatMap(option => {
      if (typeof option.id !== "string" || typeof option.label !== "string") return [];
      return [{
        id: option.id,
        label: option.label,
        ...(typeof option.description === "string" ? { description: option.description } : {}),
      }];
    });
    if (values.length > 0) return values;
  }
  return [{ id: "accept", label: "Accept" }, { id: "cancel", label: "Cancel" }];
}

