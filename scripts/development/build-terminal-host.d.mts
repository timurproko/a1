export const TERMINAL_HOST_MANIFEST: "terminal-host.manifest.json";
export const TERMINAL_HOST_SCHEMA: "a1-terminal-host-artifact-v1";
export const SESSION_LOCK_FILENAME: "a1_session_lock.node";
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
  schema: "a1-terminal-host-artifact-v1";
  protocolVersion: 1;
  generation: 1;
  crateVersion: string;
  platform: string;
  architecture: string;
  target: string;
  capability: "supported" | "unsupported";
  builtAt: string;
  artifact: ArtifactFileRecord;
  sessionLock: ArtifactFileRecord;
  notices: ArtifactFileRecord;
  provenance: Record<string, unknown>;
}

export function terminalHostExecutableName(identity: { artifacts: { nativeExecutable: string } }, platform?: NodeJS.Platform): string;
export function sessionLockLibraryName(platform?: NodeJS.Platform): string;
export function verifyVersionReport(report: unknown, crateVersion: string): string[];
export function buildManifest(input: {
  platform: string;
  architecture: string;
  triple: string;
  crateVersion: string;
  report: TerminalHostVersionReport;
  executable: ArtifactFileRecord;
  sessionLock: ArtifactFileRecord;
  notices: ArtifactFileRecord;
  cargoLockSha256: string;
  rustVersion: string;
  zigVersion: string;
  builtAt: string;
}): TerminalHostArtifactManifest;
