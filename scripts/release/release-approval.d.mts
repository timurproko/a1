import type { ReleaseNote } from "./release-notes.mjs";
type JsonObject = Record<string, unknown>;
export function assertAuthorizedApprovalActor(
  actor: { login?: unknown; type?: unknown } | null,
  permission: { permission?: unknown } | null,
  expectedLogin: string,
): string;
export function validateStableApproval(input: {
  version: string;
  source: string;
  authoritativeSource?: string;
  recovery?: boolean;
  releases: readonly unknown[];
  application: JsonObject;
  lock: JsonObject;
  installer: JsonObject;
  authoritativeApplication?: JsonObject;
  authoritativeLock?: JsonObject;
  authoritativeInstaller?: JsonObject;
  existingApplication: unknown | null;
  existingInstaller: unknown | null;
}): { readonly release: JsonObject; readonly note: ReleaseNote; readonly sha256: string };
