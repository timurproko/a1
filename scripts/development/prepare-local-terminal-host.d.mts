export interface TerminalVtIdentity {
  schema: "a1-terminal-vt-v1";
  version: string;
  ghosttyCommit: string;
  cargoTarget: string;
  zigTarget: string;
  zigCpu: string;
}

export interface TerminalVtSelectionOptions {
  platform?: NodeJS.Platform;
  architecture?: string;
  environment?: NodeJS.ProcessEnv;
  cache?: string;
  branch?: string;
  fetch?: (options: { branches: readonly string[]; platform: string; target: string; includeMergedDevelop: boolean }) => { target: string };
}

export function expectedTerminalVtIdentity(platform?: NodeJS.Platform, architecture?: string): Promise<TerminalVtIdentity>;
export function terminalVtCacheCompatible(directory: string, expected: TerminalVtIdentity): Promise<boolean>;
export function selectLocalTerminalVt(options?: TerminalVtSelectionOptions): Promise<string | null>;
export function prepareLocalTerminalHost(options?: TerminalVtSelectionOptions): Promise<number>;
