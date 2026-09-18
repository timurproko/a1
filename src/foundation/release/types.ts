/**
 * Leaf types shared across the release subsystem. They live here so that the transaction store,
 * launch selection, and dependency layers can name them without importing the update command or
 * the release reader, which is what closed the subsystem's import cycles.
 */
export type UpdateChannel = "stable" | "next";

export interface DependencyLayerReference {
  readonly layerId: string;
  readonly contentDigest: string;
  readonly binding: "node_modules";
}
