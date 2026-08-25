export interface PiCompatibilityPackageAuthority {
  readonly name: string;
  readonly requested: string;
  readonly version: string;
  readonly integrity: string;
  readonly resolved: string;
  readonly lockPath: string;
}

export interface PiCompatibilityAuthority {
  readonly schema: "a1-pi-compatibility-authority-v1";
  readonly authorities: readonly ["package.json", "package-lock.json"];
  readonly packages: readonly PiCompatibilityPackageAuthority[];
}

export function readPiCompatibilityAuthority(root: string): Promise<PiCompatibilityAuthority>;
export function resolvePiCompatibilityAuthority(manifest: unknown, lockfile: unknown): PiCompatibilityAuthority;
