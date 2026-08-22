import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

interface ProcessGuardianArtifactManifest {
  readonly schema: "a1-process-guardian-artifact-v1";
  readonly protocolVersion: 1;
  readonly crateVersion: string;
  readonly platform: string;
  readonly architecture: string;
  readonly capability: "supported" | "unsupported";
  readonly artifact: { readonly filename: string; readonly sha256: string; readonly size: number };
}

export async function verifyProcessGuardianArtifact(
  helperPath: string,
  platform: NodeJS.Platform = process.platform,
  architecture: string = process.arch,
): Promise<void> {
  const manifestPath = resolve(dirname(helperPath), "manifest.json");
  let manifest: ProcessGuardianArtifactManifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8")) as ProcessGuardianArtifactManifest;
  } catch (error) {
    throw artifactError(`process guardian manifest is missing or malformed: ${errorMessage(error)}`, "CONTAINMENT_ARTIFACT_MISSING");
  }
  if (manifest.schema !== "a1-process-guardian-artifact-v1" || manifest.protocolVersion !== 1
    || manifest.platform !== platform || manifest.architecture !== architecture
    || manifest.artifact?.filename !== basename(helperPath)) {
    throw artifactError("process guardian manifest is incompatible with this platform or protocol", "CONTAINMENT_ARTIFACT_INCOMPATIBLE");
  }
  if (manifest.capability !== "supported") {
    throw artifactError(`process containment is not certified for ${platform}-${architecture}`, "CONTAINMENT_UNSUPPORTED");
  }
  const [bytes, metadata] = await Promise.all([readFile(helperPath), stat(helperPath)]).catch(error => {
    throw artifactError(`process guardian artifact is unavailable: ${errorMessage(error)}`, "CONTAINMENT_ARTIFACT_MISSING");
  });
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (metadata.size !== manifest.artifact.size || digest !== manifest.artifact.sha256) {
    throw artifactError("process guardian artifact integrity verification failed", "CONTAINMENT_ARTIFACT_TAMPERED");
  }
}

function artifactError(message: string, code: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
