import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateStableStagingReceipt } from "../../scripts/release/staging-receipt.mjs";

const source = "a".repeat(40);
const note = "## [1.2.3] - 2026-09-29\n\n### Fixed\n\n- Reviewed.\n";
const noteDigest = createHash("sha256").update(note).digest("hex");
const assetDigest = "b".repeat(64);
const receipt = {
  schema: "a1-stable-staging-v1", repository: "owner/app", workflowPath: ".github/workflows/approve-release.yml",
  runId: 51, runAttempt: 1, actor: "maintainer", requestId: "12345678-1234-4123-8123-123456789abc",
  releaseId: 17, version: "1.2.3", source, releaseNotesSha256: noteDigest,
  application: { name: "@owner/app", integrity: "sha512-application" },
  installer: { name: "@owner/app-install", integrity: "sha512-installer" },
  asset: { name: "owner-app-1.2.3.tgz", sha256: assetDigest }, master: source,
};
const valid = () => ({
  repository: "owner/app",
  receipt,
  release: { id: 17, tag_name: "v1.2.3", name: "v1.2.3", target_commitish: source, body: note,
    draft: false, prerelease: false, assets: [{ name: "a1-stable-staging-v1.json" }, { name: "owner-app-1.2.3.tgz" }] },
  workflowRun: { id: 51, run_attempt: 1, path: ".github/workflows/approve-release.yml", event: "repository_dispatch",
    head_branch: "develop", head_sha: source, conclusion: "success", actor: { login: "maintainer" } },
  tag: { object: { type: "commit", sha: source } }, master: { object: { sha: source } },
  application: { version: "1.2.3", dist: { integrity: "sha512-application" } },
  installer: { version: "1.2.3", dist: { integrity: "sha512-installer" } },
  applicationLatest: { version: "1.2.3" }, installerLatest: { version: "1.2.3" }, assetSha256: assetDigest,
});

describe("stable staging receipt verification", () => {
  it("binds the successful staging run to Release, tag, npm, asset, body, and master", () => {
    expect(validateStableStagingReceipt(valid())).toEqual({ version: "1.2.3", source, releaseId: 17,
      releaseNotesSha256: noteDigest, note, assetName: "owner-app-1.2.3.tgz" });
  });

  it.each([
    ["failed run", { workflowRun: { ...valid().workflowRun, conclusion: "failure" } }],
    ["wrong actor", { workflowRun: { ...valid().workflowRun, actor: { login: "other" } } }],
    ["wrong repository", { repository: "other/app" }],
    ["wrong workflow", { workflowRun: { ...valid().workflowRun, path: ".github/workflows/other.yml" } }],
    ["wrong run attempt", { workflowRun: { ...valid().workflowRun, run_attempt: 2 } }],
    ["changed body", { release: { ...valid().release, body: note.replace("Reviewed", "Changed") } }],
    ["draft Release", { release: { ...valid().release, draft: true } }],
    ["duplicate receipt", { release: { ...valid().release, assets: [...valid().release.assets, { name: "a1-stable-staging-v1.json" }] } }],
    ["moved tag", { tag: { object: { type: "commit", sha: "c".repeat(40) } } }],
    ["changed master", { master: { object: { sha: "c".repeat(40) } } }],
    ["wrong package", { application: { version: "1.2.3", dist: { integrity: "other" } } }],
    ["wrong latest", { installerLatest: { version: "1.2.2" } }],
    ["changed asset", { assetSha256: "c".repeat(64) }],
  ])("rejects %s", (_name, change) => {
    expect(() => validateStableStagingReceipt({ ...valid(), ...change })).toThrow();
  });
});
