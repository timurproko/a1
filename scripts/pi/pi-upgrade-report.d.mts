export const UPGRADE_STEPS: readonly string[];

export interface UpgradeStep { readonly name: string; readonly passed: boolean; readonly detail: string }

export interface UpgradeReport {
  readonly previous: { readonly version: string; readonly commit: string };
  readonly version: string;
  readonly commit: string | null;
  readonly steps: readonly UpgradeStep[];
  readonly merge: { readonly clean: readonly string[]; readonly conflicted: readonly string[]; readonly unchanged: readonly string[] };
  readonly inventories: { readonly reanchored: readonly string[]; readonly moved: readonly string[]; readonly orphaned: readonly string[]; readonly unmapped: readonly string[] };
  readonly changelog: string | null;
  readonly reviewItems: readonly string[];
}

export function changeId(version: string): string;
export function branchName(version: string): string;
export function renderUpgradeBody(report: UpgradeReport): string;
export function renderUpgradeChange(input: { previous: UpgradeReport["previous"]; version: string; commit: string; foundationSpec: string; date: string }): Record<string, string>;
