import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function releaseWorkflow(): Promise<string> {
  return await readFile(".github/workflows/release.yml", "utf8");
}

describe("one release pipeline", () => {
  it("is the only workflow that publishes, and it runs from pushes rather than dispatches", async () => {
    const names = await readdir(".github/workflows");
    const publishers: string[] = [];
    for (const name of names) {
      const source = await readFile(`.github/workflows/${name}`, "utf8");
      if (/npm publish/.test(source)) publishers.push(name);
    }
    expect(publishers).toEqual(["release.yml"]);

    const workflow = await releaseWorkflow();
    expect(workflow).toContain("branches: [develop]");
    expect(workflow).toContain('tags: ["v*"]');
    expect(workflow).not.toContain("workflow_dispatch");
  });

  it("derives the channel from the ref and refuses a tag that disagrees with its source", async () => {
    const workflow = await releaseWorkflow();
    expect(workflow).toContain('reference.startsWith("refs/tags/v")');
    expect(workflow).toContain("does not match the packaged version");
    expect(workflow).toContain("channel=latest");
    expect(workflow).toContain("channel=next");
    // A stable version on develop is the window between preparing a release and
    // tagging it; publishing a preview from it would rank below the release.
    expect(workflow).toContain("awaiting its tag");
  });

  it("packs once and publishes the bytes that were validated", async () => {
    const workflow = await releaseWorkflow();
    expect(workflow).toContain("node scripts/prepare-validation-package.mjs");
    expect(workflow).toContain("release package digest changed across the platform fan-out");
    expect(workflow).toContain("package digest changed between validation and publication");
    expect(workflow).toContain('npm publish "$release_tarball"');
    expect(workflow).toContain("--provenance");
    // The publisher receives the package as an artifact; it never rebuilds one.
    const publishJob = workflow.slice(workflow.indexOf("\n  publish:"));
    expect(publishJob).not.toMatch(/npm ci|npm run build|prepare-validation-package/);
  });

  it("validates the packed release on every supported platform before publishing", async () => {
    const workflow = await releaseWorkflow();
    for (const platform of ["win32", "linux", "darwin"]) expect(workflow).toContain(`platform: ${platform}`);
    expect(workflow).toContain("needs: [plan, package, validate]");
    expect(workflow).toContain("pi-engine-conformance");
  });

  it("refuses a version the registry already serves and verifies what it served afterwards", async () => {
    const workflow = await releaseWorkflow();
    expect(workflow).toContain("already exists (HTTP");
    expect(workflow).toContain("registry bytes differ from the validated package");
    expect(workflow).toContain("tag differs from the published version");
  });

  it("stages the GitHub Release as a draft, publishes it only after npm, and removes it on failure", async () => {
    const workflow = await releaseWorkflow();
    const stage = workflow.indexOf("Stage the draft GitHub Release");
    const publishNpm = workflow.indexOf("Publish the exact package");
    const publishRelease = workflow.indexOf("Publish the staged GitHub Release");
    expect(stage).toBeGreaterThan(0);
    expect(publishNpm).toBeGreaterThan(stage);
    expect(publishRelease).toBeGreaterThan(publishNpm);
    expect(workflow).toContain("--verify-tag");
    expect(workflow).toContain("--draft");
    expect(workflow).toContain("gh release delete");
    expect(workflow).toContain("if: failure() && needs.plan.outputs.channel == 'latest'");
  });

  it("publishes only through the reviewed environment with provenance identity", async () => {
    const workflow = await releaseWorkflow();
    expect(workflow).toContain("environment: npm-publish");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("permissions:\n  contents: read");
  });

  it("keeps a preview from ever costing a commit", async () => {
    const workflow = await releaseWorkflow();
    expect(workflow).toContain("--no-git-tag-version");
    expect(workflow).not.toMatch(/git (commit|push)/);
  });
});

describe("the release command", () => {
  it("cuts a stable release by landing the version, tagging it, and reopening develop", async () => {
    const script = await readFile("scripts/release.mjs", "utf8");
    expect(script).toContain("release runs from develop");
    expect(script).toContain("commit or stash tracked changes first");
    expect(script).toContain("develop is not at the origin tip");
    expect(script).toContain("already exists on the registry");
    expect(script).toContain("a release tag is never moved");
    const tagged = script.indexOf('git(["tag", tag, "origin/develop"])');
    const reopened = script.indexOf("open ${opening}");
    expect(tagged).toBeGreaterThan(0);
    expect(reopened).toBeGreaterThan(tagged);
  });

  it("never publishes from the workstation", async () => {
    const script = await readFile("scripts/release.mjs", "utf8");
    expect(script).not.toMatch(/npm publish|npm pack/);
  });

  it("is the command the manifest exposes", async () => {
    const manifest = JSON.parse(await readFile("package.json", "utf8")) as { scripts: Record<string, string> };
    expect(manifest.scripts.release).toBe("node scripts/release.mjs");
    expect(manifest.scripts["release:next"]).toBeUndefined();
    expect(manifest.scripts["publish:next"]).toBeUndefined();
  });
});
