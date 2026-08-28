import type { GithubRuleset } from "./github-rulesets.mjs";

export interface WorkflowGovernance {
  readonly name: string;
  readonly path: string;
  readonly state: string;
  readonly triggers: string[];
  readonly permissions: string[];
  readonly trustedSource: string;
  readonly authority: string[];
  readonly concurrency: string;
  readonly environments: string[];
  readonly artifactRetentionDays: number[];
}

export interface RepositoryGovernanceDefinition {
  readonly schema: string;
  readonly repository: string;
  readonly repositorySettings: Record<string, unknown>;
  readonly actions: Record<string, unknown>;
  readonly securityCapabilities: Record<string, unknown>;
  readonly environments: Array<Record<string, unknown> & { readonly name: string }>;
  readonly protectedRefs: string[];
  readonly rulesets: GithubRuleset[];
  readonly workflows: WorkflowGovernance[];
}

export function validateRepositoryGovernanceDefinition<T extends RepositoryGovernanceDefinition>(definition: T): T;
export function inspectLocalWorkflows(definition: RepositoryGovernanceDefinition, root?: string): Promise<WorkflowGovernance[]>;
export function inspectWorkflowSource(path: string, source: string): WorkflowGovernance;
export function compareRepositoryGovernance(definition: RepositoryGovernanceDefinition, live: Omit<RepositoryGovernanceDefinition, "schema" | "repository">): {
  readonly schema: string;
  readonly repository: string;
  readonly mode: string;
  readonly mutationPerformed: boolean;
  readonly matches: boolean;
  readonly differences: Array<{ readonly path: string; readonly expected: unknown; readonly actual: unknown; readonly reason: string }>;
};
