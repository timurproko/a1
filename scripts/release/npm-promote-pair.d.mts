import type { PublishedPairVerificationOptions, RegistryPackageIdentity, verifyPublishedPair } from "./npm-registry-verification.mjs";
export function promotePublishedPair(options: {
  packages: readonly RegistryPackageIdentity[];
  version: string;
  channel: "next" | "latest";
  smokeResult: string;
  environment?: NodeJS.ProcessEnv;
  fetch?: (url: string | URL, init?: RequestInit) => Promise<Response>;
  verify?: (options: PublishedPairVerificationOptions) => ReturnType<typeof verifyPublishedPair>;
}): Promise<void>;
