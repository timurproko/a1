export const REGISTRY_VERIFICATION_ATTEMPTS: 180;
export const REGISTRY_VERIFICATION_INTERVAL_MS: 10000;
export const REGISTRY_REQUEST_TIMEOUT_MS: 30000;
export const REGISTRY_TARBALL_MAX_BYTES: number;

export interface RegistryPackageIdentity {
  readonly name: string;
  readonly integrity: string;
  readonly shasum: string;
}

export interface PublishedPairVerificationOptions {
  readonly packages: readonly RegistryPackageIdentity[];
  readonly version: string;
  readonly channel: "latest" | "next" | string;
  readonly fetch?: (url: string | URL, init?: RequestInit) => Promise<Response>;
  readonly sleep?: (durationMs: number) => Promise<void>;
  readonly now?: () => number;
  readonly report?: (message: string) => void;
  readonly attempts?: number;
  readonly intervalMs?: number;
  readonly requestTimeoutMs?: number;
  readonly maxTarballBytes?: number;
}

export function verifyPublishedPair(options: PublishedPairVerificationOptions): Promise<{
  version: string;
  channel: "latest" | "next";
  packages: string[];
}>;
