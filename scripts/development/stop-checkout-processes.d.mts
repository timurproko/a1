export interface CheckoutProcess { pid: number; commandLine: string | null | undefined }
export interface CheckoutStopOptions {
  root?: string;
  environment?: NodeJS.ProcessEnv;
  list?: () => readonly CheckoutProcess[];
  terminate?: (pid: number) => void;
  sleep?: (durationMs: number) => Promise<void>;
  passLimit?: number;
}
export interface CheckoutStopResult { stopped: number[]; survivors: number[] }
export const STOP_PASS_LIMIT: number;
export const STOP_PASS_DELAY_MS: number;
export function developmentCheckoutId(root?: string): string;
export function checkoutCodeRoots(root?: string): string[];
export function selectCheckoutProcesses(processes: readonly CheckoutProcess[], root?: string, self?: number): CheckoutProcess[];
export function stopCheckoutProcesses(options?: CheckoutStopOptions): Promise<CheckoutStopResult>;
export function describeSurvivors(survivors: readonly number[]): string;
