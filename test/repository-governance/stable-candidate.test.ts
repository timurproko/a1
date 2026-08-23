import { describe, expect, it } from "vitest";
import { createStablePublicationPlan, deriveStableCandidate, observeStableRegistry } from "../../scripts/stable-candidate.mjs";
import type { CandidateEvidence } from "../../scripts/candidate-evidence.mjs";

const identity = {
  packageName: "@timurproko/a1",
  commandName: "a1",
  artifacts: { cliEntry: "bin/cli.js" },
};

function input(version = "0.1.1") {
  return {
    identity,
    packageName: identity.packageName,
    version,
    tag: `v${version}`,
    commit: "a".repeat(40),
    actualCommit: "a".repeat(40),
    tree: "b".repeat(40),
    actualTree: "b".repeat(40),
    status: "",
    registryStatus: "unpublished",
  };
}

describe("version-independent stable candidate preflight", () => {
  it.each(["0.1.1", "1.2.0", "2.0.0"])("derives a matching patch, minor, or major candidate: %s", version => {
    expect(deriveStableCandidate(input(version))).toMatchObject({
      schema: "a1-stable-candidate-identity-v1",
      packageName: identity.packageName,
      version,
      tag: `v${version}`,
      registryPath: encodeURIComponent(identity.packageName),
    });
  });

  it("rejects prerelease and mismatched tags", () => {
    expect(() => deriveStableCandidate(input("1.2.0-dev.1"))).toThrow("final SemVer");
    expect(() => deriveStableCandidate({ ...input(), tag: "v9.9.9" })).toThrow("does not match");
  });

  it("rejects dirty, substituted-commit, and changed-tree sources", () => {
    expect(() => deriveStableCandidate({ ...input(), status: " M package.json" })).toThrow("source is dirty");
    expect(() => deriveStableCandidate({ ...input(), actualCommit: "c".repeat(40) })).toThrow("commit differs");
    expect(() => deriveStableCandidate({ ...input(), actualTree: "d".repeat(40) })).toThrow("tree differs");
  });

  it("rejects an already-published version", () => {
    expect(() => deriveStableCandidate({ ...input(), registryStatus: "published" })).toThrow("not available");
  });

  it("creates a no-side-effect publication plan only for exact eligible evidence", () => {
    const evidence = {
      channel: "latest",
      source: { commit: "a".repeat(40), tree: "b".repeat(40) },
      identity: { packageName: identity.packageName },
      package: { version: "1.2.0" },
      certification: { stableEligible: true },
    } as CandidateEvidence;
    const plan = createStablePublicationPlan(evidence, {
      commit: "a".repeat(40), tree: "b".repeat(40), tag: "v1.2.0", registryStatus: "unpublished", tarballPath: "candidate.tgz",
    });
    expect(plan.command).toEqual(["npm", "publish", "candidate.tgz", "--tag", "latest", "--access", "public", "--ignore-scripts", "--provenance", "--registry", "https://registry.npmjs.org/"]);
    expect(() => createStablePublicationPlan(evidence, {
      commit: "a".repeat(40), tree: "b".repeat(40), tag: "v1.2.0", registryStatus: "published", tarballPath: "candidate.tgz",
    })).toThrow("already registered");
  });

  it("classifies registry availability without accepting registry errors", async () => {
    await expect(observeStableRegistry(identity.packageName, "1.2.0", async () => new Response(null, { status: 404 }))).resolves.toBe("unpublished");
    await expect(observeStableRegistry(identity.packageName, "1.2.0", async () => new Response("{}", { status: 200 }))).resolves.toBe("published");
    await expect(observeStableRegistry(identity.packageName, "1.2.0", async () => new Response(null, { status: 503 }))).rejects.toThrow("HTTP 503");
  });
});
