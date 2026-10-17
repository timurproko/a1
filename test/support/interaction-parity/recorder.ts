import { performance } from "node:perf_hooks";
import type { ObservationKind } from "../../../scripts/development/interaction-parity/matrix.mjs";
import { digestContent, type Candidate, type Observation } from "../../../scripts/development/interaction-parity/observations.mjs";

/**
 * Records content-free observations for one candidate on a monotonic clock. Each `sent()` marks
 * the input that causes the next observations; `observe()` digests content instead of keeping it.
 */
export class ObservationRecorder {
  readonly observations: Observation[] = [];
  readonly #candidate: Candidate;
  readonly #platform: string;
  readonly #sequences = new Map<string, number>();
  #caseId = "";
  #sentAt = 0;

  constructor(candidate: Candidate, platform = `${process.platform}-${process.arch}`) {
    this.#candidate = candidate;
    this.#platform = platform;
  }

  begin(caseId: string): void {
    this.#caseId = caseId;
    this.#sentAt = performance.now();
  }

  sent(): void {
    this.#sentAt = performance.now();
  }

  observe(kind: ObservationKind, content: string | Uint8Array, detail?: Readonly<Record<string, string | number | boolean>>): Observation {
    const key = `${this.#caseId}\u0000${kind}`;
    const seq = (this.#sequences.get(key) ?? 0) + 1;
    this.#sequences.set(key, seq);
    const observation: Observation = {
      caseId: this.#caseId,
      candidate: this.#candidate,
      platform: this.#platform,
      kind,
      seq,
      sentAt: this.#sentAt,
      observedAt: performance.now(),
      digest: digestContent(content),
      length: typeof content === "string" ? Buffer.byteLength(content) : content.byteLength,
      ...(detail === undefined ? {} : { detail }),
    };
    this.observations.push(observation);
    return observation;
  }

  /** The observations of one case with timing removed, for comparing two runs of the same oracle. */
  stable(caseId: string): readonly Omit<Observation, "sentAt" | "observedAt">[] {
    return this.observations
      .filter(observation => observation.caseId === caseId)
      .map(({ sentAt: _sentAt, observedAt: _observedAt, ...rest }) => rest);
  }
}
