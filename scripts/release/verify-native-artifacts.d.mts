export const RELEASE_NATIVE_TARGETS: readonly { readonly platform: "win32" | "linux" | "darwin"; readonly architecture: "x64" | "arm64" }[];
export function nativeArtifactProblems(
  nativeRoot: string,
  targets?: readonly { readonly platform: string; readonly architecture: string }[],
): Promise<string[]>;
