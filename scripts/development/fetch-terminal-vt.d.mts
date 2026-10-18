export const TERMINAL_VT_PLATFORMS: readonly ["win32-x64", "linux-x64", "darwin-arm64"];
export const TERMINAL_VT_DIRECTORY: ".artifacts/terminal-vt";
export function terminalVtArtifact(artifacts: readonly { name?: unknown; expired?: boolean }[], platform: string): string | null;
export interface FetchedTerminalVt { runId: string; headSha: string; artifact: string; branch: string; target: string }
export function fetchTerminalVt(options?: {
  branches?: readonly string[];
  platform?: string;
  target?: string;
  log?: (message: string) => void;
  includeMergedDevelop?: boolean;
}): FetchedTerminalVt;
