export type InstallerTarget =
  | { kind: "stable" }
  | { kind: "develop" }
  | { kind: "preview"; requested: string };

export function parseArguments(argv: string[]): { target: InstallerTarget; verbose: boolean; help: boolean };
export function installerHelp(): string;
export function renderProgressBar(percent: number): string;
export function classifyProgressLine(line: string, fallback?: string): string;
export function conciseFailure(stage: string, diagnostics: string): string;
export function resolvePublishedPreview(stdout: string, requested: string): string;
export function resolveInstallerNpmCli(environment: NodeJS.ProcessEnv): string;
export function consumeProcessLines(pending: string, chunk: string, callback?: (line: string) => void): string;
export function sanitizeDiagnostic(value: string): string;
export function runInstaller(argv: string[], options?: Record<string, unknown>): Promise<number>;
export function main(argv?: string[]): Promise<number>;
