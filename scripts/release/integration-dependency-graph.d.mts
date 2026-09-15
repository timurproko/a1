import type { RevisionDependencySnapshot } from "./revision-dependencies.mjs";

export type DynamicDependencyKind = "computed-import" | "subprocess" | "worker" | "asset-read" | "opaque-loader";
export interface IntegrationDependencyPolicy {
  schema: "a1-integration-dependencies-v1";
  emittedRoot: string;
  sourceRoot: string;
  invalidators: string[];
  unrelated: string[];
  generated: { output: string; inputs: string[] }[];
  reviewed: { path: string; sha256: string; edges: string[]; handles: DynamicDependencyKind[]; reason: string }[];
}
export interface DependencyGraphLimits { nodes: number; edges: number; milliseconds: number }
export interface DependencyGraphStats { parsedModules: number; nodes: number; edges: number }
export interface DependencyIssue { code: string; path: string }
export interface DependencyTrace {
  reachable: Map<string, string | null>;
  issues: DependencyIssue[];
}
export interface IntegrationDependencyImpact {
  schema: "a1-integration-dependency-impact-v1";
  base: string;
  head: string;
  owners: {
    owner: string;
    selected: boolean;
    matches: { path: string; revision: string; chain: string[]; chainTruncated: boolean }[];
    matchesTruncated: boolean;
    invalidators: string[];
    issues: DependencyIssue[];
  }[];
  stats: { base: DependencyGraphStats; head: DependencyGraphStats };
}
/** Comparison evidence only, not authority to skip a workflow job. */
export function compareIntegrationDependencies(options: {
  base: RevisionDependencySnapshot;
  head: RevisionDependencySnapshot;
  changes: { status: string; path: string; oldPath?: string }[];
  owners: { id: string; entries: string[] }[];
  basePolicy: IntegrationDependencyPolicy;
  headPolicy?: IntegrationDependencyPolicy;
  limits?: Partial<DependencyGraphLimits>;
}): IntegrationDependencyImpact;
/** Caches parse results per immutable revision, including incomplete results. */
export function createIntegrationDependencyGraph(snapshot: RevisionDependencySnapshot, policy: IntegrationDependencyPolicy, options?: { limits?: Partial<DependencyGraphLimits> }): {
  stats: DependencyGraphStats;
  trace(entries: string[]): DependencyTrace;
};
