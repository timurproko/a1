export interface ValidationReceiptOptions {
  repository?: string;
  output?: string;
  head?: string;
  toolchain?: Record<string, unknown>;
}
export interface ValidationReceipt { schema: string; head: string; receiptId: string }
export interface ValidationPackageReceipt extends ValidationReceipt { buildReceiptId: string | null }
/** Records current source, toolchain, complete dist inventory, and validated native identity. */
export function recordBuildReceipt(options?: ValidationReceiptOptions): Promise<ValidationReceipt>;
/** Recomputes all build receipt inputs and artifacts; no readiness flag is trusted. */
export function verifyBuildReceipt(path: string, options?: ValidationReceiptOptions): Promise<ValidationReceipt>;
/** Binds exact tarball bytes and entries to the current head and optional verified build/source authority. */
export function recordPackageReceipt(candidatePath: string, options?: ValidationReceiptOptions & {
  buildReceipt?: string;
  sourceIdentity?: string;
  producer?: { platform: string; architecture: string; node: string };
}): Promise<ValidationPackageReceipt>;
/** Recomputes package identity before permitting same-job reuse. */
export function verifyPackageReceipt(receiptPath: string, candidatePath: string, options?: ValidationReceiptOptions & {
  buildReceipt?: string;
  sourceIdentity?: string;
  producer?: { platform: string; architecture: string; node: string };
}): Promise<ValidationPackageReceipt>;
