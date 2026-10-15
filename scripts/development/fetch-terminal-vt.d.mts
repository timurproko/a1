export const TERMINAL_VT_PLATFORMS: readonly ["win32-x64", "linux-x64", "darwin-arm64"];
export const TERMINAL_VT_DIRECTORY: ".artifacts/terminal-vt";
export function terminalVtArtifact(artifacts: readonly { name?: unknown; expired?: boolean }[], platform: string): string | null;
