export interface ReleaseTargetIdentity { platform: "win32" | "linux" | "darwin"; architecture: "x64" | "arm64"; zigTarget: string }
export const RELEASE_TARGETS: Readonly<Record<string, ReleaseTargetIdentity>>;
export const ZIG_BASELINE_CPU: "baseline";
export function parseTargetArgument(argv: readonly string[]): string | null;
export interface BuildTarget { triple: string | null; platform: string; architecture: string; cargoArguments: string[]; outputDirectory: string; cross: boolean }
export function resolveBuildTarget(options?: { argv?: readonly string[]; hostPlatform?: string; hostArchitecture?: string }): BuildTarget;
export function targetIdentity(triple: string): ReleaseTargetIdentity;
export function machoArchitecture(bytes: Uint8Array | Buffer | null | undefined): "x64" | "arm64" | null;
export function observeExecutableIdentity(options: {
  executable: string;
  arguments_: string[];
  target: BuildTarget;
  execute: (executable: string, arguments_: string[]) => { status: number | null; stdout?: string; error?: { code?: string } };
  readBytes: (path: string) => Buffer;
}): { check: "executed"; stdout: string } | { check: "mach-o-header"; stdout: null };
