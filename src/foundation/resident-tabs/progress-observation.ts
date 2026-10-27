import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

const OBSERVATION_DIRECTORY_ENV = PRODUCT_IDENTITY.environment.residentProgressObservationDir;
const OBSERVATION_RUN_ENV = PRODUCT_IDENTITY.environment.residentProgressRunId;
const MAX_PENDING_BYTES = 256 * 1024;

import type { ProgressFields, ProgressRecord, ResidentInputPhase, ResidentProgressObserverPort } from "./progress-observation-schema.js";
export type { ResidentProgressObserverPort } from "./progress-observation-schema.js";

class ResidentProgressObserver implements ResidentProgressObserverPort {
  readonly #directory: string;
  readonly #runId: string;
  readonly #tabId: string;
  readonly #incarnation: number;
  readonly #processInstance: string;
  readonly #path: string;
  #sequence = 0;
  #engineSequence = 0;
  #pendingBytes = 0;
  #lost = 0;
  #writing = false;
  #pending: string[] = [];
  #scheduled = false;
  #directoryReady = false;
  #failed = false;

  get tabId(): string { return this.#tabId; }

  constructor(directory: string, runId: string, tabId: string, incarnation: number) {
    this.#directory = directory;
    this.#runId = runId;
    this.#tabId = tabId;
    this.#incarnation = incarnation;
    this.#processInstance = `${process.pid}-${randomUUID()}`;
    this.#path = join(directory, `child-${this.#processInstance}.jsonl`);
  }

  engineDelivery(event: unknown): void {
    this.#engineSequence += 1;
    this.#observe("engine-delivery", {
      eventSequence: this.#engineSequence,
      eventKind: eventKind(event),
      count: 1,
    });
  }

  inputPhase(phase: ResidentInputPhase, revision: number): void {
    this.#observe("child-input-phase", { eventKind: phase, revision, count: 1 });
  }

  childRenderWrite(bytes: number, fragments: number, transaction: "synchronized-output" | "ordinary",
    frameId?: number, renderCause?: string): void {
    this.#observe("child-render-write", {
      eventSequence: this.#engineSequence,
      bytes,
      count: 1,
      fragmentCount: fragments,
      transactionKind: transaction,
      ...(frameId === undefined ? {} : { frameId }),
      ...(renderCause === undefined ? {} : { renderCause }),
    });
  }

  #observe(stage: ProgressRecord["stage"], fields: ProgressFields): void {
    if (this.#failed) return;
    const lostBefore = this.#lost;
    const record: ProgressRecord = {
      schema: "a1-resident-progress-observation-v1",
      runId: this.#runId,
      role: "child",
      stage,
      pid: process.pid,
      processInstance: this.#processInstance,
      timestampUnixUs: Math.round((performance.timeOrigin + performance.now()) * 1_000),
      // Rationale: epoch-calibrated timeOrigin retains conservative cross-process clock error.
      clockErrorUs: 1_000,
      sequence: ++this.#sequence,
      tabId: this.#tabId,
      incarnation: this.#incarnation,
      lostBefore,
      ...fields,
    };
    const line = `${JSON.stringify(record)}\n`;
    const length = Buffer.byteLength(line);
    if (this.#pendingBytes + length > MAX_PENDING_BYTES) {
      this.#lost = lostBefore + 1;
      return;
    }
    this.#lost = 0;
    this.#pendingBytes += length;
    this.#pending.push(line);
    this.#schedule();
  }

  #schedule(): void {
    if (this.#scheduled || this.#writing || this.#failed) return;
    this.#scheduled = true;
    // Performance: check-phase batches yield to input and amortize file opens and promises.
    setImmediate(() => { this.#scheduled = false; void this.#flush(); });
  }

  async #flush(): Promise<void> {
    if (this.#failed || this.#pending.length === 0) return;
    this.#writing = true;
    const batch = this.#pending.join("");
    this.#pending = [];
    // Rationale: cap pending only.
    this.#pendingBytes = 0;
    try {
      if (!this.#directoryReady) {
        await mkdir(this.#directory, { recursive: true });
        this.#directoryReady = true;
      }
      await appendFile(this.#path, batch, "utf8");
    } catch {
      this.#failed = true;
      this.#pending = [];
    } finally {
      this.#writing = false;
      if (this.#pending.length > 0) this.#schedule();
    }
  }
}

let observer: ResidentProgressObserver | null | undefined;

/** Opt-in payload-free child observer; ordinary launches return null. */
export function residentProgressObserver(
  environment: NodeJS.ProcessEnv = process.env,
): ResidentProgressObserverPort | null {
  if (environment === process.env && observer !== undefined) return observer;
  const directory = environment[OBSERVATION_DIRECTORY_ENV];
  const runId = environment[OBSERVATION_RUN_ENV];
  const tabId = environment[PRODUCT_IDENTITY.environment.residentProgressTabId];
  const incarnation = Number(environment[PRODUCT_IDENTITY.environment.residentProgressTabIncarnation]);
  const value = directory && runId && runId.length <= 128 && tabId && Number.isSafeInteger(incarnation) && incarnation >= 0
    ? new ResidentProgressObserver(directory, runId, tabId, incarnation)
    : null;
  if (environment === process.env) {
    observer = value;
    // Security: keep evidence paths and identity private; erase them before extensions/tools inherit env.
    for (const name of [
      OBSERVATION_DIRECTORY_ENV,
      OBSERVATION_RUN_ENV,
      PRODUCT_IDENTITY.environment.residentProgressTabId,
      PRODUCT_IDENTITY.environment.residentProgressTabIncarnation,
    ]) delete process.env[name];
  }
  return value;
}

function eventKind(event: unknown): string {
  if (typeof event !== "object" || event === null) return "unknown";
  const value = (event as { readonly type?: unknown }).type;
  return typeof value === "string" && /^[a-z][a-z0-9_-]{0,63}$/iu.test(value) ? value : "unknown";
}
