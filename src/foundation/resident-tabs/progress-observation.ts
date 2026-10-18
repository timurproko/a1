import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

const OBSERVATION_DIRECTORY_ENV = "A1_RESIDENT_PROGRESS_OBSERVATION_DIR";
const OBSERVATION_RUN_ENV = "A1_RESIDENT_PROGRESS_RUN_ID";
const MAX_PENDING_BYTES = 256 * 1024;

interface ProgressFields {
  readonly eventSequence?: number;
  readonly revision?: number;
  readonly geometryGeneration?: number;
  readonly bytes?: number;
  readonly count?: number;
  readonly eventKind?: string;
  readonly frameId?: number;
  readonly renderCause?: string;
}

interface ProgressRecord extends ProgressFields {
  readonly schema: "a1-resident-progress-observation-v1";
  readonly runId: string;
  readonly role: "child";
  readonly stage: "engine-delivery" | "child-render-write";
  readonly pid: number;
  readonly timestampUnixUs: number;
  readonly clockErrorUs: number;
  readonly sequence: number;
  readonly tabId: string;
  readonly incarnation: number;
  readonly lostBefore: number;
}

export interface ResidentProgressObserverPort {
  engineDelivery(event: unknown): void;
  childRenderWrite(bytes: number, frameId?: number, renderCause?: string): void;
}

class ResidentProgressObserver implements ResidentProgressObserverPort {
  readonly #directory: string;
  readonly #runId: string;
  readonly #tabId: string;
  readonly #incarnation: number;
  readonly #path: string;
  #sequence = 0;
  #engineSequence = 0;
  #pendingBytes = 0;
  #lost = 0;
  #writing: Promise<void> = Promise.resolve();
  #failed = false;

  constructor(directory: string, runId: string, tabId: string, incarnation: number) {
    this.#directory = directory;
    this.#runId = runId;
    this.#tabId = tabId;
    this.#incarnation = incarnation;
    this.#path = join(directory, `child-${process.pid}.jsonl`);
  }

  engineDelivery(event: unknown): void {
    this.#engineSequence += 1;
    this.#observe("engine-delivery", {
      eventSequence: this.#engineSequence,
      eventKind: eventKind(event),
      count: 1,
    });
  }

  childRenderWrite(bytes: number, frameId?: number, renderCause?: string): void {
    this.#observe("child-render-write", {
      eventSequence: this.#engineSequence,
      bytes,
      count: 1,
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
      timestampUnixUs: Math.round((performance.timeOrigin + performance.now()) * 1_000),
      // timeOrigin is calibrated to the Unix epoch; retain a conservative cross-process error.
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
    this.#writing = this.#writing.then(async () => {
      await mkdir(this.#directory, { recursive: true });
      await appendFile(this.#path, line, "utf8");
    }).catch(() => {
      this.#failed = true;
    }).finally(() => {
      this.#pendingBytes -= length;
    });
  }
}

let observer: ResidentProgressObserver | null | undefined;

/** Returns the opt-in payload-free observer for a resident child, or null on ordinary launches. */
export function residentProgressObserver(
  environment: NodeJS.ProcessEnv = process.env,
): ResidentProgressObserverPort | null {
  if (environment === process.env && observer !== undefined) return observer;
  const directory = environment[OBSERVATION_DIRECTORY_ENV];
  const runId = environment[OBSERVATION_RUN_ENV];
  const tabId = environment.A1_RESIDENT_PROGRESS_TAB_ID;
  const incarnation = Number(environment.A1_RESIDENT_PROGRESS_TAB_INCARNATION);
  const value = directory && runId && runId.length <= 128 && tabId && Number.isSafeInteger(incarnation) && incarnation >= 0
    ? new ResidentProgressObserver(directory, runId, tabId, incarnation)
    : null;
  if (environment === process.env) {
    observer = value;
    // Test evidence paths and tab identity are not child/tool configuration. Retain them only in
    // this observer instance so extensions and spawned tools cannot append to the fixture trace.
    for (const name of [
      OBSERVATION_DIRECTORY_ENV,
      OBSERVATION_RUN_ENV,
      "A1_RESIDENT_PROGRESS_TAB_ID",
      "A1_RESIDENT_PROGRESS_TAB_INCARNATION",
    ]) delete process.env[name];
  }
  return value;
}

function eventKind(event: unknown): string {
  if (typeof event !== "object" || event === null) return "unknown";
  const value = (event as { readonly type?: unknown }).type;
  return typeof value === "string" && /^[a-z][a-z0-9_-]{0,63}$/iu.test(value) ? value : "unknown";
}
