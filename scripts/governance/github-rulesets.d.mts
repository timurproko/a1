export interface GithubRulesetDefinition { schema: string; repository: string; rulesets: GithubRuleset[] }
export interface GithubRuleset { id?: number; name: string; target: string; enforcement: string; bypass_actors: unknown[]; conditions: { ref_name: { include: string[]; exclude: string[] } }; rules: Array<{ type: string; parameters?: Record<string, any> }> }
export interface GithubRulesetPlan { schema: string; repository: string; mode: string; mutationPerformed: boolean; changes: Array<{ name: string; action: "create" | "update" | "none"; id?: number; desired: GithubRuleset; live?: GithubRuleset }>; summary: { create: number; update: number; unchanged: number } }
export function validateRulesetDefinition(definition: GithubRulesetDefinition): GithubRulesetDefinition;
export function planRulesetChanges(definition: GithubRulesetDefinition, liveRulesets: GithubRuleset[]): GithubRulesetPlan;
export function normalizeRuleset(ruleset: GithubRuleset): GithubRuleset;
