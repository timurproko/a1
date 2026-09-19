export declare const SETTINGS_SELECTOR_PATH: string;
export declare function settingsSelectorSource(packagesRoot?: string): string;

export interface PiSettingFlag {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly fallback: boolean;
}

export interface PiSettingPresentation {
  readonly label: string;
  readonly description: string;
  readonly opensDialog: boolean;
  readonly values?: readonly string[];
  readonly literalValue?: string;
}

export interface PiSettingsMetadata {
  readonly presented: readonly string[];
  readonly order: readonly string[];
  readonly settings: Readonly<Record<string, PiSettingPresentation>>;
  readonly dialogs: Readonly<Record<string, readonly PiSettingFlag[]>>;
  readonly bounds: Readonly<Record<string, { readonly minimum: number; readonly maximum?: number }>>;
}

export declare function extractPiSettingsMetadata(packagesRoot?: string): PiSettingsMetadata;
