import type { CheckoutProcess } from "../development/checkout-process-inspection.mjs";
export interface CleanupBlocker { reason: string; paths?: string[]; pids?: number[] }
export function cleanupPreflight(identity: unknown, entry: { path: string }, options?: {
  inspect?: (identity: unknown, entry: { path: string }, options: unknown) => Promise<{ clean: boolean; reason?: string; paths?: string[] }>;
  inspectProcesses?: (path: string, options?: { deadline?: number }) => Promise<CheckoutProcess[]>;
  [key: string]: unknown;
}): Promise<{ clean: boolean; reason?: string; paths?: string[]; blockers: CleanupBlocker[]; developmentProcesses: Omit<CheckoutProcess, "executable">[] }>;
