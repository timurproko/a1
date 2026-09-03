import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function workflow(): Promise<string> {
  return await readFile(".github/workflows/release.yml", "utf8");
}

describe("deliberate publication pipeline", () => {
  it("is the only npm publisher and is never triggered by a push", async () => {
    const publishers: string[] = [];
    for (const name of await readdir(".github/workflows")) {
      if ((await readFile(`.github/workflows/${name}`, "utf8")).includes("npm publish")) publishers.push(name);
    }
    expect(publishers).toEqual(["release.yml"]);
    const source = await workflow();
    expect(source).toContain("workflow_dispatch:");
    expect(source).toContain('cron: "17 3 * * *"');
    expect(source).not.toMatch(/^\s*push:/m);
  });

  it("selects current develop once and resolves its merged pull request through GitHub", async () => {
    const source = await workflow();
    expect(source).toContain("git/ref/heads/develop");
    expect(source).toContain("commits/$SOURCE_SHA/pulls");
    expect(source).toContain('pull?.merge_commit_sha === process.env.SOURCE_SHA');
    expect(source).toContain("expected exactly one");
    expect(source).toContain("`${base}-dev.${pullRequest}`");
    expect(source).not.toContain("github.run_number");
  });

  it("separates manual early no-op from complete nightly registry verification", async () => {
    const source = await workflow();
    expect(source).toContain('const work = process.env.MODE === "nightly" || !exists');
    expect(source).toContain("Download the immutable registry package");
    expect(source).toContain("registry tarball integrity differs from registry metadata");
    expect(source).toContain('selected=\'["package-smoke","package-install"]\'');
    expect(source).toContain('selected=\'["full-release"]\'');
    const validate = source.slice(source.indexOf("\n  validate:"), source.indexOf("\n  publish:"));
    expect(validate).toContain("if: always() && needs.plan.result == 'success' && needs.package.result == 'success'");
  });

  it("evaluates publication after an allowed prerequisite skip without weakening required outcomes", async () => {
    const source = await workflow();
    const publish = source.slice(source.indexOf("\n  publish:"), source.indexOf("\n  result:"));
    const condition = publish.match(/^    if: (.+)$/m)?.[1];
    expect(condition).toBe("always() && needs.plan.outputs.build == 'true' && needs.package.result == 'success' && (needs.documentation.result == 'success' || needs.documentation.result == 'skipped') && needs.validate.result == 'success'");

    const result = source.slice(source.indexOf("\n  result:"));
    expect(result).toContain('if [ "$WORK" != true ]; then');
    expect(result).toContain('if [ "$BUILD" = true ]; then test "$PUBLISH" = success; fi');
  });

  it("serializes registry publication without cancellation", async () => {
    const source = await workflow();
    expect(source).toContain("group: a1-registry-publication");
    expect(source).toContain("cancel-in-progress: false");
    expect(source).toContain("Serialize the final registry check");
    expect(source).toContain("existing registry bytes differ from the validated candidate");
  });

  it("binds source, pull request, final version, and tarball digests", async () => {
    const source = await workflow();
    expect(source).toContain('schema: "a1-packed-candidate-v1"');
    expect(source).toContain("pullRequest:");
    expect(source).toContain("manifest.version");
    expect(source).toContain("integrity, shasum");
  });

  it("packs new candidates once and validates exact bytes on each platform", async () => {
    const source = await workflow();
    expect(source.match(/node scripts\/release\/prepare-validation-package\.mjs/g)).toHaveLength(1);
    for (const platform of ["win32", "linux", "darwin"]) expect(source).toContain(`platform: ${platform}`);
    expect(source).toContain("VALIDATION_CANDIDATE_TARBALL:");
    expect(source).toContain('npm publish "$release_tarball"');
    expect(source).toContain("--provenance");
    const publish = source.slice(source.indexOf("\n  publish:"));
    expect(publish).not.toMatch(/npm ci|npm run build|prepare-validation-package/);
  });

  it("keeps preview and stable registry effects separate", async () => {
    const source = await workflow();
    expect(source).toContain('channel = "next"');
    expect(source).toContain('channel = "latest"');
    expect(source).toContain("needs.plan.outputs.channel == 'latest'");
    expect(source).toContain("git/refs/heads/master");
    expect(source).toContain("-F force=false");
    expect(source).toContain("--verify-tag");
  });
});

describe("maintainer publication commands", () => {
  it("exposes develop and returns before dispatch when npm already has the version", async () => {
    const [manifestText, script] = await Promise.all([
      readFile("package.json", "utf8"),
      readFile("scripts/development/develop.mjs", "utf8"),
    ]);
    const manifest = JSON.parse(manifestText) as { scripts: Record<string, string> };
    expect(manifest.scripts.develop).toBe("node scripts/development/develop.mjs");
    expect(script.indexOf("const existing = await registryVersion")).toBeLessThan(script.indexOf('await dispatchPublication("develop"'));
    expect(script).toContain("already exists");
    expect(script).not.toContain("process.exit");
    expect(script).not.toMatch(/npm publish|npm pack/);
  });

  it("makes stable publication an explicit waited dispatch before reopening develop", async () => {
    const script = await readFile("scripts/release/release.mjs", "utf8");
    const landed = script.indexOf("await landVersion(version,");
    const dispatched = script.indexOf('await dispatchPublication("stable"');
    const reopened = script.indexOf("open ${opening}");
    expect(landed).toBeGreaterThan(0);
    expect(dispatched).toBeGreaterThan(landed);
    expect(reopened).toBeGreaterThan(dispatched);
    expect(script).not.toMatch(/npm publish|npm pack/);
    expect(script).not.toMatch(/git\(\["tag"/);
  });

  it("moves only this package's version", async () => {
    const script = await readFile("scripts/release/release.mjs", "utf8");
    expect(script).not.toContain("replaceAll");
    expect(script).toContain('lock.packages[""].version = version');
  });
});
