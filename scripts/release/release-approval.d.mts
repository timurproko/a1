import type { ReleaseNote } from "./release-notes.mjs";
type JsonObject = Record<string, unknown>;
export const STABLE_VALIDATION_WORKFLOW: ".github/workflows/release-candidate.yml";
export function matchesStableValidationRun(run: unknown, source: string, version: string): boolean;
export function requireStableValidation(runs: unknown, source: string, version: string): JsonObject;
export function assertAuthorizedApprovalActor(
  actor: { login?: unknown; type?: unknown } | null,
  permission: { permission?: unknown } | null,
  expectedLogin: string,
): string;
export function validateStableApproval(input: {
  version: string;
  source: string;
  releases: readonly unknown[];
  expectedReleaseId?: number;
  application: JsonObject;
  lock: JsonObject;
  installer: JsonObject;
  existingApplication: unknown | null;
  existingInstaller: unknown | null;
  published?: boolean;
  tag?: unknown | null;
}): { readonly release: JsonObject; readonly note: ReleaseNote; readonly sha256: string };
