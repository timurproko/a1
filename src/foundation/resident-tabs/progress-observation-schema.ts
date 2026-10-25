/** Payload-free fixture schema; type-only imports keep it outside the evaluated startup graph. */
export type ResidentInputPhase = "receipt" | "semantic-start" | "semantic-end"
  | "composition-start" | "composition-end" | "write-start" | "write-end";

export interface ProgressFields {
  readonly eventSequence?: number;
  readonly revision?: number;
  readonly geometryGeneration?: number;
  readonly bytes?: number;
  readonly count?: number;
  readonly eventKind?: string;
  readonly frameId?: number;
  readonly renderCause?: string;
  readonly fragmentCount?: number;
  readonly transactionKind?: "synchronized-output" | "ordinary";
}

export interface ProgressRecord extends ProgressFields {
  readonly schema: "a1-resident-progress-observation-v1";
  readonly runId: string;
  readonly role: "child";
  readonly stage: "engine-delivery" | "child-render-write" | "child-input-phase";
  readonly pid: number;
  readonly processInstance: string;
  readonly timestampUnixUs: number;
  readonly clockErrorUs: number;
  readonly sequence: number;
  readonly tabId: string;
  readonly incarnation: number;
  readonly lostBefore: number;
}

export interface ResidentProgressObserverPort {
  readonly tabId: string;
  engineDelivery(event: unknown): void;
  inputPhase?(phase: ResidentInputPhase, revision: number): void;
  childRenderWrite(bytes: number, fragments: number, transaction: "synchronized-output" | "ordinary",
    frameId?: number, renderCause?: string): void;
}
