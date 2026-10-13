import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import lockfile from "proper-lockfile";

const NAMESPACE_PATTERN = /^[a-z][a-z0-9-]*$/;

export type ProfileSettingsNamespaceRead =
  | { readonly status: "missing"; readonly value: null }
  | { readonly status: "available"; readonly value: Readonly<Record<string, unknown>> }
  | { readonly status: "invalid"; readonly value: null; readonly detail: string };

export type ProfileSettingsNamespaceUpdate = (
  current: Readonly<Record<string, unknown>> | null,
) => Readonly<Record<string, unknown>> | null;

/** Refuse an injected namespace already claimed by the surrounding root schema. */
export function assertProfileSettingsNamespaceAvailable(namespace: string, rootSettingKeys: readonly string[]): void {
  assertNamespace(namespace);
  if (rootSettingKeys.includes(namespace)) throw new Error(`profile settings namespace collides with a root setting: ${namespace}`);
}

/** Read one product-owned root object without exposing unrelated profile settings. */
export function readProfileSettingsNamespace(file: string, namespace: string): ProfileSettingsNamespaceRead {
  assertNamespace(namespace);
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch (error) {
    if (isMissing(error)) return { status: "missing", value: null };
    return { status: "invalid", value: null, detail: `${file} could not be read: ${describe(error)}` };
  }

  const root = parseRoot(raw);
  if (root === null) return { status: "invalid", value: null, detail: `${file} is not a valid settings object` };
  if (!Object.hasOwn(root, namespace)) return { status: "missing", value: null };
  const value = root[namespace];
  if (!isRecord(value)) {
    return { status: "invalid", value: null, detail: `${file} contains a non-object ${namespace} settings namespace` };
  }
  return { status: "available", value: Object.freeze({ ...value }) };
}

/**
 * Replace one root namespace through the lock protocol used by pinned Pi.
 * The updater receives bytes reread while locked, so unrelated concurrent writes survive.
 */
export function updateProfileSettingsNamespace(
  file: string,
  namespace: string,
  update: ProfileSettingsNamespaceUpdate,
): void {
  assertNamespace(namespace);
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const release = acquireLock(file);
  let temporary: string | null = null;
  try {
    const root = existsSync(file) ? parseRoot(readFileSync(file, "utf8")) : {};
    if (root === null) throw new Error(`${file} is not a valid settings object`);
    const existing = root[namespace];
    if (existing !== undefined && !isRecord(existing)) {
      throw new Error(`${file} contains a non-object ${namespace} settings namespace`);
    }
    const nextNamespace = update(existing === undefined ? null : Object.freeze({ ...existing }));
    const nextRoot: Record<string, unknown> = { ...root };
    if (nextNamespace === null || Object.keys(nextNamespace).length === 0) delete nextRoot[namespace];
    else nextRoot[namespace] = { ...nextNamespace };

    temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(nextRoot, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, file);
    temporary = null;
  } finally {
    if (temporary !== null) {
      try { rmSync(temporary, { force: true }); } catch {
        // Invariant: failed temporary cleanup cannot make the target document authoritative.
      }
    }
    release();
  }
}

function acquireLock(file: string): () => void {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return lockfile.lockSync(file, { realpath: false });
    } catch (error) {
      if (attempt >= 9 || !isLocked(error)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
}

function parseRoot(raw: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(raw) as unknown;
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNamespace(namespace: string): void {
  if (!NAMESPACE_PATTERN.test(namespace)) throw new Error(`profile settings namespace is invalid: ${namespace}`);
}

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT";
}

function isLocked(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as NodeJS.ErrnoException).code === "ELOCKED";
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
