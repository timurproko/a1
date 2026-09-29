import { describe, expect, it } from "vitest";
import { npmUploadStarted, planPublicationRollback } from "../../scripts/release/rollback-publication.mjs";

const source = "a".repeat(40);
const release = { id: 17, tag_name: "v1.2.3", target_commitish: source, draft: false, prerelease: false };
const tag = { object: { type: "commit", sha: source } };
const step = (name: string, status: string, conclusion: string | null) => ({ name, status, conclusion });
const publishJob = (application: string | null, installer: string | null) => ({
  name: "publish / Publish 1.2.3 to npm latest",
  steps: [
    step("Require the published Release to remain unchanged", "completed", "failure"),
    step("Publish the exact validated installer package", installer ? "completed" : "queued", installer),
    step("Publish the exact validated application package", application ? "completed" : "queued", application),
  ],
});
const input = () => ({
  version: "1.2.3", release, tag, application: null, installer: null,
  jobs: [{ name: "publish / Validate linux-node24", steps: [step("Validate the exact package", "completed", "failure")] }],
  jobsComplete: true,
});

describe("stable publication rollback", () => {
  it("returns a failed pre-npm publication to draft and deletes its unconsumed tag", () => {
    expect(planPublicationRollback(input())).toMatchObject({ action: "rollback", returnToDraft: true, deleteTag: true });
  });

  it("is idempotent after a previous rollback already ran", () => {
    expect(planPublicationRollback({ ...input(), release: { ...release, draft: true }, tag: null }))
      .toMatchObject({ action: "rollback", returnToDraft: false, deleteTag: false });
  });

  it("treats skipped upload steps as untouched npm", () => {
    expect(npmUploadStarted([publishJob("skipped", "skipped")])).toBe(false);
    expect(planPublicationRollback({ ...input(), jobs: [publishJob("skipped", "skipped")] })).toMatchObject({ action: "rollback" });
  });

  it.each([
    ["the application package exists", { application: { version: "1.2.3" } }],
    ["the installer package exists", { installer: { version: "1.2.3" } }],
    ["an installer upload ran", { jobs: [publishJob(null, "failure")] }],
    ["an application upload ran", { jobs: [publishJob("success", "success")] }],
    ["an upload was cancelled mid-flight", { jobs: [publishJob("cancelled", "success")] }],
    ["the job listing is truncated", { jobsComplete: false }],
    ["the job listing is missing", { jobs: null }],
  ])("keeps the Release and tag when %s", (_name, change) => {
    expect(planPublicationRollback({ ...input(), ...change })).toMatchObject({ action: "keep", reason: expect.stringContaining("rerun the failed jobs") });
  });

  it.each([
    ["a tag at another commit", { tag: { object: { type: "commit", sha: "b".repeat(40) } } }],
    ["an annotated tag", { tag: { object: { type: "tag", sha: source } } }],
    ["another Release", { release: { ...release, tag_name: "v1.2.4" } }],
    ["a prerelease", { release: { ...release, prerelease: true } }],
  ])("refuses to touch %s", (_name, change) => {
    expect(() => planPublicationRollback({ ...input(), ...change })).toThrow();
  });
});
