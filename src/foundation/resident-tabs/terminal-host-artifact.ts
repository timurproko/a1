import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

export const TERMINAL_HOST_MANIFEST_FILENAME = "terminal-host.manifest.json";
const SCHEMA = "a1-terminal-host-artifact-v2";
const GENERATION = 1;
const NODE_API = 9;
const NOTICES_NAME = "terminal-host-THIRD-PARTY-NOTICES.txt";

interface CertifiedFile {
  readonly filename: string;
  readonly sha256: string;
  readonly size: number;
}

interface TerminalHostManifest {
  readonly schema: string;
  readonly kind: string;
  readonly nodeApi: number;
  readonly protocolVersion: number;
  readonly generation: number;
  readonly platform: string;
  readonly architecture: string;
  readonly capability: string;
  readonly artifact: CertifiedFile;
  readonly entry: CertifiedFile;
  readonly notices: CertifiedFile;
}

export type TerminalHostArtifactErrorCode =
  | "TERMINAL_HOST_ARTIFACT_MISSING"
  | "TERMINAL_HOST_ARTIFACT_TAMPERED"
  | "TERMINAL_HOST_ARTIFACT_INCOMPATIBLE"
  | "TERMINAL_HOST_ARTIFACT_UNSUPPORTED";

export class TerminalHostArtifactError extends Error {
  readonly code: TerminalHostArtifactErrorCode;
  readonly manifestPath: string;
  constructor(code: TerminalHostArtifactErrorCode, manifestPath: string, message: string) {
    super(message);
    this.name = "TerminalHostArtifactError";
    this.code = code;
    this.manifestPath = manifestPath;
  }
}

export interface VerifiedTerminalHostArtifact {
  readonly addon: string;
  readonly entry: string;
  readonly generation: 1;
}

/** Verifies every runtime file certified by the terminal-host v2 manifest before Node loads it. */
export async function verifyTerminalHostArtifact(
  addonPath: string,
  platform: NodeJS.Platform = process.platform,
  architecture: string = process.arch,
): Promise<VerifiedTerminalHostArtifact> {
  const directory = dirname(addonPath);
  const releaseRoot = resolve(directory, "../../..");
  const manifestPath = resolve(directory, TERMINAL_HOST_MANIFEST_FILENAME);
  let manifest: TerminalHostManifest;
  try {
    const parsed: unknown = JSON.parse(await readFile(manifestPath, "utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new TypeError("terminal host manifest is not an object");
    manifest = parsed as TerminalHostManifest;
  } catch (error) {
    const code = error instanceof Error && "code" in error && error.code === "ENOENT"
      ? "TERMINAL_HOST_ARTIFACT_MISSING"
      : "TERMINAL_HOST_ARTIFACT_INCOMPATIBLE";
    throw new TerminalHostArtifactError(code, manifestPath, "terminal host manifest is missing or invalid");
  }
  if (manifest.capability === "unsupported") {
    throw new TerminalHostArtifactError("TERMINAL_HOST_ARTIFACT_UNSUPPORTED", manifestPath, "terminal host is unsupported on this platform");
  }
  if (manifest.schema !== SCHEMA || manifest.kind !== "node-addon" || manifest.nodeApi !== NODE_API
    || manifest.protocolVersion !== 1 || manifest.generation !== GENERATION
    || manifest.platform !== platform || manifest.architecture !== architecture || manifest.capability !== "supported"
    || !validRecord(manifest.artifact) || !validRecord(manifest.entry) || !validRecord(manifest.notices)
    || manifest.artifact.filename !== `${PRODUCT_IDENTITY.artifacts.terminalHostAddon}.node`
    || manifest.entry.filename !== `dist/foundation/resident-tabs/${PRODUCT_IDENTITY.artifacts.terminalHostEntry}.js`
    || manifest.notices.filename !== NOTICES_NAME
    || basename(addonPath) !== manifest.artifact.filename) {
    throw new TerminalHostArtifactError("TERMINAL_HOST_ARTIFACT_INCOMPATIBLE", manifestPath, "terminal host manifest is incompatible");
  }
  const entry = resolve(releaseRoot, manifest.entry.filename);
  await verifyFile(addonPath, manifest.artifact, manifestPath);
  await verifyFile(entry, manifest.entry, manifestPath);
  await verifyFile(resolve(directory, manifest.notices.filename), manifest.notices, manifestPath);
  return { addon: addonPath, entry, generation: 1 };
}

function validRecord(value: unknown): value is CertifiedFile {
  return typeof value === "object" && value !== null
    && typeof (value as CertifiedFile).filename === "string"
    && /^[a-f0-9]{64}$/u.test((value as CertifiedFile).sha256)
    && Number.isSafeInteger((value as CertifiedFile).size) && (value as CertifiedFile).size >= 0;
}

async function verifyFile(path: string, record: CertifiedFile, manifestPath: string): Promise<void> {
  let bytes: Buffer;
  let metadata;
  try {
    [bytes, metadata] = await Promise.all([readFile(path), stat(path)]);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new TerminalHostArtifactError("TERMINAL_HOST_ARTIFACT_MISSING", manifestPath, `certified terminal host file is missing: ${record.filename}`);
    }
    throw error;
  }
  if (!metadata.isFile() || bytes.byteLength !== record.size || createHash("sha256").update(bytes).digest("hex") !== record.sha256) {
    throw new TerminalHostArtifactError("TERMINAL_HOST_ARTIFACT_TAMPERED", manifestPath, `certified terminal host file failed verification: ${record.filename}`);
  }
}
