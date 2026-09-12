export interface EnvironmentDefinition { readonly role: string; readonly key: string; readonly exposure: string; readonly owner: string; readonly evidence: string; readonly semantics: string }
export interface NamingPolicy { readonly schema: string; readonly environment: readonly EnvironmentDefinition[]; readonly externalMembers: readonly { readonly name: string; readonly path: string; readonly reason: string }[] }
export interface NamingSelection { readonly required: boolean; readonly mode: "none" | "changed" | "full"; readonly paths: readonly string[]; readonly reasons: readonly string[]; readonly exclusions: readonly { readonly path: string; readonly reason: string }[] }
export const NAMING_POLICY_PATH: string;
export const SCRIPT_EXTENSIONS: ReadonlySet<string>;
export function namingSourceRole(path: string): string;
export function isNamingInput(path: string): boolean;
export function selectNamingImpact(changes: readonly { readonly path: string; readonly status: string; readonly oldPath?: string }[]): NamingSelection;
export function validateNamingPolicy(value: unknown): NamingPolicy;
