import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

export const TERMINAL_HOST_MANIFEST_FILENAME = "terminal-host.manifest.json";
export const TERMINAL_HOST_GENERATION = 1;

export type TerminalHostArtifactCode =
  | "TERMINAL_HOST_ARTIFACT_MISSING"
  | "TERMINAL_HOST_ARTIFACT_INCOMPATIBLE"
  | "TERMINAL_HOST_ARTIFACT_UNSUPPORTED"
  | "TERMINAL_HOST_ARTIFACT_TAMPERED";

interface ArtifactFile { readonly filename: string; readonly sha256: string; readonly size: number }

interface TerminalHostArtifactManifest {
  readonly schema: "a1-terminal-host-artifact-v1";
  readonly protocolVersion: 1;
  readonly generation: number;
  readonly platform: string;
  readonly architecture: string;
  readonly capability: "supported" | "unsupported";
  readonly artifact: ArtifactFile;
  readonly sessionLock: ArtifactFile;
}

export interface VerifiedTerminalHostArtifact {
  readonly executable: string;
  readonly sessionLock: string;
  readonly generation: number;
}

export class TerminalHostArtifactError extends Error {
  readonly code: TerminalHostArtifactCode;
  constructor(message: string, code: TerminalHostArtifactCode) {
    super(message);
    this.name = "TerminalHostArtifactError";
    this.code = code;
  }
}

/**
 * Verifies a release's terminal host and its session-writer lock against their manifest before
 * anything executes or loads them: schema, generation, platform, architecture, file names, sizes,
 * and SHA-256 digests.
 */
export async function verifyTerminalHostArtifact(
  executable: string,
  platform: NodeJS.Platform = process.platform,
  architecture: string = process.arch,
  generation: number = TERMINAL_HOST_GENERATION,
): Promise<VerifiedTerminalHostArtifact> {
  const directory = dirname(executable);
  let manifest: TerminalHostArtifactManifest;
  try {
    manifest = JSON.parse(await readFile(resolve(directory, TERMINAL_HOST_MANIFEST_FILENAME), "utf8")) as TerminalHostArtifactManifest;
  } catch (error) {
    throw new TerminalHostArtifactError(`terminal host manifest is missing or malformed: ${errorMessage(error)}`, "TERMINAL_HOST_ARTIFACT_MISSING");
  }
  if (manifest.schema !== "a1-terminal-host-artifact-v1" || manifest.protocolVersion !== 1 || manifest.generation !== generation
    || manifest.platform !== platform || manifest.architecture !== architecture
    || manifest.artifact?.filename !== basename(executable) || typeof manifest.sessionLock?.filename !== "string"
    || basename(manifest.sessionLock.filename) !== manifest.sessionLock.filename) {
    throw new TerminalHostArtifactError("terminal host manifest is incompatible with this platform or generation", "TERMINAL_HOST_ARTIFACT_INCOMPATIBLE");
  }
  if (manifest.capability !== "supported") {
    throw new TerminalHostArtifactError(`resident tabs are not supported on ${platform}-${architecture}`, "TERMINAL_HOST_ARTIFACT_UNSUPPORTED");
  }
  const sessionLock = resolve(directory, manifest.sessionLock.filename);
  await verifyFile(executable, manifest.artifact, "terminal host");
  await verifyFile(sessionLock, manifest.sessionLock, "session-writer lock");
  return { executable, sessionLock, generation: manifest.generation };
}

async function verifyFile(path: string, expected: ArtifactFile, label: string): Promise<void> {
  const [bytes, metadata] = await Promise.all([readFile(path), stat(path)]).catch((error: unknown) => {
    throw new TerminalHostArtifactError(`${label} artifact is unavailable: ${errorMessage(error)}`, "TERMINAL_HOST_ARTIFACT_MISSING");
  });
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (metadata.size !== expected.size || digest !== expected.sha256) {
    throw new TerminalHostArtifactError(`${label} artifact integrity verification failed`, "TERMINAL_HOST_ARTIFACT_TAMPERED");
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
