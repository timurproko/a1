import { describe, expect, it } from "vitest";
import {
  ADDONE_STRUCTURED_FLOW_LIMITS,
  OPTIONAL_STRUCTURED_FEATURES,
  REQUIRED_STRUCTURED_FEATURES,
  STRUCTURED_ADAPTER_ENVELOPE,
  STRUCTURED_ADAPTER_ENVELOPE_REVISION,
  negotiateStructuredAdapter,
  type StructuredAdapterHello,
  type StructuredHandshakeAccepted,
} from "../../../src/foundation/structured-agent-runtime/index.js";
import { WORKSPACE_CONTRACT_VERSION, type StructuredCapabilityContract } from "../../../src/foundation/workspace-contracts/index.js";

function capability(overrides: Partial<StructuredCapabilityContract> = {}): StructuredCapabilityContract {
  return {
    kind: "structured",
    protocolVersion: WORKSPACE_CONTRACT_VERSION,
    adapterId: "adapter.synthetic",
    commands: ["prompt", "inspect"],
    eventTypes: ["message", "tool-call"],
    snapshots: "authoritative",
    resume: "position",
    cancellation: "correlated",
    attachmentTypes: ["text", "json"],
    flow: {
      maxEventBytes: 128 * 1024,
      maxSnapshotBytes: 512 * 1024,
      maxAttachmentBytes: 4 * 1024 * 1024,
      maxQueuedEvents: 512,
      maxConcurrentCommands: 2,
      maxReconnectEvents: 2048,
    },
    ...overrides,
  };
}

function hello(overrides: Partial<StructuredAdapterHello> = {}): StructuredAdapterHello {
  return {
    envelope: STRUCTURED_ADAPTER_ENVELOPE,
    envelopeRevision: STRUCTURED_ADAPTER_ENVELOPE_REVISION,
    adapterId: "adapter.synthetic",
    buildId: "synthetic-2026-08-13",
    requiredFeatures: [...REQUIRED_STRUCTURED_FEATURES],
    optionalFeatures: [...OPTIONAL_STRUCTURED_FEATURES],
    capability: capability(),
    ...overrides,
  };
}

function accepted(result: ReturnType<typeof negotiateStructuredAdapter>): StructuredHandshakeAccepted {
  if (!result.accepted) throw new Error(`expected accepted handshake, got ${result.code}: ${result.diagnostic}`);
  return result;
}

describe("structured adapter handshake", () => {
  it("accepts a compatible adapter and negotiates identity, features, capabilities, and bounded flow", () => {
    const result = accepted(negotiateStructuredAdapter(hello()));
    expect(result.adapterId).toBe("adapter.synthetic");
    expect(result.capability.adapterId).toBe("adapter.synthetic");
    expect(result.capability.commands).toEqual(["prompt", "inspect"]);
    expect(result.capability.eventTypes).toEqual(["message", "tool-call"]);
    expect(result.capability.snapshots).toBe("authoritative");
    expect(result.capability.resume).toBe("position");
    expect(result.capability.cancellation).toBe("correlated");
    expect(result.capability.attachmentTypes).toEqual(["text", "json"]);
    expect(result.capability.flow).toEqual({
      ...ADDONE_STRUCTURED_FLOW_LIMITS,
      maxSnapshotBytes: 512 * 1024,
      maxConcurrentCommands: 2,
    });
    for (const feature of [...REQUIRED_STRUCTURED_FEATURES, ...OPTIONAL_STRUCTURED_FEATURES]) {
      expect(result.negotiatedFeatures).toContain(feature);
    }
  });

  it("accepts a minimal adapter that negotiates no optional recovery, cancellation, or attachment features", () => {
    const result = accepted(negotiateStructuredAdapter(hello({
      optionalFeatures: [],
      capability: capability({ snapshots: "none", resume: "none", cancellation: "none", attachmentTypes: [] }),
    })));
    expect(result.negotiatedFeatures).toEqual([...REQUIRED_STRUCTURED_FEATURES].sort());
    expect(result.capability).toMatchObject({ snapshots: "none", resume: "none", cancellation: "none", attachmentTypes: [] });
  });

  it("ignores unknown additive optional features but rejects unknown required features", () => {
    const withOptional = accepted(negotiateStructuredAdapter(hello({ optionalFeatures: [...OPTIONAL_STRUCTURED_FEATURES, "future.optional.v1"] })));
    expect(withOptional.negotiatedFeatures).not.toContain("future.optional.v1");

    const rejected = negotiateStructuredAdapter(hello({ requiredFeatures: [...REQUIRED_STRUCTURED_FEATURES, "future.required.v1"] }));
    expect(rejected).toMatchObject({ accepted: false, code: "unsupported-feature", missingFromServer: ["future.required.v1"] });
  });

  it("rejects missing AddOne-required features with actionable diagnostics", () => {
    const rejected = negotiateStructuredAdapter(hello({ requiredFeatures: ["identity.adapter.v1"], optionalFeatures: ["events.typed.v1"] }));
    expect(rejected.accepted).toBe(false);
    if (rejected.accepted) return;
    expect(rejected.code).toBe("incompatible-features");
    expect(rejected.missingFromAdapter).toEqual(["commands.correlated.v1", "flow-control.limits.v1"]);
    expect(rejected.diagnostic).toContain("required structured features are unavailable");
  });

  it("rejects unsupported protocol envelopes and capability versions without partial readiness", () => {
    expect(negotiateStructuredAdapter({ ...hello(), envelopeRevision: 2 })).toMatchObject({ accepted: false, code: "unsupported-version" });
    expect(negotiateStructuredAdapter(hello({ capability: capability({ protocolVersion: 2 as 1 }) }))).toMatchObject({ accepted: false, code: "invalid-capability" });
  });

  it("rejects invalid or mismatched adapter identity", () => {
    expect(negotiateStructuredAdapter(hello({ adapterId: "" }))).toMatchObject({ accepted: false, code: "invalid-identity" });
    expect(negotiateStructuredAdapter(hello({ buildId: "" }))).toMatchObject({ accepted: false, code: "invalid-identity" });
    expect(negotiateStructuredAdapter(hello({ adapterId: "adapter.other" }))).toMatchObject({ accepted: false, code: "invalid-identity" });
  });

  it("rejects contradictory snapshot and resume declarations", () => {
    const result = negotiateStructuredAdapter(hello({ capability: capability({ snapshots: "none", resume: "position" }) }));
    expect(result).toMatchObject({ accepted: false, code: "invalid-capability" });
    expect(result.diagnostic).toContain("authoritative snapshots");
  });

  it("rejects duplicate, malformed, or zero-valued capability declarations", () => {
    expect(negotiateStructuredAdapter(hello({ capability: capability({ commands: ["prompt", "prompt"] }) }))).toMatchObject({ accepted: false, code: "invalid-capability" });
    expect(negotiateStructuredAdapter(hello({ capability: capability({ eventTypes: ["message", "message"] }) }))).toMatchObject({ accepted: false, code: "invalid-capability" });
    expect(negotiateStructuredAdapter(hello({ capability: capability({ attachmentTypes: ["json", "json"] }) }))).toMatchObject({ accepted: false, code: "invalid-capability" });
    expect(negotiateStructuredAdapter(hello({
      capability: capability({ flow: { ...capability().flow, maxEventBytes: 0 } }),
    }))).toMatchObject({ accepted: false, code: "invalid-capability" });
  });

  it("requires capability-derived optional features to be advertised before readiness", () => {
    const result = negotiateStructuredAdapter(hello({ optionalFeatures: [] }));
    expect(result).toMatchObject({ accepted: false, code: "invalid-capability" });
    expect(result.diagnostic).toContain("undeclared features");
  });

  it("rejects malformed or duplicated hello messages without throwing", () => {
    expect(negotiateStructuredAdapter(null)).toMatchObject({ accepted: false, code: "invalid-message" });
    expect(negotiateStructuredAdapter({ type: "structured-hello" })).toMatchObject({ accepted: false, code: "invalid-message" });
    const duplicated = negotiateStructuredAdapter(hello({ requiredFeatures: ["identity.adapter.v1"], optionalFeatures: ["identity.adapter.v1"] }));
    expect(duplicated).toMatchObject({ accepted: false, code: "invalid-message" });
    expect(duplicated.diagnostic).toContain("declared more than once");
  });
});
