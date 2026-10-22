export const MSVC_COMPONENT: "Microsoft.VisualStudio.Component.VC.Tools.x86.x64";
export const VCVARS_SENTINEL: "__A1_VCVARS_ENVIRONMENT__";

export interface NativeToolResolution {
  readonly status: string;
  readonly source: string;
  readonly path: string | null;
}
export interface MsvcResolution {
  readonly status: string;
  readonly source: string;
  readonly compiler?: string | null;
  readonly linker?: string | null;
  readonly tools?: string | null;
  readonly sdk?: string | null;
  readonly reason?: string | null;
  readonly probeStatus?: string;
  readonly ready?: boolean;
}
export interface NativeBuildEnvironment {
  readonly environment: NodeJS.ProcessEnv;
  readonly cargo: NativeToolResolution;
  readonly rustc: NativeToolResolution;
  readonly msvc: MsvcResolution;
}
export interface NativeEnvironmentOptions {
  readonly platform?: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly exists?: (path: string) => boolean;
  readonly locate?: (command: string, options?: { platform?: string; env?: NodeJS.ProcessEnv; exists?: (path: string) => boolean }) => string | null;
  readonly spawn?: (...arguments_: any[]) => { status?: number | null; stdout?: string; error?: { code?: string } };
}
export function resolveWindowsRust(environment: NodeJS.ProcessEnv, options?: NativeEnvironmentOptions): {
  environment: NodeJS.ProcessEnv;
  cargo: NativeToolResolution;
  rustc: NativeToolResolution;
};
export function inspectMsvcEnvironment(environment: NodeJS.ProcessEnv, options?: NativeEnvironmentOptions): MsvcResolution & { ready: boolean };
export function parseVcvarsEnvironment(stdout: unknown, sentinel?: string): NodeJS.ProcessEnv | null;
export function resolveWindowsMsvc(environment: NodeJS.ProcessEnv, options?: NativeEnvironmentOptions): {
  environment: NodeJS.ProcessEnv;
  msvc: MsvcResolution;
};
export function requireNativeBuildEnvironment(resolved: NativeBuildEnvironment): NodeJS.ProcessEnv;
export function resolveNativeBuildEnvironment(options?: NativeEnvironmentOptions): NativeBuildEnvironment;
