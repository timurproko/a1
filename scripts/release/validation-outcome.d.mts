export interface ValidationOutcomeAuthority { schema: "a1-validation-outcome-authority-v1"; head: string; runId: string; runAttempt: number; selectionId: string; job: string; platform: "win32" | "linux" | "darwin"; architecture: "x64" | "arm64"; node: 22 | 24; partition?: string; owners: string[]; requested: string[]; selected: string[]; jobStartedAt: number; cacheState: string }
export const PARTITION: RegExp;
export function validationOutcomeAuthority(environment: NodeJS.ProcessEnv, requested: string[], selected: string[]): ValidationOutcomeAuthority | null;
export function assertValidationOutcomeAuthority(value: unknown): ValidationOutcomeAuthority;
