export interface ReleaseTargetIdentity { platform: "win32" | "linux" | "darwin"; architecture: "x64" | "arm64"; zigTarget: string }
export const RELEASE_TARGETS: Readonly<Record<string, ReleaseTargetIdentity>>;
export const ZIG_BASELINE_CPU: "baseline";
export function addonLibraryName(crateName: string, platform: string): string;
export function parseTargetArgument(argv: readonly string[]): string | null;
export interface BuildTarget { triple: string | null; platform: string; architecture: string; cargoArguments: string[]; outputDirectory: string; cross: boolean }
export function resolveBuildTarget(options?: { argv?: readonly string[]; hostPlatform?: string; hostArchitecture?: string }): BuildTarget;
export function targetIdentity(triple: string): ReleaseTargetIdentity;
export function machoArchitecture(bytes: Uint8Array | Buffer | null | undefined): "x64" | "arm64" | null;
export interface NativeIdentityOptions {
  artifact: string;
  command: string;
  arguments_: string[];
  target: BuildTarget;
  execute: (command: string, arguments_: string[]) => { status: number | null; stdout?: string; error?: { code?: string } };
  readBytes: (path: string) => Buffer;
}
export type NativeIdentity = { check: "executed"; stdout: string } | { check: "mach-o-header"; stdout: null };
export function observeNativeIdentity(options: NativeIdentityOptions): NativeIdentity;
export function observeExecutableIdentity(options: Omit<NativeIdentityOptions, "artifact" | "command"> & { executable: string }): NativeIdentity;
export function observeAddonIdentity(options: Omit<NativeIdentityOptions, "artifact" | "command"> & { addon: string; loader?: string }): NativeIdentity;
