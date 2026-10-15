export const NOTICES_FILENAME: "terminal-host-THIRD-PARTY-NOTICES.txt";
export const ALLOWED_LICENSES: readonly string[];

export interface CargoMetadataPackage {
  id: string;
  name: string;
  version: string;
  license?: string | null;
  license_file?: string | null;
  manifest_path: string;
  targets: { kind: string[] }[];
}

export interface CargoMetadata {
  packages: CargoMetadataPackage[];
  resolve: { root: string; nodes: { id: string; deps: { pkg: string; dep_kinds: { kind: string | null }[] }[] }[] };
}

export interface PinnedLicenseText { path: string; sha256: string }
export interface LinkedComponent { name: string; version: string; license: string; licenseFiles: PinnedLicenseText[] }

export interface NoticeReader {
  (path: string): Promise<string>;
  list(directory: string): Promise<string[]>;
}

export function renderTerminalHostNotices(input: {
  metadata: CargoMetadata;
  readText: NoticeReader;
  linkedComponents: LinkedComponent[];
  crateLicenseTexts?: Record<string, PinnedLicenseText[]>;
}): Promise<string>;
export function licenseAllowed(expression: string): boolean;
export function hostTriple(rustc?: string): string;
export function writeTerminalHostNotices(options?: { repositoryRoot?: string; targetDirectory: string; triple?: string }): Promise<string>;
