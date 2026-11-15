import type { ProcessSnapshot } from "../development/checkout-process-inspection.mjs";
import type { SmokeRunner } from "./smoke-published-installer.mjs";
export function createPublishedSmokeRunner(root: string, options?: {
  list?: (options?: { deadline?: number }) => Promise<ProcessSnapshot[]>;
  terminate?: (record: ProcessSnapshot, options?: { deadline?: number }) => Promise<void>;
  pause?: (milliseconds: number) => Promise<void>;
  self?: number;
}): SmokeRunner;
