import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("exact stable artifact publisher", () => {
  it("accepts only a successful certification run at the current master tag", async () => {
    const workflow = await readFile(".github/workflows/publish-stable.yml", "utf8");
    expect(workflow).toContain("certification_run_id:");
    expect(workflow).not.toMatch(/^\s+(version|source_commit|integrity|shasum):$/m);
    expect(workflow).toContain("run.path !== \".github/workflows/certify-stable.yml\"");
    expect(workflow).toContain("run.head_sha !== process.env.GITHUB_SHA");
    expect(workflow).toContain("master.object?.sha !== process.env.GITHUB_SHA");
    expect(workflow).toContain("taggedCommit.sha !== process.env.GITHUB_SHA");
    expect(workflow).toContain('test "$CONFIRM_STABLE" = "publish-certified-stable-latest"');
  });

  it("requires exact bytes and complete automated plus physical certification", async () => {
    const workflow = await readFile(".github/workflows/publish-stable.yml", "utf8");
    expect(workflow).toContain("pattern: stable-certified-candidate-*");
    expect(workflow).toContain("evidence.source?.commit !== process.env.certified_source_commit");
    expect(workflow).toContain("evidence.source?.tree !== process.env.certified_source_tree");
    expect(workflow).toContain("evidence.package?.integrity !== integrity || evidence.package?.shasum !== shasum");
    expect(workflow).toContain("evidence.certification?.stableEligible !== true");
    expect(workflow).toContain("evidence.certification?.physical !== \"certified\"");
    expect(workflow).toContain("evidence.certification?.crossPlatform !== \"certified\"");
    expect(workflow).toContain("automated-${platform}");
    expect(workflow).toContain("physical-${platform}");
  });

  it("does not check out, install, build, or test source during publication", async () => {
    const workflow = await readFile(".github/workflows/publish-stable.yml", "utf8");
    expect(workflow).not.toMatch(/actions\/checkout|npm ci|npm install|npm run build|prepare-validation-package|vitest|test:release|run-validation-tier/);
    expect(workflow).toContain("npm publish \"${{ env.stable_tarball }}\"");
    expect(workflow).toContain("--provenance");
  });

  it("requires an unpublished version and verifies exact npm latest bytes", async () => {
    const workflow = await readFile(".github/workflows/publish-stable.yml", "utf8");
    expect(workflow).toContain("if (response.status !== 404)");
    expect(workflow).toContain("latest tag differs from certified version");
    expect(workflow).toContain("registry bytes differ from certified package");
    expect(workflow).not.toContain("0.1.0");
  });
});
