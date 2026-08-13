import {
  OPTIONAL_STRUCTURED_FEATURES,
  REQUIRED_STRUCTURED_FEATURES,
  STRUCTURED_ADAPTER_ENVELOPE,
  STRUCTURED_ADAPTER_ENVELOPE_REVISION,
  type StructuredAdapterHello,
} from "../../../src/foundation/structured-agent-runtime/index.js";
import {
  WORKSPACE_CONTRACT_VERSION,
  type StructuredAgentSnapshot,
  type StructuredCapabilityContract,
  type StructuredRecoveryAuthority,
} from "../../../src/foundation/workspace-contracts/index.js";

export interface SyntheticAdapterOptions {
  readonly adapterId: string;
  readonly resume?: "none" | "position" | "snapshot";
  readonly snapshots?: "none" | "authoritative";
}

export class SyntheticStructuredAdapter {
  readonly capability: StructuredCapabilityContract;
  readonly processIdentity: string;
  readonly ownershipProof: string;

  constructor(options: SyntheticAdapterOptions) {
    const snapshots = options.snapshots ?? "authoritative";
    const resume = options.resume ?? "position";
    this.capability = {
      kind: "structured",
      protocolVersion: WORKSPACE_CONTRACT_VERSION,
      adapterId: options.adapterId,
      commands: ["prompt", "inspect"],
      eventTypes: ["message", "tool-call"],
      snapshots,
      resume,
      cancellation: "correlated",
      attachmentTypes: ["json"],
      flow: {
        maxEventBytes: 4_096,
        maxSnapshotBytes: 16_384,
        maxAttachmentBytes: 32_768,
        maxQueuedEvents: 2,
        maxConcurrentCommands: 2,
        maxReconnectEvents: 64,
      },
    };
    this.processIdentity = `pid:${options.adapterId}:start:1`;
    this.ownershipProof = `proof:${options.adapterId}`;
  }

  hello(): StructuredAdapterHello {
    return {
      envelope: STRUCTURED_ADAPTER_ENVELOPE,
      envelopeRevision: STRUCTURED_ADAPTER_ENVELOPE_REVISION,
      adapterId: this.capability.adapterId,
      buildId: "synthetic-adapter-1",
      requiredFeatures: [...REQUIRED_STRUCTURED_FEATURES],
      optionalFeatures: [...OPTIONAL_STRUCTURED_FEATURES],
      capability: this.capability,
    };
  }

  positionAuthority(agentId: string, position: number): StructuredRecoveryAuthority {
    return {
      kind: "structured",
      referenceId: `recovery-${agentId}-${position}`,
      agentId,
      adapterId: this.capability.adapterId,
      processIdentity: this.processIdentity,
      ownershipProof: this.ownershipProof,
      boundary: { kind: "position", position, resumeToken: `resume-${agentId}-${position}` },
    };
  }

  snapshotAuthority(agentId: string, snapshot: StructuredAgentSnapshot): StructuredRecoveryAuthority {
    return {
      kind: "structured",
      referenceId: `recovery-${snapshot.snapshotId}`,
      agentId,
      adapterId: this.capability.adapterId,
      processIdentity: this.processIdentity,
      ownershipProof: this.ownershipProof,
      boundary: { kind: "snapshot", snapshotId: snapshot.snapshotId },
    };
  }

  proof(authority: StructuredRecoveryAuthority, snapshot?: StructuredAgentSnapshot) {
    if (authority.boundary.kind === "position") {
      return {
        protocolVersion: WORKSPACE_CONTRACT_VERSION,
        agentId: authority.agentId,
        adapterId: authority.adapterId,
        processIdentity: authority.processIdentity,
        ownershipProof: authority.ownershipProof,
        boundary: { kind: "position" as const, position: authority.boundary.position, resumeToken: authority.boundary.resumeToken },
      };
    }
    if (!snapshot) throw new Error("snapshot proof requires a snapshot");
    return {
      protocolVersion: WORKSPACE_CONTRACT_VERSION,
      agentId: authority.agentId,
      adapterId: authority.adapterId,
      processIdentity: authority.processIdentity,
      ownershipProof: authority.ownershipProof,
      boundary: { kind: "snapshot" as const, snapshotId: authority.boundary.snapshotId, snapshot },
    };
  }
}
