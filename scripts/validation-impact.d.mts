export interface ChangedPath {
  status: string;
  path: string;
  previousPath?: string;
}

export interface ImpactPlan {
  schema: string;
  planningOnly: boolean;
  full: boolean;
  packageSensitive: boolean;
  selected: string[];
  owners: string[];
  changedTests: string[];
  changes: ChangedPath[];
  reasons: Array<{ path: string; status: string; previousPath?: string; rules: string[]; scopes: string[] }>;
  fallbacks: string[];
  base?: string | null;
  head?: string | null;
}

export function loadImpactManifest(repository?: string): Promise<Record<string, unknown>>;
export function selectImpactFromChanges(changes: ChangedPath[], options?: { repository?: string; manifest?: unknown; full?: boolean; required?: string[] }): Promise<ImpactPlan>;
export function selectGitImpact(options: { repository?: string; base?: string; head?: string; full?: boolean; required?: string[] }): Promise<ImpactPlan>;
export function parseNameStatus(output: string): ChangedPath[];
export function formatImpactSummary(plan: ImpactPlan): string;
export function matchesImpactPattern(pattern: string, path: string): boolean;
