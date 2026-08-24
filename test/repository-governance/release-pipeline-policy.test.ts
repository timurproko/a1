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
    expect(workflow).not.toContain("workflow_dispatch");
    // The tag is written by the release, so it can never also be its trigger.
    expect(workflow).not.toMatch(/^\s*tags:/m);
  });

  it("derives the channel from what the pushed commit declares", async () => {
    const workflow = await releaseWorkflow();
    expect(workflow).toContain("release runs from develop, not");
    expect(workflow).toContain("channel=latest");
    expect(workflow).toContain("channel=next");
    // Nothing about the plan reads a tag: at plan time no tag exists yet.
    const plan = workflow.slice(workflow.indexOf("Resolve channel and version"), workflow.indexOf("Say what will happen"));
    expect(plan).not.toContain("refs/tags");
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

  it("records the published commit on master by fast-forward only", async () => {
    const workflow = await releaseWorkflow();
    expect(workflow).toContain("git/refs/heads/master");
    expect(workflow).toContain("-F force=false");
    const publishRelease = workflow.indexOf("Publish the staged GitHub Release");
    const moveMaster = workflow.indexOf("Move master to the published release");
    expect(moveMaster).toBeGreaterThan(publishRelease);
    // Only a stable publication records itself there; a preview leaves it alone.
    expect(workflow.slice(moveMaster)).toContain("needs.plan.outputs.channel == 'latest'");
  });

  it("says what went wrong when recording a published release fails", async () => {
    const workflow = await releaseWorkflow();
    // These steps run after the registry already serves the package, so a silent
    // failure leaves npm ahead of the repository with nothing to explain it.
    expect(workflow).not.toContain("--silent");
    expect(workflow).toContain("could not create ${tag}");
    expect(workflow).toContain("could not fast-forward master");
    expect(workflow).toContain("A release tag is never moved.");
  });

  it("treats a failed tag lookup as absent rather than as an existing tag", async () => {
    const workflow = await releaseWorkflow();
    // gh prints a 404 body to standard output, so reading the output alone takes
    // the error text for a tag that exists — which is how three releases published
    // and then failed to record themselves.
    expect(workflow).toContain("[0-9a-f]{40}");
    expect(workflow).not.toContain("--jq .object.sha 2>/dev/null || true");
  });

  it("records the tag and the release only after the registry has the package", async () => {
    const workflow = await releaseWorkflow();
    const publishNpm = workflow.indexOf("Publish the exact package");
    const verified = workflow.indexOf("Verify the registry serves exactly what was uploaded");
    const tagged = workflow.indexOf("Tag the published commit");
    const released = workflow.indexOf("Record the GitHub Release");
    expect(publishNpm).toBeGreaterThan(0);
    expect(verified).toBeGreaterThan(publishNpm);
    expect(tagged).toBeGreaterThan(verified);
    expect(released).toBeGreaterThan(tagged);
    // The tag exists by then, so the release attaches to it rather than making one.
    expect(workflow).toContain("--verify-tag");
    // A failed release leaves nothing to clean up, so there is nothing to delete.
    expect(workflow).not.toContain("gh release delete");
    expect(workflow).not.toContain("--draft");
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

  it("names a preview after the commit it was built from, not after the run", async () => {
    const workflow = await releaseWorkflow();
    expect(workflow).toContain("COMMIT_SHA: ${{ github.sha }}");
    expect(workflow).toContain("version=${base}-dev.${commit}");
    expect(workflow).toContain("commit is not a resolvable sha");
    // A run counter would give the same code a different version on every re-run.
    expect(workflow).not.toContain("github.run_number");
  });
});

describe("the release command", () => {
  it("cuts a stable release by landing the version, waiting for it, and reopening develop", async () => {
    const script = await readFile("scripts/release.mjs", "utf8");
    expect(script).toContain("release runs from develop");
    expect(script).toContain("commit or stash tracked changes first");
    expect(script).toContain("develop is not at the origin tip");
    expect(script).toContain("already exists on the registry");
    expect(script).toContain("a release tag is never moved");
    const landed = script.indexOf("await landVersion(version,");
    const waited = script.indexOf("await waitForRelease(");
    const reopened = script.indexOf("open ${opening}");
    expect(landed).toBeGreaterThan(0);
    expect(waited).toBeGreaterThan(landed);
    expect(reopened).toBeGreaterThan(waited);
  });

  it("creates no tag of its own, and says so when a release fails", async () => {
    const script = await readFile("scripts/release.mjs", "utf8");
    expect(script).not.toMatch(/git\(\["tag"/);
    expect(script).not.toMatch(/git\(\["push", "origin", tag\]\)/);
    expect(script).toContain("Nothing was tagged or released");
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
