export const TERMINAL_HOST_MANIFEST: "terminal-host.manifest.json";
export const TERMINAL_HOST_SCHEMA: "a1-terminal-host-artifact-v2";
export const TERMINAL_HOST_ADDON: "terminal-host.node";
export const TERMINAL_HOST_ENTRY: "dist/foundation/resident-tabs/host-entry.js";
export const TERMINAL_HOST_GENERATION: 1;

export interface ArtifactFileRecord { filename: string; sha256: string; size: number }

export interface TerminalHostVersionReport {
  schema: string;
  protocolVersion: number;
  generation: number;
  crateVersion: string;
  features: { faultInjection: boolean; residentFixtures: boolean };
  libghosttyVtCommit: string;
  libghosttyTarget: string;
  libghosttyCpu: string;
}

export interface TerminalHostArtifactManifest {
  schema: "a1-terminal-host-artifact-v2";
  kind: "node-addon";
  nodeApi: 9;
  protocolVersion: 1;
  generation: 1;
  crateVersion: string;
  platform: string;
  architecture: string;
  target: string;
  capability: "supported" | "unsupported";
  builtAt: string;
  artifact: ArtifactFileRecord;
  entry: ArtifactFileRecord;
  notices: ArtifactFileRecord;
  provenance: Record<string, unknown>;
}

export function verifyVersionReport(report: unknown, crateVersion: string): string[];
export function buildManifest(input: {
  platform: string;
  architecture: string;
  triple: string;
  crateVersion: string;
  report: TerminalHostVersionReport;
  artifact: ArtifactFileRecord;
  entry: ArtifactFileRecord;
  notices: ArtifactFileRecord;
  cargoLockSha256: string;
  rustVersion: string;
  zigVersion: string;
  builtAt: string;
  identityCheck?: "executed" | "mach-o-header";
}): TerminalHostArtifactManifest;
