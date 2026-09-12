import type { NamingPolicy } from "./naming-source-policy.mjs";
import type { ProductIdentifierFinding } from "./product-identifier-policy.mjs";
export interface NamingFindings { readonly internal: readonly ProductIdentifierFinding[]; readonly external: readonly ProductIdentifierFinding[] }
export function inspectScriptNames(path: string, source: string, policy: NamingPolicy): NamingFindings;
export function inspectShellNames(path: string, source: string, policy: NamingPolicy): NamingFindings;
export function inspectConfigurationNames(path: string, source: string, policy: NamingPolicy): NamingFindings;
export function inspectPythonNames(path: string, source: string, policy: NamingPolicy): NamingFindings;
export function inspectNamingSource(path: string, source: string, policy: NamingPolicy): NamingFindings;
