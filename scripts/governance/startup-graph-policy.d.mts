export interface StartupReachabilityModule {
  readonly path: string;
  readonly bytes: number;
  readonly chain: readonly string[];
}

export interface StartupReachabilityReport {
  readonly schema: "a1-startup-reachability-v1";
  readonly roots: readonly string[];
  readonly totals: { readonly files: number; readonly sourceBytes: number };
  readonly modules: readonly StartupReachabilityModule[];
  readonly edges: readonly { readonly from: string; readonly to: string }[];
  readonly errors: readonly string[];
}

export const STARTUP_ROOTS: readonly string[];
export const PROHIBITED_STARTUP_ENTRIES: ReadonlySet<string>;
export function inspectStartupReachability(root: string, options?: { readonly roots?: readonly string[] }): Promise<StartupReachabilityReport>;
export function validateStartupReachabilityBaseline(report: StartupReachabilityReport, baseline: {
  readonly schema: string;
  readonly a1Reachability: { readonly maximumFiles: number; readonly maximumSourceBytes: number; readonly optionalModules: readonly string[] };
}): string[];
export function runtimeRelativeImports(source: string): string[];
