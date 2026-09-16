export interface StartupDescriptor {
  readonly schema: "a1-startup-descriptor-v1";
  readonly entries: readonly string[];
  readonly generatedArtifact: { readonly path: string; readonly sha256: string };
  readonly dependencyLayerIdentity: {
    readonly source: "A1_RELEASE_LAYERS";
    readonly encoding: "ordered-comma-separated-layer-ids-v1";
  };
  readonly compileCacheNamespace: {
    readonly strategy: "node-abi-version-and-ordered-layer-sha256-v1";
  };
  readonly identity: string;
}

export const STARTUP_EAGER_ENTRIES: readonly string[];
export function createStartupDescriptor(input: {
  readonly artifact: { readonly path: string; readonly sha256: string };
  readonly entries?: readonly string[];
}): StartupDescriptor;
export function serializeStartupDescriptor(descriptor: StartupDescriptor): string;
