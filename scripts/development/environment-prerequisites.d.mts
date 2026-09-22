import type { VersionProbeResult } from "./environment-probe.mjs";

export type PrerequisiteSeverity = "required" | "advisory";
export interface PrerequisiteCheck {
  readonly id: string;
  readonly label: string;
  readonly severity: PrerequisiteSeverity;
  readonly satisfied: boolean;
  readonly detail: string;
  readonly remedy: string | null;
}
export interface DependencyObservation {
  readonly present: boolean;
  readonly declared: number;
  readonly missing: readonly string[];
  readonly mismatched: readonly { readonly name: string; readonly expected: string; readonly actual: string }[];
}
export interface EnvironmentObservation {
  readonly platform?: string;
  readonly node?: string;
  readonly engines?: string;
  readonly packageManager?: string;
  readonly npm?: string | null;
  readonly git?: string | null;
  readonly githubCli?: string | null;
  readonly cargo?: string | null;
  readonly rustc?: string | null;
  readonly dependencies?: DependencyObservation;
  readonly probes?: Readonly<Record<string, VersionProbeResult>>;
}
export const CARGO_RANGE: string;
export const BLOCKING: "required";
export const ADVISORY: "advisory";
export function parseVersion(text: unknown): readonly [number, number, number] | null;
export function satisfiesRange(version: unknown, range: unknown): boolean;
export function evaluatePrerequisites(observation: EnvironmentObservation): readonly PrerequisiteCheck[];
export function blockingFailures(checks: readonly PrerequisiteCheck[]): readonly PrerequisiteCheck[];
export function advisories(checks: readonly PrerequisiteCheck[]): readonly PrerequisiteCheck[];
export function formatReport(checks: readonly PrerequisiteCheck[], packageName: string): string;
export function formatFailures(checks: readonly PrerequisiteCheck[]): string;
