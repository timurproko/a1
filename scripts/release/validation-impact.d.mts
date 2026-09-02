export type RenderingImpactTier = "none" | "smoke" | "full";

export interface ValidationChange {
  readonly status: string;
  readonly score?: number;
  readonly oldPath?: string;
  readonly path: string;
}

export interface ValidationImpact {
  readonly schema: "a1-validation-impact-v1";
  readonly base: string;
  readonly head: string;
  readonly changes: readonly ValidationChange[];
  readonly docsOnly: boolean;
  readonly versionOnly: boolean;
  readonly openspecTouched: boolean;
  readonly ordinaryScopes: readonly string[];
  readonly rendering: {
    readonly tier: RenderingImpactTier;
    readonly reasons: readonly string[];
    readonly fallbacks: readonly string[];
    readonly changedPaths: readonly string[];
  };
  readonly documentation: { readonly required: boolean; readonly paths: readonly string[] };
  readonly timing: { readonly classifierMs: number };
}

export function parseNameStatusZ(value: string | Buffer): ValidationChange[];
export function collectCommitChanges(repository: string, base: string, head: string): Promise<ValidationChange[]>;
export function collectWorktreeChanges(repository: string): Promise<ValidationChange[]>;
export function selectValidationImpact(options?: {
  readonly repository?: string;
  readonly base?: string;
  readonly head?: string;
  readonly includeWorktree?: boolean;
}): Promise<ValidationImpact>;
export function assertValidationImpact(value: unknown): ValidationImpact;
export function classifyRenderingImpact(repository: string, base: string, head: string, changes: readonly ValidationChange[]): Promise<ValidationImpact["rendering"]>;
export function isDocumentationPolicyPath(path: string): boolean;
