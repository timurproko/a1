export const APPROVED_DELIVERY_HASHES: Readonly<Record<string, string>>;
export const DELIVERY_ROUTE: string;
export function readDeliveryAdapter(): Promise<{ repository: string; baseBranch: string; [key: string]: unknown }>;
export function inspectContractInstallation(root: string, options?: { read?: (path: string) => Promise<string | Buffer> }): Promise<{ passed: boolean; errors: string[] }>;
export function inspectDeliveryScope(changes: readonly { path: string; previousPath?: string }[], options?: { overridesOpenSpec?: boolean }): { blocked: boolean; protectedPaths: string[]; requiresSeparateScope: boolean };
export function inspectCaseBindings(cases: readonly { id: string }[], observations: ReadonlyMap<string, { skipped?: boolean; invokedBoundary?: boolean }>): { passed: boolean; missing: string[]; invalid: string[] };
