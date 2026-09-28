import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { publicationValidationMatrix } from "../../scripts/release/publication-validation-matrix.mjs";

async function workflow(): Promise<string> {
  return await readFile(".github/workflows/publish.yml", "utf8");
}

describe("deliberate publication pipeline", () => {
  it("is the only npm publisher and is never triggered by a push", async () => {
    const publishers: string[] = [];
    for (const name of await readdir(".github/workflows")) {
      if ((await readFile(`.github/workflows/${name}`, "utf8")).includes("npm publish")) publishers.push(name);
    }
    expect(publishers).toEqual(["publish.yml"]);
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
    expect(source).toContain('const work = process.env.MODE === "nightly" || !exists || !installerExists;');
    expect(source).toContain("Download the immutable registry package");
    expect(source).toContain("registry tarball integrity differs from registry metadata");
    expect(source).toContain('selected=\'["package-smoke","package-install"]\'');
    expect(source).toContain('selected=\'["full-release"]\'');
    const validate = source.slice(source.indexOf("\n  validate:"), source.indexOf("\n  publish:"));
    expect(validate).toContain("if: always() && needs.plan.result == 'success' && needs.package.result == 'success'");
  });

  it("evaluates publication after an allowed prerequisite skip without weakening required outcomes", async () => {
    const source = await workflow();
    const publish = source.slice(source.indexOf("\n  publish:"), source.indexOf("\n  post_publish:"));
    expect(publish.match(/^    if: (.+)$/m)?.[1]).toBe("always() && (needs.plan.outputs.build == 'true' || needs.plan.outputs.installer_build == 'true') && needs.package.result == 'success' && (needs.documentation.result == 'success' || needs.documentation.result == 'skipped') && needs.validate.result == 'success'");

    const postPublish = source.slice(source.indexOf("\n  post_publish:"), source.indexOf("\n  complete:"));
    expect(postPublish.match(/^    if: (.+)$/m)?.[1]).toBe("always() && needs.plan.result == 'success' && needs.plan.outputs.work == 'true' && (needs.plan.outputs.build == 'true' || needs.plan.outputs.installer_build == 'true') && needs.package.result == 'success' && needs.publish.result == 'success'");

    const complete = source.slice(source.indexOf("\n  complete:"), source.indexOf("\n  result:"));
    expect(complete.match(/^    if: (.+)$/m)?.[1]).toBe("always() && needs.plan.result == 'success' && needs.plan.outputs.work == 'true' && (needs.plan.outputs.build == 'true' || needs.plan.outputs.installer_build == 'true') && needs.package.result == 'success' && needs.publish.result == 'success' && needs.post_publish.result == 'success'");

    const result = source.slice(source.indexOf("\n  result:"));
    expect(result).toContain('if [ "$WORK" != true ]; then');
    expect(result).toContain('test "$PUBLISH" = success');
    expect(result).toContain('test "$POST_PUBLISH" = success');
    expect(result).toContain('test "$COMPLETE" = success');
  });

  it("uses one established immutable checkout pin throughout the publication workflow", async () => {
    const source = await workflow();
    const checkoutReferences = [...source.matchAll(/uses: actions\/checkout@([^\s]+)/gu)].map(match => match[1]);
    expect(checkoutReferences.length).toBeGreaterThan(0);
    expect(new Set(checkoutReferences)).toEqual(new Set(["fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09"]));
  });

  it("names published-pair jobs from authoritative matrix fields", async () => {
    const source = await workflow();
    const postPublish = source.slice(source.indexOf("\n  post_publish:"), source.indexOf("\n  complete:"));
    expect(postPublish).toContain("name: Published pair ${{ matrix.platform }} / Node ${{ matrix.node }}");
    expect(postPublish).not.toContain("matrix.label");
  });

  it("uses the accepted installer target grammar for published-pair smoke", async () => {
    const source = await readFile("scripts/release/smoke-published-installer.mjs", "utf8");
    expect(source).toContain('const args = channel === "next" ? ["--develop", version] : [];');
    expect(source).not.toMatch(/\["--(?:version|latest|next)"(?:,\s*version)?\]/u);
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
    expect(source).toMatch(/      version:\r?\n        description: Stable version to stamp on the open development source \(stable channel only\)/);
    expect(source).toContain('if [ "$mode" = "stable" ]; then');
    expect(source).toContain("stable publication requires an explicit final version");
    expect(source).toContain("a development publication derives its own version and has no draft Release inputs");
    expect(source).toContain("const base = /^(\\d+\\.\\d+\\.\\d+)-dev$/.exec(declared)?.[1];");
    expect(source).toContain("version = process.env.REQUESTED_VERSION;");
    expect(source).toContain("is below the open development version");
    expect(source).not.toContain("stable publication requires a final version, not");
    const stamp = source.slice(source.indexOf("- name: Stamp the published version on the open development source"), source.indexOf("- name: Record verified candidate build"));
    expect(stamp).toContain("if: needs.plan.outputs.build == 'true'");
    expect(stamp).toContain('npm version "$RELEASE_VERSION" --no-git-tag-version --allow-same-version');
    const client = await readFile("scripts/release/publication-client.mjs", "utf8");
    expect(client).toContain('"-f", `version=${version}`');
    expect(client).toContain('"-f", `release_id=${options.draftReleaseId}`');
    expect(client).toContain('"-f", `release_notes_sha256=${options.releaseNoteSha256}`');
  });

  it("binds stable publication and GitHub Release text to an authorized draft snapshot", async () => {
    const source = await workflow();
    expect(source).toContain("Snapshot approved draft Release");
    expect(source).toContain("stable approval actor is not an authorized human repository user");
    expect(source).toContain("draft Release body differs from the explicitly approved digest");
    expect(source).toContain("approved-release-note-${{ github.run_id }}");
    expect(source).toContain("Assemble the approved note with committed history");
    expect(source).toContain("Require the approved Release to remain a draft");
    expect(source).toContain("approved GitHub Release was published or changed before npm publication");
    expect(source).toContain("Require the approved Release to remain unpublished");
    expect(source).toContain("approved GitHub Release was published or changed before stable completion");
    expect(source).toContain("Publish the approved draft GitHub Release");
    expect(source).toContain('gh api -X PATCH "repos/$GITHUB_REPOSITORY/releases/$RELEASE_ID"');
    expect(source).toContain("GitHub did not publish the approved draft with the expected identity and exact body");
    expect(source).toContain("release.body !== body");
    expect(source.indexOf('gh release upload "v${RELEASE_VERSION}"')).toBeLessThan(source.indexOf('gh api -X PATCH "repos/$GITHUB_REPOSITORY/releases/$RELEASE_ID"'));
    expect(source.indexOf('git/refs/heads/master')).toBeLessThan(source.indexOf('gh api -X PATCH "repos/$GITHUB_REPOSITORY/releases/$RELEASE_ID"'));
    expect(source).toContain("ref: ${{ needs.plan.outputs.source }}");
    expect(source).not.toContain("release-review PR");
    expect(source).not.toContain('--notes-file "docs/releases/${RELEASE_VERSION}.md"');
  });

  it("keeps preview and stable registry effects separate", async () => {
    const source = await workflow();
    expect(source).toContain('channel = "next"');
    expect(source).toContain('channel = "latest"');
    expect(source).toContain("needs.plan.outputs.channel == 'latest'");
    expect(source).toContain("git/refs/heads/master");
    expect(source).toContain("-F force=false");
    expect(source).toContain('draft: false');
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

  it("prepares a draft before explicit approval, then reopens develop through one note-and-version PR", async () => {
    const entry = await readFile("scripts/release/release.mjs", "utf8");
    const script = await readFile("scripts/release/release-workflow.mjs", "utf8");
    expect(entry).toContain("./release-workflow.mjs");
    const prepared = script.indexOf("const draft = await prepareDraftRelease");
    const approved = script.indexOf("const approval = approvedSnapshot");
    const dispatched = script.indexOf("await r.publish(source, plan.version, approval)");
    const reopened = script.indexOf("const reopened = await prepareVersion(");
    expect(prepared).toBeGreaterThan(0);
    expect(approved).toBeGreaterThan(prepared);
    expect(dispatched).toBeGreaterThan(approved);
    expect(reopened).toBeGreaterThan(dispatched);
    expect(script.match(/await prepareVersion\(/g)).toHaveLength(1);
    expect(script).toContain("OPEN_DEVELOPMENT.test(plan.current)");
    expect(script).toContain('dispatchPublication("stable", source, version, {');
    expect(script).toContain("assertAuthenticatedApprover");
    expect(script).toContain("stable approval requires an authenticated human GitHub user");
    expect(script).not.toMatch(/npm publish|npm pack/);
    expect(script).not.toMatch(/git\(\["tag"/);
    expect(script).not.toContain('"--auto"');
    expect(script).not.toContain('["pr", "merge"');
    expect(script).not.toContain('"--hard"');
    expect(script).not.toContain("prepareReleaseReview");
  });

  it("moves synchronized package versions with the exact approved note", async () => {
    const script = await readFile("scripts/release/release-workflow.mjs", "utf8");
    expect(script).not.toContain("replaceAll");
    expect(script).toContain('lock.packages[""].version = version');
    expect(script).toContain("installer.version = version");
    expect(script).toContain('"packages/a1-install/package.json"');
    expect(script).toContain("approval.markdown");
    expect(script).toContain("existing reopening PR release note differs from the approved snapshot");
  });
});
