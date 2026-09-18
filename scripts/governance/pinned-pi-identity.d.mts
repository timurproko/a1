import type { PiCompatibilityPackageAuthority } from "./pi-compatibility-authority.mjs";

export interface PinnedPiIdentity {
  readonly version: string;
  readonly commit: string;
  readonly packages: readonly PiCompatibilityPackageAuthority[];
}

export function readPinnedPiIdentity(root: string): Promise<PinnedPiIdentity>;
