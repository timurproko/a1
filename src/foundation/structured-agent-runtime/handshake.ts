import {
  WORKSPACE_CONTRACT_VERSION,
  assertStructuredCapability,
  type AdapterId,
  type StructuredCapabilityContract,
  type StructuredFlowLimits,
} from "../workspace-contracts/index.js";

export const STRUCTURED_ADAPTER_ENVELOPE = "addone-structured-adapter" as const;
export const STRUCTURED_ADAPTER_ENVELOPE_REVISION = 1 as const;
export const REQUIRED_STRUCTURED_FEATURES = [
  "identity.adapter.v1",
  "commands.correlated.v1",
  "events.typed.v1",
  "flow-control.limits.v1",
] as const;
export const OPTIONAL_STRUCTURED_FEATURES = [
  "snapshots.authoritative.v1",
  "resume.position.v1",
  "resume.snapshot.v1",
  "commands.cancellable.v1",
  "attachments.typed.v1",
] as const;
export type StructuredProtocolFeature = typeof REQUIRED_STRUCTURED_FEATURES[number] | typeof OPTIONAL_STRUCTURED_FEATURES[number];

export const ADDONE_STRUCTURED_FLOW_LIMITS: StructuredFlowLimits = Object.freeze({
  maxEventBytes: 64 * 1024,
  maxSnapshotBytes: 1024 * 1024,
  maxAttachmentBytes: 2 * 1024 * 1024,
  maxQueuedEvents: 256,
  maxConcurrentCommands: 4,
  maxReconnectEvents: 1024,
});

export interface StructuredAdapterHello {
  readonly envelope: typeof STRUCTURED_ADAPTER_ENVELOPE;
  readonly envelopeRevision: typeof STRUCTURED_ADAPTER_ENVELOPE_REVISION;
  readonly adapterId: AdapterId;
  readonly buildId: string;
  readonly requiredFeatures: readonly string[];
  readonly optionalFeatures: readonly string[];
  readonly capability: StructuredCapabilityContract;
}

export interface StructuredAdapterPeerHello {
  readonly envelope: typeof STRUCTURED_ADAPTER_ENVELOPE;
  readonly envelopeRevision: typeof STRUCTURED_ADAPTER_ENVELOPE_REVISION;
  readonly requiredFeatures: readonly string[];
  readonly optionalFeatures: readonly string[];
  readonly flowLimits: StructuredFlowLimits;
}

export type StructuredHandshakeErrorCode =
  | "invalid-message"
  | "unsupported-version"
  | "invalid-identity"
  | "invalid-capability"
  | "unsupported-feature"
  | "incompatible-features";

export interface StructuredHandshakeAccepted {
  readonly accepted: true;
  readonly adapterId: AdapterId;
  readonly negotiatedFeatures: readonly string[];
  readonly capability: StructuredCapabilityContract;
  readonly diagnostic: string;
}

export interface StructuredHandshakeRejected {
  readonly accepted: false;
  readonly code: StructuredHandshakeErrorCode;
  readonly missingFromAdapter: readonly string[];
  readonly missingFromServer: readonly string[];
  readonly diagnostic: string;
}

export type StructuredHandshakeResult = StructuredHandshakeAccepted | StructuredHandshakeRejected;

export function localStructuredAdapterHello(): StructuredAdapterPeerHello {
  return {
    envelope: STRUCTURED_ADAPTER_ENVELOPE,
    envelopeRevision: STRUCTURED_ADAPTER_ENVELOPE_REVISION,
    requiredFeatures: REQUIRED_STRUCTURED_FEATURES,
    optionalFeatures: OPTIONAL_STRUCTURED_FEATURES,
    flowLimits: ADDONE_STRUCTURED_FLOW_LIMITS,
  };
}

export function negotiateStructuredAdapter(
  value: unknown,
  server: StructuredAdapterPeerHello = localStructuredAdapterHello(),
): StructuredHandshakeResult {
  if (!isStructuredAdapterHello(value)) {
    return reject("invalid-message", [], [], "adapter hello is malformed or omits required identity, feature, or capability fields");
  }
  if (value.envelope !== server.envelope || value.envelopeRevision !== server.envelopeRevision) {
    return reject(
      "unsupported-version",
      [],
      [],
      `structured adapter envelope mismatch: adapter ${String(value.envelope)}/${String(value.envelopeRevision)}; AddOne ${server.envelope}/${server.envelopeRevision}`,
    );
  }
  if (!isValidIdentityText(value.adapterId) || !isValidBuildId(value.buildId)) {
    return reject("invalid-identity", [], [], "adapter identity and build identity must be bounded non-empty values");
  }
  if (value.capability.adapterId !== value.adapterId) {
    return reject("invalid-identity", [], [], "adapter capability identity must match the hello identity");
  }
  try {
    assertStructuredCapability(value.capability);
  } catch (error) {
    return reject("invalid-capability", [], [], `adapter capability is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }

  const advertised = featureSet(value.requiredFeatures, value.optionalFeatures);
  if (advertised.error) return advertised.error;
  const serverFeatures = new Set([...server.requiredFeatures, ...server.optionalFeatures]);
  const adapterRequired = new Set(value.requiredFeatures);
  const unknownRequired = [...adapterRequired].filter(feature => !serverFeatures.has(feature));
  if (unknownRequired.length > 0) {
    return reject(
      "unsupported-feature",
      [],
      unknownRequired.sort(),
      `adapter requires unsupported structured features: ${unknownRequired.sort().join(", ")}`,
    );
  }
  const missingFromAdapter = server.requiredFeatures.filter(feature => !advertised.features.has(feature)).sort();
  const missingFromServer = [...adapterRequired].filter(feature => !serverFeatures.has(feature)).sort();
  if (missingFromAdapter.length > 0 || missingFromServer.length > 0) {
    return reject(
      "incompatible-features",
      missingFromAdapter,
      missingFromServer,
      `required structured features are unavailable; adapter missing [${missingFromAdapter.join(", ")}], AddOne missing [${missingFromServer.join(", ")}]`,
    );
  }

  const capabilityFeatures = requiredFeaturesForCapability(value.capability);
  const undeclared = capabilityFeatures.filter(feature => !advertised.features.has(feature));
  if (undeclared.length > 0) {
    return reject(
      "invalid-capability",
      undeclared.sort(),
      [],
      `adapter capability requires undeclared features: ${undeclared.sort().join(", ")}`,
    );
  }

  const negotiatedFeatures = [...advertised.features].filter(feature => serverFeatures.has(feature)).sort();
  const capability: StructuredCapabilityContract = {
    ...value.capability,
    adapterId: value.adapterId,
    flow: negotiateFlow(value.capability.flow, server.flowLimits),
  };
  return {
    accepted: true,
    adapterId: value.adapterId,
    negotiatedFeatures,
    capability,
    diagnostic: `structured adapter ready; negotiated ${negotiatedFeatures.join(", ")}`,
  };
}

function requiredFeaturesForCapability(capability: StructuredCapabilityContract): string[] {
  const features: string[] = [];
  if (capability.snapshots === "authoritative") features.push("snapshots.authoritative.v1");
  if (capability.resume === "position") features.push("resume.position.v1");
  if (capability.resume === "snapshot") features.push("resume.snapshot.v1");
  if (capability.cancellation === "correlated") features.push("commands.cancellable.v1");
  if (capability.attachmentTypes.length > 0) features.push("attachments.typed.v1");
  return features;
}

function negotiateFlow(adapter: StructuredFlowLimits, addone: StructuredFlowLimits): StructuredFlowLimits {
  return Object.freeze({
    maxEventBytes: Math.min(adapter.maxEventBytes, addone.maxEventBytes),
    maxSnapshotBytes: Math.min(adapter.maxSnapshotBytes, addone.maxSnapshotBytes),
    maxAttachmentBytes: Math.min(adapter.maxAttachmentBytes, addone.maxAttachmentBytes),
    maxQueuedEvents: Math.min(adapter.maxQueuedEvents, addone.maxQueuedEvents),
    maxConcurrentCommands: Math.min(adapter.maxConcurrentCommands, addone.maxConcurrentCommands),
    maxReconnectEvents: Math.min(adapter.maxReconnectEvents, addone.maxReconnectEvents),
  });
}

function isStructuredAdapterHello(value: unknown): value is StructuredAdapterHello {
  if (!isRecord(value)) return false;
  return typeof value.envelope === "string"
    && typeof value.envelopeRevision === "number"
    && typeof value.adapterId === "string"
    && typeof value.buildId === "string"
    && isStringArray(value.requiredFeatures)
    && isStringArray(value.optionalFeatures)
    && isRecord(value.capability)
    && value.capability.kind === "structured"
    && typeof value.capability.protocolVersion === "number";
}

function featureSet(required: readonly string[], optional: readonly string[]): { readonly features: Set<string>; readonly error: StructuredHandshakeRejected | null } {
  const features = new Set<string>();
  for (const feature of [...required, ...optional]) {
    if (!isValidIdentityText(feature)) {
      return { features, error: reject("invalid-message", [], [], `structured feature name is invalid: ${feature}`) };
    }
    if (features.has(feature)) {
      return { features, error: reject("invalid-message", [], [], `structured feature is declared more than once: ${feature}`) };
    }
    features.add(feature);
  }
  return { features, error: null };
}

function reject(
  code: StructuredHandshakeErrorCode,
  missingFromAdapter: readonly string[],
  missingFromServer: readonly string[],
  diagnostic: string,
): StructuredHandshakeRejected {
  return { accepted: false, code, missingFromAdapter, missingFromServer, diagnostic };
}

function isValidIdentityText(value: string): boolean {
  return value.length > 0 && value.length <= 128 && !value.includes("\0");
}

function isValidBuildId(value: string): boolean {
  return value.length > 0 && value.length <= 256 && !value.includes("\0");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string");
}
