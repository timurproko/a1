export interface StartupPublicManifest {
  readonly schema: "a1-startup-public-artifact-v1";
  readonly publicEntry: string;
  readonly output: { readonly path: string; readonly bytes: number; readonly sha256: string };
  readonly external: readonly string[];
  readonly rewrittenConsumers: readonly string[];
  readonly licenses: readonly { readonly name: string; readonly version: string; readonly license: string }[];
  readonly totals: { readonly files: number; readonly loadedFiles: number; readonly sourceBytes: number; readonly evaluatedBytes: number };
  readonly inputs: readonly { readonly path: string; readonly group: string; readonly sourceBytes: number; readonly evaluatedBytes: number }[];
}
export function createStartupPublicManifest(options: {
  readonly generated: Uint8Array;
  readonly metafile: {
    readonly inputs: Readonly<Record<string, { readonly bytes: number }>>;
    readonly outputs?: Readonly<Record<string, { readonly entryPoint?: string; readonly inputs: Readonly<Record<string, { readonly bytesInOutput: number }>> }>>;
  };
  readonly entry: string;
  readonly external: readonly string[];
  readonly rewrittenConsumers: readonly string[];
  readonly licenses?: readonly { readonly name: string; readonly version: string; readonly license: string }[];
}): { readonly manifest: StartupPublicManifest; readonly serialized: string };
export function validateStartupPublicBaseline(manifest: StartupPublicManifest, baseline: {
  readonly schema: string;
  readonly piPublicArtifact: { readonly maximumLoadedFiles: number; readonly maximumEvaluatedBytes: number };
}): string[];
export function normalizeStartupInput(path: string): string;
export function startupInputGroup(path: string): "pi-public" | "pi-runtime" | "dependency" | "a1-generated-source";
