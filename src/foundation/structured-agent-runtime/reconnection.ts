import {
  WORKSPACE_CONTRACT_VERSION,
  assertRecoveryAuthority,
  assertStructuredAgentSnapshot,
  assertStructuredCapability,
  type AgentRecoveryAuthority,
  type StructuredAgentSnapshot,
  type StructuredCapabilityContract,
  type StructuredRecoveryAuthority,
} from "../../contracts/workspace/index.js";
import { StructuredEventReducer, type StructuredRuntimeView } from "./state.js";

export interface StructuredResumeProof {
  readonly protocolVersion: number;
  readonly agentId: string;
  readonly adapterId: string;
  readonly processIdentity: string;
  readonly ownershipProof: string;
  readonly boundary:
    | { readonly kind: "position"; readonly position: number; readonly resumeToken: string }
    | { readonly kind: "snapshot"; readonly snapshotId: string; readonly snapshot: StructuredAgentSnapshot };
}

export type StructuredReconnectionResult =
  | {
    readonly kind: "accepted";
    readonly boundary: StructuredRecoveryAuthority["boundary"];
    readonly view: StructuredRuntimeView | null;
    readonly diagnostic: string;
  }
  | { readonly kind: "terminated"; readonly reason: "non-reconnectable"; readonly diagnostic: string }
  | { readonly kind: "rejected"; readonly code: string; readonly diagnostic: string };

export class StructuredReconnectionManager {
  readonly #capability: StructuredCapabilityContract;
  readonly #acceptedBoundaries = new Set<string>();

  constructor(capability: StructuredCapabilityContract) {
    assertStructuredCapability(capability);
    this.#capability = capability;
  }

  resume(
    authorityValue: AgentRecoveryAuthority,
    proof: StructuredResumeProof,
    reducer: StructuredEventReducer | null = null,
  ): StructuredReconnectionResult {
    let authority: AgentRecoveryAuthority;
    try {
      assertRecoveryAuthority(authorityValue);
      authority = authorityValue;
    } catch (error) {
      return rejected("invalid-authority", error);
    }
    if (authority.kind !== "structured") return rejected("invalid-authority", new Error("structured reconnection requires structured recovery authority"));
    if (this.#capability.resume === "none") {
      return { kind: "terminated", reason: "non-reconnectable", diagnostic: "adapter did not negotiate reconnection; durable agent is ended after restart" };
    }
    if (this.#capability.resume !== authority.boundary.kind) {
      return rejected("unsupported-resume", new Error(`persisted ${authority.boundary.kind} recovery is unavailable from negotiated ${this.#capability.resume} resume`));
    }

    const identityError = verifyIdentity(authority, proof);
    if (identityError) return identityError;
    if (proof.protocolVersion !== WORKSPACE_CONTRACT_VERSION) {
      return rejected("version-mismatch", new Error(`resume protocol ${proof.protocolVersion} does not match supported version ${WORKSPACE_CONTRACT_VERSION}`));
    }
    if (proof.boundary.kind !== authority.boundary.kind) {
      return rejected("boundary-mismatch", new Error("resume proof boundary does not match the persisted recovery boundary"));
    }

    const boundaryKey = boundaryKeyOf(authority.boundary);
    if (this.#acceptedBoundaries.has(boundaryKey)) {
      return rejected("replay-detected", new Error("structured recovery boundary has already been accepted"));
    }

    if (authority.boundary.kind === "position") {
      if (proof.boundary.kind !== "position") return rejected("boundary-mismatch", new Error("position resume requires a position proof"));
      if (proof.boundary.position !== authority.boundary.position) {
        return rejected("boundary-mismatch", new Error("resume position does not match the persisted recovery boundary"));
      }
      if (proof.boundary.resumeToken !== authority.boundary.resumeToken) {
        return rejected("stale-token", new Error("resume token does not match the persisted recovery boundary"));
      }
      let view: StructuredRuntimeView | null = null;
      if (reducer) {
        const restored = restorePosition(reducer, authority.agentId, proof.boundary.position);
        if (isRejected(restored)) return restored;
        view = restored;
      }
      this.#acceptedBoundaries.add(boundaryKey);
      return { kind: "accepted", boundary: authority.boundary, view, diagnostic: "structured resume position verified" };
    }

    if (proof.boundary.kind !== "snapshot") return rejected("boundary-mismatch", new Error("snapshot resume requires a snapshot proof"));
    if (proof.boundary.snapshotId !== authority.boundary.snapshotId) {
      return rejected("stale-token", new Error("resume snapshot identity does not match the persisted recovery boundary"));
    }
    if (payloadBytes(proof.boundary.snapshot.payload) > this.#capability.flow.maxSnapshotBytes) {
      return rejected("snapshot-too-large", new Error(`resume snapshot exceeds the negotiated ${this.#capability.flow.maxSnapshotBytes} byte limit`));
    }
    const snapshotResult = verifySnapshot(authority.agentId, proof.boundary.snapshotId, proof.boundary.snapshot);
    if (snapshotResult) return snapshotResult;
    if (reducer) {
      const applied = reducer.replaceWithSnapshot(proof.boundary.snapshot);
      if (applied.kind !== "snapshot-applied") {
        return rejected("snapshot-recovery-failed", new Error(`snapshot recovery failed: ${applied.kind}`));
      }
      this.#acceptedBoundaries.add(boundaryKey);
      return { kind: "accepted", boundary: authority.boundary, view: applied.view, diagnostic: "structured snapshot recovery verified" };
    }
    this.#acceptedBoundaries.add(boundaryKey);
    return { kind: "accepted", boundary: authority.boundary, view: null, diagnostic: "structured snapshot recovery verified" };
  }
}

function verifyIdentity(authority: StructuredRecoveryAuthority, proof: StructuredResumeProof): StructuredReconnectionResult | null {
  if (proof.agentId !== authority.agentId) return rejected("agent-mismatch", new Error("resume proof agent does not match the durable agent identity"));
  if (proof.adapterId !== authority.adapterId) return rejected("adapter-mismatch", new Error("resume proof adapter does not match the durable adapter identity"));
  if (proof.processIdentity !== authority.processIdentity) return rejected("process-mismatch", new Error("resume proof process does not match verified process ownership"));
  if (proof.ownershipProof !== authority.ownershipProof) return rejected("proof-mismatch", new Error("resume ownership proof does not match the persisted authority"));
  return null;
}

function verifySnapshot(agentId: string, snapshotId: string, snapshot: StructuredAgentSnapshot): StructuredReconnectionResult | null {
  try {
    assertStructuredAgentSnapshot(snapshot);
  } catch (error) {
    return rejected("invalid-snapshot", error);
  }
  if (snapshot.snapshotId !== snapshotId) return rejected("invalid-snapshot", new Error("snapshot payload identity does not match the resume boundary"));
  if (snapshot.agentId !== agentId) return rejected("agent-mismatch", new Error("snapshot payload agent does not match the durable agent identity"));
  return null;
}

function restorePosition(reducer: StructuredEventReducer, agentId: string, position: number): StructuredRuntimeView | Extract<StructuredReconnectionResult, { kind: "rejected" }> {
  if (reducer.agentId !== agentId) return rejected("agent-mismatch", new Error("resume reducer agent does not match the durable agent identity"));
  try {
    return reducer.restoreResumeBoundary(position);
  } catch (error) {
    return rejected("invalid-authority", error);
  }
}

function boundaryKeyOf(boundary: StructuredRecoveryAuthority["boundary"]): string {
  return boundary.kind === "position"
    ? `position:${boundary.position}:${boundary.resumeToken}`
    : `snapshot:${boundary.snapshotId}`;
}

function isRejected(value: StructuredRuntimeView | Extract<StructuredReconnectionResult, { kind: "rejected" }>): value is Extract<StructuredReconnectionResult, { kind: "rejected" }> {
  return "kind" in value && value.kind === "rejected";
}

function payloadBytes(payload: unknown): number {
  return new TextEncoder().encode(JSON.stringify(payload)).byteLength;
}

function rejected(code: string, error: unknown): Extract<StructuredReconnectionResult, { kind: "rejected" }> {
  return { kind: "rejected", code, diagnostic: error instanceof Error ? error.message : String(error) };
}
