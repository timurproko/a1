export interface CheckoutProcess { pid: number; commandLine: string | null | undefined }
export function developmentCheckoutId(root?: string): string;
export function checkoutCodeRoots(root?: string): string[];
export function selectCheckoutProcesses(processes: readonly CheckoutProcess[], root?: string, self?: number): CheckoutProcess[];
export function stopCheckoutProcesses(options?: { root?: string; environment?: NodeJS.ProcessEnv }): number[];
