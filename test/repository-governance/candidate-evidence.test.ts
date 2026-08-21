import { gzipSync } from "node:zlib";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCandidateEvidence, verifyCandidateEvidence, type CandidateEvidence } from "../../scripts/candidate-evidence.mjs";

let root: string;
let tarballPath: string;

beforeEach(async () => {
  root = await mkdtemp(resolve(tmpdir(), "candidate-evidence-"));
  tarballPath = resolve(root, "timurproko-a1-0.1.1-dev.2.tgz");
  await writeFile(tarballPath, createTarball({
    name: "@timurproko/a1",
    version: "0.1.1-dev.2",
    bin: { a1: "bin/a1.js" },
  }));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function createEvidence(): Promise<CandidateEvidence> {
  return await createCandidateEvidence({
    tarballPath,
    commit: "a".repeat(40),
    tree: "b".repeat(40),
    channel: "next",
    selected: ["invariants", "fast"],
    outcomes: [
      { id: "typecheck", exitCode: 0, durationMs: 1200 },
      { id: "vitest-fast", exitCode: 0, durationMs: 3000 },
    ],
    runner: { workflow: "Preview candidate", runId: "12345", attempt: 1, label: "github-windows" },
    createdAt: "2026-08-21T00:00:00.000Z",
  });
}

describe("exact candidate evidence", () => {
  it("binds accepted package bytes, source, validation, and runner identity", async () => {
    const evidence = await createEvidence();
    expect(evidence).toMatchObject({
      schema: "a1-release-certification-v1",
      source: { commit: "a".repeat(40), tree: "b".repeat(40) },
      package: { name: "@timurproko/a1", version: "0.1.1-dev.2", bin: { a1: "bin/a1.js" } },
      channel: "next",
      validation: { selected: ["invariants", "fast"], gateIds: ["typecheck", "vitest-fast"] },
      certification: { class: "uncertified-development-preview", stableEligible: false },
    });
    await expect(verifyCandidateEvidence(evidence, {
      tarballPath,
      commit: "a".repeat(40),
      tree: "b".repeat(40),
      version: "0.1.1-dev.2",
      channel: "next",
    })).resolves.toMatchObject({ packageName: "@timurproko/a1", version: "0.1.1-dev.2" });
  });

  it("rejects altered package bytes", async () => {
    const evidence = await createEvidence();
    const altered = resolve(root, evidence.package.tarball);
    const bytes = Buffer.from(await import("node:fs/promises").then(module => module.readFile(tarballPath)));
    bytes[bytes.length - 1] = bytes[bytes.length - 1]! ^ 1;
    await writeFile(altered, bytes);
    await expect(verifyCandidateEvidence(evidence, { tarballPath: altered })).rejects.toThrow();
  });

  it("rejects altered version and commit expectations", async () => {
    const evidence = await createEvidence();
    await expect(verifyCandidateEvidence({ ...evidence, package: { ...evidence.package, version: "0.1.1-dev.9" } }, { tarballPath })).rejects.toThrow("packed package version");
    await expect(verifyCandidateEvidence(evidence, { tarballPath, commit: "c".repeat(40) })).rejects.toThrow("source commit");
    await expect(verifyCandidateEvidence(evidence, { tarballPath, tree: "d".repeat(40) })).rejects.toThrow("source tree");
  });

  it("rejects failed, duplicated, or incomplete gate outcomes", async () => {
    await expect(createCandidateEvidence({
      tarballPath,
      commit: "a".repeat(40),
      tree: "b".repeat(40),
      channel: "next",
      selected: ["fast"],
      outcomes: [{ id: "fast", exitCode: 1, durationMs: 1 }],
      runner: { workflow: "fixture", runId: "1", attempt: 1, label: "fixture" },
    })).rejects.toThrow("failed validation outcomes");

    const evidence = await createEvidence();
    await expect(verifyCandidateEvidence({ ...evidence, validation: { ...evidence.validation, outcomes: [], gateIds: [] } }, { tarballPath })).rejects.toThrow("gate outcomes are incomplete");
  });
});

function createTarball(manifest: Record<string, unknown>): Buffer {
  const content = Buffer.from(JSON.stringify(manifest));
  const header = Buffer.alloc(512);
  header.write("package/package.json", 0, "utf8");
  header.write("00000000000\0", 124, "ascii");
  header.write(`${content.length.toString(8).padStart(11, "0")}\0`, 124, "ascii");
  header[156] = "0".charCodeAt(0);
  const padding = Buffer.alloc(Math.ceil(content.length / 512) * 512 - content.length);
  return gzipSync(Buffer.concat([header, content, padding, Buffer.alloc(1024)]));
}
