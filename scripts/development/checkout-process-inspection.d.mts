export interface ProcessSnapshot {
  readonly pid: number;
  readonly parent: number;
  readonly start: string;
  readonly executable: string;
  readonly argv: readonly string[];
}
export interface CheckoutProcess extends Omit<ProcessSnapshot, "argv"> { readonly script: string; readonly protected: boolean }
export function commandArguments(line: string): string[];
export function listSystemProcesses(options?: { deadline?: number }): Promise<ProcessSnapshot[]>;
export function checkoutProcessInventory(rows: readonly ProcessSnapshot[], root: string, self?: number): CheckoutProcess[];
export function inspectCheckoutProcesses(root: string, options?: { list?: () => Promise<ProcessSnapshot[]>; self?: number; deadline?: number }): Promise<CheckoutProcess[]>;
export function stopCheckoutDevelopmentProcesses(root: string, options?: {
  list?: () => Promise<ProcessSnapshot[]>;
  terminate?: (process: CheckoutProcess) => Promise<void>;
  self?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  passes?: number;
  deadline?: number;
}): Promise<{ stopped: number[]; survivors: number[] }>;
