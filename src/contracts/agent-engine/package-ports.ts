/** Non-interactive package operations use a caller-chosen profile root before any session exists. */

export type AgentPackageOperation = "install" | "remove" | "update" | "refresh-models" | "list";

/**
 * Why an operation ended, kept separate from the prose so callers can branch on
 * it. `not-found` is the one failure an engine can state structurally — the source
 * is not configured in this profile — rather than only in a message.
 */
export type AgentPackageStatus = "completed" | "not-found" | "failed";

export interface AgentPackageDescriptor {
  readonly source: string;
  readonly installedPath: string | null;
  /** True when the profile enables only part of what the package provides. */
  readonly filtered: boolean;
}

export interface AgentPackageOutcome {
  readonly operation: AgentPackageOperation;
  readonly status: AgentPackageStatus;
  readonly source: string | null;
  readonly packages: readonly AgentPackageDescriptor[];
  readonly detail: string | null;
  /** Update facts distinguish a checked result from skipped or warned work. */
  readonly updateSummary?: {
    readonly offline: boolean;
    readonly warningCount: number;
    readonly changes: readonly string[];
  };
}

export interface AgentPackageProgress {
  readonly operation: AgentPackageOperation;
  readonly message: string;
  readonly severity?: "warning";
}

export interface AgentPackagesPort {
  readonly capabilities: {
    readonly install: boolean;
    readonly remove: boolean;
    readonly update: boolean;
    readonly refreshModels: boolean;
  };
  /** Absolute profile root every operation of this port acts on. */
  readonly profileRoot: string;
  list(): Promise<AgentPackageOutcome>;
  install(source: string): Promise<AgentPackageOutcome>;
  remove(source: string): Promise<AgentPackageOutcome>;
  update(source?: string): Promise<AgentPackageOutcome>;
  refreshModels(): Promise<AgentPackageOutcome>;
}

/** Recoverable operation diagnostics retain the engine's visible detail and order. */
export interface AgentPackageDiagnostic {
  readonly message: string;
  readonly detail?: string;
}

export interface AgentPackagesPortInput {
  readonly profileRoot: string;
  readonly cwd: string;
  readonly onProgress?: (progress: AgentPackageProgress) => void;
  readonly onDiagnostic?: (diagnostic: AgentPackageDiagnostic) => void;
}

export function assertAgentPackagesPort(port: AgentPackagesPort): void {
  if (typeof port?.capabilities !== "object" || port.capabilities === null) throw new TypeError("packages port capabilities are required");
  if (typeof port.profileRoot !== "string" || port.profileRoot.length === 0) throw new TypeError("packages port requires an absolute profile root");
  for (const operation of ["list", "install", "remove", "update", "refreshModels"] as const) {
    if (typeof port[operation] !== "function") throw new TypeError(`packages port requires ${operation}`);
  }
  for (const capability of ["install", "remove", "update", "refreshModels"] as const) {
    if (typeof port.capabilities[capability] !== "boolean") throw new TypeError(`packages capability ${capability} must be explicit`);
  }
}

export function agentPackageOutcome(
  operation: AgentPackageOperation,
  status: AgentPackageStatus,
  detail?: string | null,
  source?: string | null,
  packages: readonly AgentPackageDescriptor[] = [],
  updateSummary?: AgentPackageOutcome["updateSummary"],
): AgentPackageOutcome {
  return Object.freeze({
    operation,
    status,
    source: source ?? null,
    packages: Object.freeze([...packages]),
    detail: detail ?? null,
    ...(updateSummary === undefined ? {} : {
      updateSummary: Object.freeze({ ...updateSummary, changes: Object.freeze([...updateSummary.changes]) }),
    }),
  });
}
