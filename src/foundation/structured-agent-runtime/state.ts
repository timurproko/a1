import {
  assertStructuredAgentSnapshot,
  assertStructuredCapability,
  assertWorkspaceEvent,
  type StructuredAgentSnapshot,
  type StructuredCapabilityContract,
  type WorkspaceEvent,
} from "../workspace-contracts/index.js";

export type StructuredAgentEvent = Extract<WorkspaceEvent, { readonly type: "structured-event" }>;

export interface StructuredRuntimeView {
  readonly agentId: string;
  readonly revision: number;
  readonly lastAppliedPosition: number | null;
  readonly nextEventPosition: number;
  readonly appliedEventCount: number;
  readonly lastEventType: string | null;
  readonly lastEventPayload: unknown;
  readonly snapshotId: string | null;
  readonly snapshotPayload: unknown;
}

export type StructuredEventApplyResult =
  | { readonly kind: "applied"; readonly view: StructuredRuntimeView }
  | { readonly kind: "duplicate"; readonly view: StructuredRuntimeView; readonly duplicatePosition: number }
  | {
    readonly kind: "resynchronization-required";
    readonly view: StructuredRuntimeView;
    readonly expectedPosition: number;
    readonly receivedPosition: number;
    readonly recovery: "snapshot" | "none";
  }
  | { readonly kind: "rejected"; readonly code: string; readonly diagnostic: string };

export type StructuredSnapshotApplyResult =
  | { readonly kind: "snapshot-applied"; readonly view: StructuredRuntimeView }
  | { readonly kind: "snapshot-stale"; readonly view: StructuredRuntimeView; readonly currentPosition: number; readonly snapshotPosition: number }
  | { readonly kind: "rejected"; readonly code: string; readonly diagnostic: string };

export class StructuredEventReducer {
  readonly #capability: StructuredCapabilityContract;
  #lastAppliedPosition: number | null = null;
  #appliedEventCount = 0;
  #revision = 0;
  #lastEventType: string | null = null;
  #lastEventPayload: unknown = null;
  #snapshotId: string | null = null;
  #snapshotPayload: unknown = null;

  constructor(readonly agentId: string, capability: StructuredCapabilityContract) {
    assertStructuredCapability(capability);
    if (!agentId || agentId.includes("\0")) throw new TypeError("structured reducer agent id is invalid");
    this.#capability = capability;
  }

  applyEvent(event: StructuredAgentEvent): StructuredEventApplyResult {
    try {
      assertWorkspaceEvent(event);
    } catch (error) {
      return rejected("malformed-event", error);
    }
    if (event.agentId !== this.agentId) {
      return rejected("agent-mismatch", new Error("structured event agent does not match the reducer identity"));
    }
    if (!this.#capability.eventTypes.includes(event.eventType)) {
      return rejected("unsupported-event-type", new Error(`structured event type is not negotiated: ${event.eventType}`));
    }
    if (payloadBytes(event.payload) > this.#capability.flow.maxEventBytes) {
      return rejected("event-too-large", new Error(`structured event exceeds the negotiated ${this.#capability.flow.maxEventBytes} byte limit`));
    }

    const nextPosition = this.nextEventPosition();
    if (event.position < nextPosition) {
      return { kind: "duplicate", view: this.view(), duplicatePosition: event.position };
    }
    if (event.position > nextPosition) {
      return {
        kind: "resynchronization-required",
        view: this.view(),
        expectedPosition: nextPosition,
        receivedPosition: event.position,
        recovery: this.#capability.snapshots === "authoritative" ? "snapshot" : "none",
      };
    }

    this.#lastAppliedPosition = event.position;
    this.#appliedEventCount += 1;
    this.#lastEventType = event.eventType;
    this.#lastEventPayload = event.payload;
    this.#revision += 1;
    return { kind: "applied", view: this.view() };
  }

  replaceWithSnapshot(snapshot: StructuredAgentSnapshot): StructuredSnapshotApplyResult {
    if (this.#capability.snapshots !== "authoritative") {
      return rejected("snapshots-unsupported", new Error("the negotiated adapter capability does not provide authoritative snapshots"));
    }
    try {
      assertStructuredAgentSnapshot(snapshot);
    } catch (error) {
      return rejected("malformed-snapshot", error);
    }
    if (snapshot.agentId !== this.agentId) {
      return rejected("agent-mismatch", new Error("structured snapshot agent does not match the reducer identity"));
    }
    if (payloadBytes(snapshot.payload) > this.#capability.flow.maxSnapshotBytes) {
      return rejected("snapshot-too-large", new Error(`structured snapshot exceeds the negotiated ${this.#capability.flow.maxSnapshotBytes} byte limit`));
    }
    const currentPosition = this.#lastAppliedPosition;
    if (currentPosition !== null && snapshot.position < currentPosition) {
      return { kind: "snapshot-stale", view: this.view(), currentPosition, snapshotPosition: snapshot.position };
    }

    this.#lastAppliedPosition = snapshot.position;
    this.#appliedEventCount = 0;
    this.#lastEventType = null;
    this.#lastEventPayload = null;
    this.#snapshotId = snapshot.snapshotId;
    this.#snapshotPayload = snapshot.payload;
    this.#revision += 1;
    return { kind: "snapshot-applied", view: this.view() };
  }

  nextEventPosition(): number {
    return this.#lastAppliedPosition === null ? 0 : this.#lastAppliedPosition + 1;
  }

  view(): StructuredRuntimeView {
    return Object.freeze({
      agentId: this.agentId,
      revision: this.#revision,
      lastAppliedPosition: this.#lastAppliedPosition,
      nextEventPosition: this.nextEventPosition(),
      appliedEventCount: this.#appliedEventCount,
      lastEventType: this.#lastEventType,
      lastEventPayload: this.#lastEventPayload,
      snapshotId: this.#snapshotId,
      snapshotPayload: this.#snapshotPayload,
    });
  }
}

function rejected(code: string, error: unknown): { readonly kind: "rejected"; readonly code: string; readonly diagnostic: string } {
  return { kind: "rejected", code, diagnostic: error instanceof Error ? error.message : String(error) };
}

function payloadBytes(payload: unknown): number {
  return new TextEncoder().encode(JSON.stringify(payload)).byteLength;
}
