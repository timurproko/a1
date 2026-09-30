import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { planOrphanTagDeletion } from "../../scripts/release/delete-orphan-tag.mjs";

const tag = { object: { type: "commit", sha: "a".repeat(40) } };
const input = () => ({
  version: "0.2.2", releases: [{ id: 1, tag_name: "v0.2.1", draft: false }], releasesComplete: true,
  tag, application: null, installer: null,
});

describe("unconsumed release tag cleanup", () => {
  it("deletes a tag that no Release uses while npm serves neither package", () => {
    expect(planOrphanTagDeletion(input())).toMatchObject({ action: "delete" });
  });

  it("does nothing when the tag is already gone", () => {
    expect(planOrphanTagDeletion({ ...input(), tag: null })).toMatchObject({ action: "none" });
  });

  it.each([
    ["a published Release uses it", { releases: [{ id: 9, tag_name: "v0.2.2", draft: false }] }, "Release 9 (published) still uses v0.2.2"],
    ["a draft Release uses it", { releases: [{ id: 9, tag_name: "v0.2.2", draft: true }] }, "Release 9 (draft) still uses v0.2.2"],
    ["the Release list is incomplete", { releasesComplete: false }, "could not be read completely"],
    ["the application package exists", { application: { version: "0.2.2" } }, "npm already serves the application package"],
    ["the installer package exists", { installer: { version: "0.2.2" } }, "npm already serves the installer package"],
  ])("keeps the tag when %s", (_name, change, reason) => {
    const plan = planOrphanTagDeletion({ ...input(), ...change });
    expect(plan.action).toBe("keep");
    expect(plan.reason).toContain(reason);
  });

  it.each(["0.2.2-dev.5", "v0.2.2", "01.2.3", ""])("rejects non-stable version %s", version => {
    expect(() => planOrphanTagDeletion({ ...input(), version })).toThrow(/not a stable X\.Y\.Z version/);
  });

  it("refuses a tag that does not point at a commit", () => {
    expect(() => planOrphanTagDeletion({ ...input(), tag: { object: { type: "tag", sha: "b".repeat(40) } } })).toThrow(/refusing to delete/);
  });

  it("runs on Release deletion and on dispatch, deleting only through the App identity", async () => {
    const source = await readFile(".github/workflows/release-tag-cleanup.yml", "utf8");
    const workflow = parse(source) as {
      on: { release: { types: string[] }; workflow_dispatch: { inputs: { version: { required: boolean } } } };
      permissions: Record<string, string>;
      jobs: { cleanup: { steps: Array<{ run?: string; env?: Record<string, string>; with?: Record<string, string> }> } };
    };
    expect(workflow.on.release.types).toEqual(["deleted"]);
    expect(workflow.on.workflow_dispatch.inputs.version.required).toBe(true);
    expect(workflow.permissions).toEqual({ contents: "read" });
    const steps = workflow.jobs.cleanup.steps;
    expect(steps.find(step => step.with?.["app-id"])?.with?.["permission-contents"]).toBe("write");
    const run = steps.find(step => step.run?.includes("delete-orphan-tag.mjs"));
    expect(run?.env?.TAG_TOKEN).toBe("${{ steps.app.outputs.token }}");
    expect(steps.find(step => step.with?.ref)?.with?.ref).toBe("${{ github.event.repository.default_branch }}");
  });
});
