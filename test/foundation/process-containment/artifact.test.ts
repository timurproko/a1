import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { verifyProcessGuardianArtifact } from "../../../src/foundation/process-containment/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("process guardian artifact verification", () => {
  it("accepts the exact supported artifact named by its manifest", async () => {
    const fixture = await artifactFixture();
    await expect(verifyProcessGuardianArtifact(fixture.path, "win32", "x64")).resolves.toBeUndefined();
  });

  it("rejects missing, altered, wrong-platform, and unsupported artifacts", async () => {
    const missing = resolve(await root(), "missing.exe");
    await expect(verifyProcessGuardianArtifact(missing, "win32", "x64")).rejects.toMatchObject({ code: "CONTAINMENT_ARTIFACT_MISSING" });

    const altered = await artifactFixture();
    await writeFile(altered.path, "altered");
    await expect(verifyProcessGuardianArtifact(altered.path, "win32", "x64")).rejects.toMatchObject({ code: "CONTAINMENT_ARTIFACT_TAMPERED" });

    const wrongPlatform = await artifactFixture();
    await expect(verifyProcessGuardianArtifact(wrongPlatform.path, "linux", "x64")).rejects.toMatchObject({ code: "CONTAINMENT_ARTIFACT_INCOMPATIBLE" });

    const unsupported = await artifactFixture({ capability: "unsupported" });
    await expect(verifyProcessGuardianArtifact(unsupported.path, "win32", "x64")).rejects.toMatchObject({ code: "CONTAINMENT_UNSUPPORTED" });
  });
});

async function artifactFixture(overrides: { capability?: "supported" | "unsupported" } = {}) {
  const directory = await root();
  const path = resolve(directory, "process-guardian.exe");
  const bytes = Buffer.from("exact guardian fixture");
  await writeFile(path, bytes);
  await writeFile(resolve(directory, "manifest.json"), JSON.stringify({
    schema: "a1-process-guardian-artifact-v1",
    protocolVersion: 1,
    crateVersion: "0.1.0-dev",
    platform: "win32",
    architecture: "x64",
    capability: overrides.capability ?? "supported",
    artifact: {
      filename: "process-guardian.exe",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      size: bytes.length,
    },
  }));
  return { path };
}

async function root() {
  const value = await mkdtemp(resolve(tmpdir(), "a1-guardian-artifact-"));
  roots.push(value);
  return value;
}
