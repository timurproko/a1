import {
  assertStructuredCapability,
  type StructuredCapabilityContract,
} from "../../contracts/workspace/index.js";

export type StructuredBackpressureResource = "events" | "commands" | "snapshots" | "attachments" | "reconnect-replay";
export type StructuredBackpressureAction = "none" | "reject-payload" | "pause-adapter" | "reject-request" | "disconnect-adapter";

export interface StructuredResourceLease {
  readonly id: string;
  readonly resource: StructuredBackpressureResource;
  readonly units: number;
  readonly bytes: number;
}

export interface StructuredResourceUsage {
  readonly resource: StructuredBackpressureResource;
  readonly units: number;
  readonly bytes: number;
  readonly unitLimit: number;
  readonly byteLimit: number;
}

export type StructuredBackpressureAcquireResult =
  | { readonly kind: "accepted"; readonly lease: StructuredResourceLease; readonly usage: StructuredResourceUsage }
  | {
    readonly kind: "rejected";
    readonly code: "invalid-request" | "payload-too-large" | "resource-exhausted" | "replay-exhausted";
    readonly action: Exclude<StructuredBackpressureAction, "none">;
    readonly usage: StructuredResourceUsage;
    readonly diagnostic: string;
  };

export type StructuredBackpressureReleaseResult =
  | { readonly kind: "released"; readonly usage: StructuredResourceUsage }
  | { readonly kind: "rejected"; readonly code: "unknown-lease" | "invalid-request"; readonly diagnostic: string };

interface ResourceBudget {
  readonly unitLimit: number;
  readonly byteLimit: number;
  readonly perPayloadByteLimit: number;
  readonly action: Exclude<StructuredBackpressureAction, "none" | "reject-payload">;
}

interface MutableUsage {
  units: number;
  bytes: number;
}

export class StructuredBackpressureController {
  readonly #budgets: Readonly<Record<StructuredBackpressureResource, ResourceBudget>>;
  readonly #usage: Record<StructuredBackpressureResource, MutableUsage> = {
    events: { units: 0, bytes: 0 },
    commands: { units: 0, bytes: 0 },
    snapshots: { units: 0, bytes: 0 },
    attachments: { units: 0, bytes: 0 },
    "reconnect-replay": { units: 0, bytes: 0 },
  };
  readonly #leases = new Map<string, StructuredResourceLease>();
  #nextLeaseSequence = 0;
  #replayExhausted = false;

  constructor(readonly adapterId: string, capability: StructuredCapabilityContract) {
    assertStructuredCapability(capability);
    if (!adapterId || adapterId !== capability.adapterId) throw new TypeError("structured backpressure adapter identity is invalid");
    this.#budgets = Object.freeze({
      events: budget(capability.flow.maxQueuedEvents, capability.flow.maxQueuedEvents * capability.flow.maxEventBytes, capability.flow.maxEventBytes, "pause-adapter"),
      commands: budget(capability.flow.maxConcurrentCommands, capability.flow.maxConcurrentCommands * capability.flow.maxEventBytes, capability.flow.maxEventBytes, "reject-request"),
      snapshots: budget(1, capability.flow.maxSnapshotBytes, capability.flow.maxSnapshotBytes, "reject-request"),
      attachments: budget(capability.flow.maxConcurrentCommands, capability.flow.maxAttachmentBytes, capability.flow.maxAttachmentBytes, "reject-request"),
      "reconnect-replay": budget(capability.flow.maxReconnectEvents, capability.flow.maxReconnectEvents * capability.flow.maxEventBytes, capability.flow.maxEventBytes, "disconnect-adapter"),
    });
  }

  acquire(resource: StructuredBackpressureResource, units = 1, bytes = 0): StructuredBackpressureAcquireResult {
    const budget = this.#budget(resource);
    if (!isPositiveSafeInteger(units) || !isSafeNonNegativeInteger(bytes)) {
      return this.#reject(resource, "invalid-request", "reject-request", "resource units and bytes must be bounded safe integers");
    }
    if (bytes > budget.perPayloadByteLimit) {
      return this.#reject(resource, "payload-too-large", "reject-payload", `${resource} payload exceeds its negotiated ${budget.perPayloadByteLimit} byte limit`);
    }
    if (resource === "reconnect-replay" && this.#replayExhausted) {
      return this.#reject(resource, "replay-exhausted", "disconnect-adapter", "reconnect replay is already exhausted for this adapter");
    }

    const usage = this.#usage[resource];
    if (usage.units + units > budget.unitLimit || usage.bytes + bytes > budget.byteLimit) {
      if (resource === "reconnect-replay") {
        this.#replayExhausted = true;
        return this.#reject(resource, "replay-exhausted", "disconnect-adapter", "reconnect replay exceeded its negotiated event or byte window");
      }
      return this.#reject(resource, "resource-exhausted", budget.action, `${resource} exceeded its negotiated count or byte window`);
    }

    usage.units += units;
    usage.bytes += bytes;
    this.#nextLeaseSequence += 1;
    const lease = Object.freeze({
      id: `lease-${this.adapterId}-${this.#nextLeaseSequence}`,
      resource,
      units,
      bytes,
    });
    this.#leases.set(lease.id, lease);
    return { kind: "accepted", lease, usage: this.usage(resource) };
  }

  release(lease: StructuredResourceLease): StructuredBackpressureReleaseResult {
    if (!lease || typeof lease.id !== "string" || !isPositiveSafeInteger(lease.units) || !isSafeNonNegativeInteger(lease.bytes)) {
      return { kind: "rejected", code: "invalid-request", diagnostic: "resource lease is malformed" };
    }
    const owned = this.#leases.get(lease.id);
    if (!owned || owned.resource !== lease.resource || owned.units !== lease.units || owned.bytes !== lease.bytes) {
      return { kind: "rejected", code: "unknown-lease", diagnostic: `resource lease is unknown: ${lease.id}` };
    }
    this.#leases.delete(lease.id);
    const usage = this.#usage[lease.resource];
    usage.units -= lease.units;
    usage.bytes -= lease.bytes;
    return { kind: "released", usage: this.usage(lease.resource) };
  }

  resetReconnectReplay(): void {
    const usage = this.#usage["reconnect-replay"];
    usage.units = 0;
    usage.bytes = 0;
    this.#replayExhausted = false;
    for (const [id, lease] of this.#leases) {
      if (lease.resource === "reconnect-replay") this.#leases.delete(id);
    }
  }

  usage(resource: StructuredBackpressureResource): StructuredResourceUsage {
    const usage = this.#usage[resource];
    const budget = this.#budget(resource);
    return Object.freeze({
      resource,
      units: usage.units,
      bytes: usage.bytes,
      unitLimit: budget.unitLimit,
      byteLimit: budget.byteLimit,
    });
  }

  leaseCount(): number {
    return this.#leases.size;
  }

  replayExhausted(): boolean {
    return this.#replayExhausted;
  }

  #budget(resource: StructuredBackpressureResource): ResourceBudget {
    const budget = this.#budgets[resource];
    if (!budget) throw new TypeError(`unknown structured backpressure resource: ${String(resource)}`);
    return budget;
  }

  #reject(
    resource: StructuredBackpressureResource,
    code: "invalid-request" | "payload-too-large" | "resource-exhausted" | "replay-exhausted",
    action: Exclude<StructuredBackpressureAction, "none">,
    diagnostic: string,
  ): Extract<StructuredBackpressureAcquireResult, { kind: "rejected" }> {
    return { kind: "rejected", code, action, usage: this.usage(resource), diagnostic };
  }
}

function budget(unitLimit: number, byteLimit: number, perPayloadByteLimit: number, action: ResourceBudget["action"]): ResourceBudget {
  return Object.freeze({ unitLimit, byteLimit, perPayloadByteLimit, action });
}

function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function isSafeNonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
