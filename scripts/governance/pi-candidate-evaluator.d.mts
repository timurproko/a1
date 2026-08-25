export interface PiCandidateRequest {
  readonly packages: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
}
export interface PiCandidateStage { readonly stage: string; readonly passed: boolean; readonly detail: string; }
export interface PiCandidateReport {
  readonly schema: "pi-candidate-migration-report-v1";
  readonly packages: Readonly<Record<string, string>>;
  readonly passed: boolean;
  readonly stages: readonly PiCandidateStage[];
  readonly migrations: readonly { readonly stage: string; readonly message: string }[];
}
export interface PiCandidateOperations {
  readonly install: (root: string, packages: Readonly<Record<string, string>>, signal: AbortSignal) => Promise<string | void>;
  readonly compile: (root: string, packages: Readonly<Record<string, string>>, signal: AbortSignal) => Promise<string | void>;
  readonly runtime: (root: string, packages: Readonly<Record<string, string>>, signal: AbortSignal) => Promise<string | void>;
}
export function evaluatePiCandidate(request: PiCandidateRequest, options?: {
  readonly repository?: string;
  readonly createRoot?: () => Promise<string>;
  readonly operations?: PiCandidateOperations;
  readonly cleanup?: (root: string) => Promise<void>;
}): Promise<PiCandidateReport>;
