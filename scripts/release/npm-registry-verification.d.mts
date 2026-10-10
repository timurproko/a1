export const REGISTRY_VERIFICATION_ATTEMPTS: 60;
export const REGISTRY_VERIFICATION_INTERVAL_MS: 10000;

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
}

export function verifyPublishedPair(options: PublishedPairVerificationOptions): Promise<{
  version: string;
  channel: "latest" | "next";
  packages: string[];
}>;
