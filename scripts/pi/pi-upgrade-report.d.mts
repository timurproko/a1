export const UPGRADE_STEPS: readonly string[];
export const REFRESH_STEPS: readonly string[];
export const MARKER_BLOCKED_STEPS: readonly string[];
export const REPORT_START: string;
export const REPORT_END: string;

export type UpgradeStepStatus = "passed" | "failed" | "blocked" | "skipped";

export interface UpgradeStep { readonly name: string; readonly status: UpgradeStepStatus | string; readonly detail: string }

export interface PublicApiDeltaRecord { readonly package: string; readonly name: string; readonly kind: string; readonly consumers: readonly string[] }

export interface UpgradeReport {
  readonly mode?: "propose" | "refresh" | string;
  readonly refreshedAt?: string;
  readonly previous: { readonly version: string; readonly commit: string };
  readonly version: string;
  readonly commit: string | null;
  readonly steps: readonly UpgradeStep[];
  readonly merge: {
    readonly clean: readonly string[];
    readonly conflicted: readonly string[];
    readonly unchanged: readonly string[];
    readonly kept?: readonly { readonly path: string; readonly lines: number }[];
  };
  readonly inventories: { readonly reanchored: readonly string[]; readonly moved: readonly string[]; readonly orphaned: readonly string[]; readonly unmapped: readonly string[] };
  readonly publicApi: { readonly added: readonly PublicApiDeltaRecord[]; readonly removed: readonly PublicApiDeltaRecord[]; readonly changed: readonly PublicApiDeltaRecord[] } | null;
  readonly features: { readonly created: readonly { readonly id: string; readonly feature: string; readonly summary?: string }[]; readonly retired: readonly string[]; readonly pending: readonly string[] } | null;
  readonly compile: readonly { readonly path: string; readonly errors: number; readonly codes: readonly string[]; readonly first: string }[] | null;
  readonly changelog: string | null;
  readonly reviewItems: readonly string[];
}

export function changeId(version: string): string;
export function branchName(version: string): string;
export function branchVersion(branch: string | null | undefined): string | null;
export function renderUpgradeBody(report: UpgradeReport): string;
export function renderUpgradeReport(report: UpgradeReport): string;
export function refreshUpgradeBody(existingBody: string | null | undefined, report: UpgradeReport): string;
export function renderUpgradeComment(report: UpgradeReport, options: { readonly date: string }): string;
export function renderUpgradeChange(input: { previous: UpgradeReport["previous"]; version: string; commit: string; foundationSpec: string; date: string }): Record<string, string>;
