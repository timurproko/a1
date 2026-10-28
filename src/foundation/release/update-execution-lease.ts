import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import lockfile from "proper-lockfile";
import { processIsAlive } from "./process-cleanup.js";
import type { UpdateChannel } from "./types.js";
import { UpdateTransactionStore, type UpdateTransaction } from "./update-transaction.js";

export const UPDATE_EXECUTION_LEASE_FILENAME = "update-execution.json";
const LEASE_SCHEMA = 1;
const MAX_LEASE_BYTES = 8_192;

export type UpdateExecutionMode = "manual" | "automatic";

export interface UpdateExecutionOwner {
  readonly schema: typeof LEASE_SCHEMA;
  readonly ownerId: string;
  readonly pid: number;
  readonly pidStartIdentity: string;
  readonly packageRoot: string;
  readonly channel: UpdateChannel;
  readonly targetVersion: string;
  readonly mode: UpdateExecutionMode;
  readonly acquiredAt: string;
}

export type UpdateExecutionLeaseResult =
  | { readonly status: "acquired"; readonly owner: UpdateExecutionOwner; release(): Promise<void> }
  | { readonly status: "busy"; readonly owner: UpdateExecutionOwner }
  /** A dead owner whose active transaction names another target; only a manual update may settle it. */
  | { readonly status: "interrupted"; readonly owner: UpdateExecutionOwner; readonly transaction: UpdateTransaction };

/**
 * Serializes every package replacement for one A1 data root. A dead owner is moved aside before a
 * new exclusive create, so concurrent recovery attempts cannot both acquire the installation.
 */
export async function acquireUpdateExecutionLease(input: {
  readonly dataDir: string;
  readonly packageRoot: string;
  readonly channel: UpdateChannel;
  readonly targetVersion: string;
  readonly mode: UpdateExecutionMode;
}): Promise<UpdateExecutionLeaseResult> {
  const path = resolve(input.dataDir, UPDATE_EXECUTION_LEASE_FILENAME);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const releaseAcquisition = await lockfile.lock(path, {
    realpath: false,
    stale: 60_000,
    update: 20_000,
    retries: { retries: 20, factor: 1.2, minTimeout: 20, maxTimeout: 100, randomize: true },
  });
  const owner: UpdateExecutionOwner = {
    schema: LEASE_SCHEMA,
    ownerId: randomUUID(),
    pid: process.pid,
    pidStartIdentity: currentProcessStartIdentity(),
    packageRoot: resolve(input.packageRoot),
    channel: input.channel,
    targetVersion: input.targetVersion,
    mode: input.mode,
    acquiredAt: new Date().toISOString(),
  };

  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const file = await open(path, "wx", 0o600);
        try {
          await file.writeFile(`${JSON.stringify(owner)}\n`);
          await file.sync();
        } finally {
          await file.close();
        }
        return {
          status: "acquired",
          owner,
          release: async () => await releaseLease(path, owner),
        };
      } catch (error) {
        if (!hasCode(error, "EEXIST")) throw error;
      }

      const existing = await readUpdateExecutionOwner(input.dataDir);
      if (existing === null) continue;
      // Security: an uninspectable or reused pid stays conservative. A process known to be absent is
      // reclaimed only when its durable transaction agrees with both owners; a transaction that names
      // another target is handed to a manual caller to settle, while automatic work fails closed.
      if (processIsAlive(existing.pid)) return { status: "busy", owner: existing };
      const foreign = await foreignActiveTransaction(input.dataDir, existing, input);
      if (foreign !== null) {
        return input.mode === "manual"
          ? { status: "interrupted", owner: existing, transaction: foreign }
          : { status: "busy", owner: existing };
      }
      const stale = `${path}.stale-${existing.ownerId}-${randomUUID()}`;
      try {
        await rename(path, stale);
        await rm(stale, { force: true });
      } catch (error) {
        if (!hasCode(error, "ENOENT")) throw error;
      }
    }
    const existing = await readUpdateExecutionOwner(input.dataDir);
    if (existing !== null) return { status: "busy", owner: existing };
    throw new Error("could not acquire update execution lease");
  } finally {
    await releaseAcquisition();
  }
}

export async function readUpdateExecutionOwner(dataDir: string): Promise<UpdateExecutionOwner | null> {
  const path = resolve(dataDir, UPDATE_EXECUTION_LEASE_FILENAME);
  let source: string;
  try {
    source = await readFile(path, "utf8");
  } catch (error) {
    if (hasCode(error, "ENOENT")) return null;
    throw error;
  }
  if (Buffer.byteLength(source, "utf8") > MAX_LEASE_BYTES) throw new Error("update execution lease is oversized");
  const value = JSON.parse(source) as UpdateExecutionOwner;
  validateOwner(value);
  return value;
}

async function releaseLease(path: string, owner: UpdateExecutionOwner): Promise<void> {
  const current = await readUpdateExecutionOwner(dirname(path));
  if (current === null || current.ownerId !== owner.ownerId || current.pid !== owner.pid
    || current.pidStartIdentity !== owner.pidStartIdentity) return;
  const released = `${path}.released-${owner.ownerId}-${randomUUID()}`;
  try {
    await rename(path, released);
    await rm(released, { force: true });
  } catch (error) {
    if (!hasCode(error, "ENOENT")) throw error;
  }
}

function validateOwner(value: UpdateExecutionOwner): void {
  if (value.schema !== LEASE_SCHEMA || typeof value.ownerId !== "string" || value.ownerId.length === 0
    || !Number.isSafeInteger(value.pid) || value.pid <= 0 || typeof value.pidStartIdentity !== "string"
    || typeof value.packageRoot !== "string" || !["stable", "next"].includes(value.channel)
    || typeof value.targetVersion !== "string" || !["manual", "automatic"].includes(value.mode)
    || typeof value.acquiredAt !== "string") {
    throw new Error("invalid update execution lease");
  }
}

/**
 * Removes a dead owner's lease once its transaction has been settled. A lease that another owner
 * holds by now, or whose process turned out to be alive, is left alone.
 */
export async function reclaimDeadLease(dataDir: string, owner: UpdateExecutionOwner): Promise<void> {
  if (processIsAlive(owner.pid)) return;
  await releaseLease(resolve(dataDir, UPDATE_EXECUTION_LEASE_FILENAME), owner);
}

/** The active transaction when it or the request disagrees with the dead owner, else null. */
async function foreignActiveTransaction(
  dataDir: string,
  owner: UpdateExecutionOwner,
  requested: Pick<UpdateExecutionOwner, "packageRoot" | "channel" | "targetVersion">,
): Promise<UpdateTransaction | null> {
  const transaction = await new UpdateTransactionStore(dataDir).read();
  if (transaction?.status !== "active") return null;
  const matches = transaction.channel === owner.channel && transaction.targetVersion === owner.targetVersion
    && samePath(transaction.packageRoot, owner.packageRoot)
    && requested.channel === owner.channel && requested.targetVersion === owner.targetVersion
    && samePath(requested.packageRoot, owner.packageRoot);
  return matches ? null : transaction;
}

function samePath(left: string, right: string): boolean {
  const canonicalLeft = resolve(left);
  const canonicalRight = resolve(right);
  return process.platform === "win32"
    ? canonicalLeft.toLowerCase() === canonicalRight.toLowerCase()
    : canonicalLeft === canonicalRight;
}

function currentProcessStartIdentity(): string {
  return `${process.pid}:${Math.floor(Date.now() - process.uptime() * 1_000)}`;
}

function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}
