export interface InstallerTarget {
  kind: "stable" | "develop" | "version";
  version?: string;
}

export function parseArguments(argv: string[]): { target: InstallerTarget; verbose: boolean; help: boolean };
export function installerHelp(): string;
export function renderProgressBar(percent: number): string;
export function classifyProgressLine(line: string, fallback?: string): string;
export function conciseFailure(stage: string, diagnostics: string): string;
export function sanitizeDiagnostic(value: string): string;
export function runInstaller(argv: string[], options?: Record<string, unknown>): Promise<number>;
export function main(argv?: string[]): Promise<number>;
