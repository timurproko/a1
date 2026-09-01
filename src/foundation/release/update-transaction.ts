import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../../product-identity.js";

export const UPDATE_JOURNAL_SCHEMA = PRODUCT_IDENTITY.protocol.updateJournalSchema;
import type { UpdateChannel } from "./update.js";

export type UpdateTransactionPhase =
  | "shutdown-intent"
  | "ownership-released"
  | "package-installed"
  | "materialized"
  | "certified"
  | "active-reference-committed"
  | "supervisor-verified";

export interface UpdateTransaction {
  readonly schema: typeof UPDATE_JOURNAL_SCHEMA;
  readonly transactionId: string;
  readonly channel: UpdateChannel;
  readonly targetVersion: string;
  readonly packageRoot: string;
  readonly priorActiveReleaseId: string | null;
  readonly phase: UpdateTransactionPhase;
  readonly status: "active" | "completed" | "rolled-back" | "failed";
  readonly error: string | null;
  readonly startedAt: string;
  readonly updatedAt: string;
}

/** Persists the durable update journal and permits only validated forward transaction phases. */
export class UpdateTransactionStore {
  readonly path: string;
  constructor(dataDir: string) { this.path = resolve(dataDir, "update-transaction.json"); }

  async read(): Promise<UpdateTransaction | null> {
    try {
      const value = JSON.parse(await readFile(this.path, "utf8")) as UpdateTransaction;
      validate(value);
      return value;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
      throw error;
    }
  }

  async begin(input: { channel: UpdateChannel; targetVersion: string; packageRoot: string; priorActiveReleaseId: string | null }): Promise<UpdateTransaction> {
    const current = await this.read();
    if (current?.status === "active") {
      if (current.targetVersion !== input.targetVersion || current.channel !== input.channel) {
        throw new Error(PRODUCT_TEXT.diagnostic(`has unfinished update ${current.transactionId} targeting ${current.targetVersion}; reconcile it before starting ${input.targetVersion}`));
      }
      return current;
    }
    const now = new Date().toISOString();
    return await this.#write({
      schema: UPDATE_JOURNAL_SCHEMA,
      transactionId: randomUUID(),
      ...input,
      phase: "shutdown-intent",
      status: "active",
      error: null,
      startedAt: now,
      updatedAt: now,
    });
  }

  async advance(phase: UpdateTransactionPhase): Promise<UpdateTransaction> {
    const current = await this.#requiredActive();
    if (phaseOrder(phase) < phaseOrder(current.phase)) return current;
    return await this.#write({ ...current, phase, updatedAt: new Date().toISOString() });
  }

  async finish(status: "completed" | "rolled-back" | "failed", error: string | null = null): Promise<UpdateTransaction> {
    const current = await this.read();
    if (!current) throw new Error(`no ${PRODUCT_TEXT.displayName} update transaction is recorded`);
    return await this.#write({ ...current, status, error, updatedAt: new Date().toISOString() });
  }

  async clearCompleted(): Promise<void> {
    const current = await this.read();
    if (current && current.status !== "active") await rm(this.path, { force: true });
  }

  async #requiredActive(): Promise<UpdateTransaction> {
    const current = await this.read();
    if (!current || current.status !== "active") throw new Error(`no active ${PRODUCT_TEXT.displayName} update transaction is recorded`);
    return current;
  }

  async #write(value: UpdateTransaction): Promise<UpdateTransaction> {
    validate(value);
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const temporary = `${this.path}.${process.pid}.${randomUUID()}.tmp`;
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(JSON.stringify(value, null, 2));
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, this.path);
    return value;
  }
}

function phaseOrder(phase: UpdateTransactionPhase): number {
  return ["shutdown-intent", "ownership-released", "package-installed", "materialized", "certified", "active-reference-committed", "supervisor-verified"].indexOf(phase);
}
function validate(value: UpdateTransaction): void {
  if (value.schema !== UPDATE_JOURNAL_SCHEMA || typeof value.transactionId !== "string" || !["stable", "next"].includes(value.channel)
    || typeof value.targetVersion !== "string" || typeof value.packageRoot !== "string" || typeof value.startedAt !== "string"
    || typeof value.updatedAt !== "string" || phaseOrder(value.phase) < 0 || !["active", "completed", "rolled-back", "failed"].includes(value.status)) {
    throw new Error(`invalid ${PRODUCT_TEXT.displayName} update transaction journal`);
  }
}
