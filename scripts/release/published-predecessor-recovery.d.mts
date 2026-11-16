export interface LegacyHeartbeatCrash {
  readonly pid: number;
  readonly transactionId: string;
  readonly recoveryEntryDigest: string;
  readonly code: string;
  readonly syscall: string;
  readonly ownerPath: string;
}
export interface LegacyRecoveryObservation {
  readonly environment: NodeJS.ProcessEnv;
  readFailure(): Promise<LegacyHeartbeatCrash | null>;
}
export interface LegacyRecoveryContext {
  readonly root: string;
  readonly packageRoot: string;
  readonly dataDir: string;
  readonly version: string;
  readonly environment: NodeJS.ProcessEnv;
}
export function prepareLegacyRecoveryObservation(context: LegacyRecoveryContext & {
  platform?: NodeJS.Platform;
  knownDigests?: ReadonlySet<string>;
}): Promise<LegacyRecoveryObservation | null>;
export function readLegacyHeartbeatCrash(context: Omit<LegacyRecoveryContext, "root" | "environment"> & {
  directory: string;
  knownDigests?: ReadonlySet<string>;
}): Promise<LegacyHeartbeatCrash | null>;
