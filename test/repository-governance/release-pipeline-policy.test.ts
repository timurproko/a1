import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { publicationValidationMatrix } from "../../scripts/release/publication-validation-matrix.mjs";

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
    expect(condition).toBe("always() && (needs.plan.outputs.build == 'true' || needs.plan.outputs.installer_build == 'true') && needs.package.result == 'success' && (needs.documentation.result == 'success' || needs.documentation.result == 'skipped') && needs.validate.result == 'success'");

    const result = source.slice(source.indexOf("\n  result:"));
    expect(result).toContain('if [ "$WORK" != true ]; then');
    expect(result).toContain('test "$PUBLISH" = success');
    expect(result).toContain('test "$POST_PUBLISH" = success');
    expect(result).toContain('test "$COMPLETE" = success');
  });

  it("serializes registry publication without cancellation", async () => {
    const source = await workflow();
    expect(source).toContain("group: a1-registry-publication");
    expect(source).toContain("cancel-in-progress: false");
    expect(source).toContain("Serialize the final registry check");
    expect(source).toContain("registry bytes differ from the validated candidate");
    expect(source).toContain("installer registry bytes differ from the validated package");
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
    expect(source.match(/node scripts\/release\/prepare-installer-package\.mjs/g)).toHaveLength(1);
    expect(source).toContain("node scripts/release/validate-installer-package.mjs");
    expect(source).toContain("matrix: ${{ fromJson(needs.plan.outputs.validate_matrix) }}");
    for (const platform of ["win32", "linux", "darwin"]) {
      expect(publicationValidationMatrix("develop").include.some(lane => lane.platform.startsWith(platform))).toBe(true);
    }
    expect(source).toContain("VALIDATION_CANDIDATE_TARBALL:");
    expect(source).toContain('npm publish "$release_tarball"');
    expect(source).toContain('npm publish "$installer_tarball"');
    expect(source).toContain("--provenance");
    const publish = source.slice(source.indexOf("\n  publish:"));
    expect(publish.slice(0, publish.indexOf("\n  post_publish:"))).not.toMatch(/npm ci|npm run build|prepare-validation-package/);
    expect(source.indexOf("Exercise the exact published pair")).toBeLessThan(source.indexOf("Tag the published commit"));
  });

  it("packs native process guardians with host-independent executability", async () => {
    const packScript = await readFile("scripts/release/prepare-validation-package.mjs", "utf8");
    expect(packScript).toContain("./repair-native-executable-modes.mjs");
    expect(packScript).toContain("repairNativeExecutableModes");
    const repair = await readFile("scripts/release/repair-native-executable-modes.mjs", "utf8");
    expect(repair).toContain("guardianBinaryReference");
    expect(repair).toContain("0o755");
    const evidence = await readFile("scripts/governance/candidate-evidence.mjs", "utf8");
    expect(evidence).toContain("a1-process-guardian-artifact-v1");
    const surface = await readFile("test/foundation/release/package-surface.test.ts", "utf8");
    expect(surface).toContain("records every packed native process guardian as executable");
  });

  it("stamps the requested stable version on the open development source at pack time", async () => {
    const source = await workflow();
    expect(source).toContain("      version:\n        description: Stable version to stamp on the open development source (stable channel only)");
    expect(source).toContain('if [ "$mode" = "stable" ]; then');
    expect(source).toContain("stable publication requires an explicit final version");
    expect(source).toContain("a development publication derives its own version; do not pass one");
    expect(source).toContain("const base = /^(\\d+\\.\\d+\\.\\d+)-dev$/.exec(declared)?.[1];");
    expect(source).toContain("version = process.env.REQUESTED_VERSION;");
    expect(source).toContain("is below the open development version");
    expect(source).not.toContain("stable publication requires a final version, not");
    const stamp = source.slice(source.indexOf("- name: Stamp the published version on the open development source"), source.indexOf("- name: Record verified candidate build"));
    expect(stamp).toContain("if: needs.plan.outputs.build == 'true'");
    expect(stamp).toContain('npm version "$RELEASE_VERSION" --no-git-tag-version --allow-same-version');
    const client = await readFile("scripts/release/publication-client.mjs", "utf8");
    expect(client).toContain('...(channel === "stable" ? ["-f", `version=${version}`] : [])');
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
    expect(script).not.toContain("process.exit(");
    expect(script).toContain("process.exitCode = 1");
    expect(script.indexOf("try {")).toBeLessThan(script.indexOf("await main();"));
    expect(script).toContain("log(error instanceof Error ? error.message : String(error))");
    expect(script).not.toMatch(/npm publish|npm pack/);
  });

  it("publishes stable from the open development source, then reopens develop through one version PR", async () => {
    const entry = await readFile("scripts/release/release.mjs", "utf8");
    const script = await readFile("scripts/release/release-workflow.mjs", "utf8");
    expect(entry).toContain("./release-workflow.mjs");
    const dispatched = script.indexOf("await r.publish(source, plan.version)");
    const reopened = script.indexOf("const reopened = await prepareVersion(");
    expect(dispatched).toBeGreaterThan(0);
    expect(reopened).toBeGreaterThan(dispatched);
    expect(script.match(/await prepareVersion\(/g)).toHaveLength(1);
    expect(script).toContain("OPEN_DEVELOPMENT.test(plan.current)");
    expect(script).toContain('dispatchPublication("stable", source, version)');
    expect(script).not.toMatch(/npm publish|npm pack/);
    expect(script).not.toMatch(/git\(\["tag"/);
    expect(script).not.toContain('"--auto"');
    expect(script).not.toContain('["pr", "merge"');
    expect(script).not.toContain('"--hard"');
  });

  it("moves only the synchronized package versions", async () => {
    const script = await readFile("scripts/release/release-workflow.mjs", "utf8");
    expect(script).not.toContain("replaceAll");
    expect(script).toContain('lock.packages[""].version = version');
    expect(script).toContain("installer.version = version");
    expect(script).toContain('"packages/a1-install/package.json"');
  });
});
