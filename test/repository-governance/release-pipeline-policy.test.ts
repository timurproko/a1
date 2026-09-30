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
    expect(source).toContain("workflow_call:");
    expect(source).not.toContain("workflow_dispatch:");
    expect(source).toContain('cron: "17 3 * * *"');
    expect(source).not.toMatch(/^\s*push:/m);
    expect(await readFile(".github/workflows/develop.yml", "utf8")).toContain("workflow_dispatch:");
    expect(await readFile(".github/workflows/release-candidate.yml", "utf8")).toContain("workflow_dispatch:");
    await expect(readFile(".github/workflows/approve-release.yml", "utf8")).rejects.toThrow();
    expect(await readFile(".github/workflows/finalize-release.yml", "utf8")).toContain("types: [published]");
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
    expect(validate).toContain("if: always() && needs.plan.result == 'success' && needs.plan.outputs.mode != 'stable' && needs.package.result == 'success'");
  });

  it("evaluates publication after an allowed prerequisite skip without weakening required outcomes", async () => {
    const source = await workflow();
    const publish = source.slice(source.indexOf("\n  publish:"), source.indexOf("\n  post_publish:"));
    expect(publish.match(/^    if: (.+)$/m)?.[1]).toBe("always() && needs.plan.outputs.mode != 'candidate' && (needs.plan.outputs.build == 'true' || needs.plan.outputs.installer_build == 'true') && needs.package.result == 'success' && (needs.documentation.result == 'success' || needs.documentation.result == 'skipped') && (needs.validate.result == 'success' || (needs.plan.outputs.mode == 'stable' && needs.validate.result == 'skipped'))");

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

  it("runs every job below plan after a skipped approval and packs a build only with every guardian", async () => {
    const source = await workflow();
    const jobs = [...source.matchAll(/^  ([a-z_]+):\n    name: /gm)].map(match => match[1]!);
    expect(jobs.slice(0, 3)).toEqual(["source", "approval", "plan"]);
    // Rationale: approval skips outside stable and candidate modes, and GitHub's implicit success()
    // then skipped guardians and documentation, so nightly packed only the Windows guardian.
    for (const [index, name] of jobs.entries()) {
      if (index < 2) continue;
      const body = source.slice(source.indexOf(`\n  ${name}:\n`), index + 1 < jobs.length ? source.indexOf(`\n  ${jobs[index + 1]}:\n`) : undefined);
      expect(body.match(/^    if: (.+)$/m)?.[1], name).toMatch(/^always\(\)/);
    }
    const job = (name: string, next: string) => source.slice(source.indexOf(`\n  ${name}:`), source.indexOf(`\n  ${next}:`));
    expect(job("documentation", "guardians").match(/^    if: (.+)$/m)?.[1]).toBe("always() && needs.plan.result == 'success' && (needs.plan.outputs.mode == 'nightly' || needs.plan.outputs.mode == 'candidate')");
    const pkg = job("package", "validate").match(/^    if: (.+)$/m)?.[1];
    expect(pkg).toContain("(needs.guardians.result == 'success' || (needs.guardians.result == 'skipped' && (needs.plan.outputs.build != 'true' || needs.plan.outputs.mode == 'stable')))");
    expect(pkg).toContain("(needs.documentation.result == 'success' || (needs.documentation.result == 'skipped' && needs.plan.outputs.mode != 'nightly' && needs.plan.outputs.mode != 'candidate'))");
  });

  it("publishes stable releases from the candidate-validated package without rebuilding or revalidating", async () => {
    const source = await workflow();
    const job = (name: string, next: string) => source.slice(source.indexOf(`\n  ${name}:`), source.indexOf(`\n  ${next}:`));
    expect(job("approval", "plan")).toContain("validation_run_id: ${{ steps.approval.outputs.validation_run_id }}");
    expect(job("approval", "plan")).toContain("console.log(`validation_run_id=${validationRunId ?? \"\"}`);");
    expect(job("plan", "documentation")).toContain("validation_run_id: ${{ needs.approval.outputs.validation_run_id }}");
    expect(job("guardians", "package").match(/^    if: (.+)$/m)?.[1]).toBe("always() && needs.plan.result == 'success' && needs.plan.outputs.build == 'true' && needs.plan.outputs.mode != 'stable'");
    expect(job("validate", "publish").match(/^    if: (.+)$/m)?.[1]).toContain("needs.plan.outputs.mode != 'stable'");
    expect(job("validate", "publish")).not.toContain('[ "$MODE" = "stable" ]');

    const pkg = job("package", "validate");
    const download = pkg.slice(pkg.indexOf("- name: Download the candidate-validated package pair"), pkg.indexOf("- name: Explain an unavailable candidate package"));
    expect(download).toContain("if: needs.plan.outputs.mode == 'stable'");
    expect(download).toContain("name: release-package-${{ needs.plan.outputs.version }}");
    expect(download).toContain("run-id: ${{ needs.plan.outputs.validation_run_id }}");
    expect(download).toContain("github-token: ${{ github.token }}");
    expect(pkg).toContain("rerun candidate validation of this source and version");
    expect(pkg.indexOf("node scripts/release/adopt-validated-candidate.mjs")).toBeLessThan(pkg.indexOf("- name: Bind packed source and identity"));
    // Invariant: every build and pack step is closed to stable mode, so stable bytes come only from adoption.
    for (const step of ["Prepare Rust toolchain", "Install dependencies and build source once", "Install package tooling without building the application",
      "Assemble all platform process guardians", "Stamp the published version on the open development source", "Record verified candidate build",
      "Pack the candidate exactly once", "Pack the installer candidate exactly once"]) {
      const body = pkg.slice(pkg.indexOf(`- name: ${step}`));
      expect(body.match(/^        if: (.+)$/m)?.[1], step).toContain("needs.plan.outputs.mode != 'stable'");
    }

    const result = source.slice(source.indexOf("\n  result:"));
    expect(result).toContain('if [ "$MODE" = stable ]; then test "$VALIDATE" = skipped; else test "$VALIDATE" = success; fi');
    expect(result).toContain("!(needs.plan.outputs.mode == 'stable' && needs.validate.result == 'skipped')");
  });

  it("proves npm trusted publishing for both packages before either upload and uses no npm token", async () => {
    const source = await workflow();
    const publish = source.slice(source.indexOf("\n  publish:"), source.indexOf("\n  post_publish:"));
    const preflight = publish.indexOf("- name: Prove npm trusted publishing for both packages");
    expect(preflight).toBeGreaterThan(publish.indexOf("- name: Serialize the final registry check"));
    expect(preflight).toBeLessThan(publish.indexOf("- name: Publish the exact validated installer package"));
    expect(preflight).toBeLessThan(publish.indexOf("- name: Publish the exact validated application package"));
    expect(publish).toContain("run: node scripts/release/npm-trust-preflight.mjs");
    expect(publish).toContain("environment: npm-publish");
    expect(publish).toContain("id-token: write");
    const workflows = await Promise.all((await readdir(".github/workflows")).map(name => readFile(`.github/workflows/${name}`, "utf8")));
    expect(workflows.join("\n")).not.toMatch(/NPM_BOOTSTRAP_TOKEN|NODE_AUTH_TOKEN:/u);
    const rollback = await readFile("scripts/release/rollback-publication.mjs", "utf8");
    expect(rollback).not.toContain("Prove npm trusted publishing");
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
    expect(source.indexOf("Exercise the exact published pair")).toBeLessThan(source.indexOf("Upload the exact asset to the published Release"));
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

  it("stamps the published stable version on the open development source at pack time", async () => {
    const [source, candidate, finalizer, client] = await Promise.all([
      workflow(),
      readFile(".github/workflows/release-candidate.yml", "utf8"),
      readFile(".github/workflows/finalize-release.yml", "utf8"),
      readFile("scripts/release/publication-client.mjs", "utf8"),
    ]);
    expect(source).toContain("description: Stable version named by the prepared or published Release tag");
    expect(source).toContain("const base = /^(\\d+\\.\\d+\\.\\d+)-dev$/.exec(declared)?.[1];");
    expect(source).toContain("version = process.env.REQUESTED_VERSION;");
    expect(source).toContain("is below the open development version");
    const stamp = source.slice(source.indexOf("- name: Stamp the published version on the open development source"), source.indexOf("- name: Record verified candidate build"));
    expect(stamp).toContain("if: needs.plan.outputs.build == 'true'");
    expect(stamp).toContain('npm version "$RELEASE_VERSION" --no-git-tag-version --allow-same-version');
    expect(candidate).toContain("uses: timurproko/a1/.github/workflows/publish.yml@develop");
    expect(candidate).toContain("channel: candidate");
    expect(finalizer).toContain("types: [published]");
    expect(finalizer).toContain("uses: timurproko/a1/.github/workflows/publish.yml@develop");
    expect(finalizer).toContain("channel: stable");
    expect(finalizer).toContain("release_id: ${{ needs.identify.outputs.release_id }}");
    expect(finalizer).not.toMatch(/source_sha:/);
    expect(source).toContain("stable publication must originate from native publication of the prepared draft Release");
    expect(source).toContain('expected_workflow="$GITHUB_REPOSITORY/.github/workflows/finalize-release.yml@$expected_ref"');
    expect(source).toContain("stable candidate validation must originate from its trusted default-branch wrapper");
    expect(source).toContain("is not part of develop history");
    expect(client).toContain('"workflow", "run", workflow, "--ref", "develop"');
    expect(client).not.toContain("repository_dispatch");
    expect(client).not.toContain("a1-stable-release-reviewed");
  });

  it("publishes only a published, validated, source-bound Release and returns failures before npm to draft", async () => {
    const source = await workflow();
    const approval = await readFile("scripts/release/release-approval.mjs", "utf8");
    const finalizer = await readFile(".github/workflows/finalize-release.yml", "utf8");
    expect(source).toContain("Snapshot the stable Release note");
    expect(source).toContain("assertAuthorizedApprovalActor(actor, permission, actorName)");
    expect(source).toContain("requireStableValidation(runs.workflow_runs, source, version)");
    expect(approval).toContain("stable approval actor is not an authorized human repository user");
    expect(approval).toContain('createHash("sha256").update(note.markdown, "utf8").digest("hex")');
    expect(source).toContain('writeFile(".artifacts/release-note/approved-note.md", note.markdown');
    expect(source).toContain("approved-release-note-${{ github.run_id }}");
    expect(source).toContain("Assemble the approved note with committed history");
    expect(source).toContain("Require the published Release to remain unchanged");
    expect(source).toContain("published GitHub Release was unpublished or changed before npm publication");
    expect(source.indexOf("Require the published Release to remain unchanged")).toBeLessThan(source.indexOf("Publish the exact validated installer package"));
    expect(source.indexOf('gh release upload "v${RELEASE_VERSION}" "$release_tarball"')).toBeGreaterThan(source.indexOf("Exercise the exact published pair"));
    expect(source.indexOf('gh release upload "v${RELEASE_VERSION}" "$release_tarball"')).toBeLessThan(source.indexOf("git/refs/heads/master"));
    expect(source).not.toContain("a1-stable-staging-v1");
    expect(source).not.toContain("Tag the published commit");
    expect(source).not.toMatch(/git\/refs\/tags\/[^\n]*(?:DELETE|force=true)/u);
    expect(source).not.toMatch(/git (?:tag -d|push [^\n]*--delete)/u);
    const rollback = finalizer.slice(finalizer.indexOf("\n  rollback:"), finalizer.indexOf("\n  reopen:"));
    expect(rollback).toContain("if: always() && needs.identify.result == 'success' && needs.publish.result != 'success'");
    expect(rollback).toContain("node scripts/release/rollback-publication.mjs");
    expect(rollback).toContain("ref: develop");
    expect(rollback).toContain("permission-contents: write");
    expect(rollback).not.toContain("npm publish");
    const reopen = finalizer.slice(finalizer.indexOf("\n  reopen:"));
    expect(reopen).toContain("needs: publish");
    expect(reopen).not.toContain("always()");
  });

  it("authorizes dispatch wrappers by their caller event and default-branch workflow identity", async () => {
    // Rationale: a reusable workflow sees its caller's event, so a dispatched wrapper arrives as workflow_dispatch.
    const source = await workflow();
    for (const wrapper of ["release-candidate.yml", "develop.yml"]) {
      const branch = source.slice(source.indexOf(`.github/workflows/${wrapper}@refs/heads/develop`));
      expect(branch.slice(0, 300)).toContain('if [ "$EVENT_NAME" != "workflow_dispatch" ] || [ "$GITHUB_REF" != "refs/heads/develop" ]');
      expect(await readFile(`.github/workflows/${wrapper}`, "utf8")).toMatch(/^  workflow_dispatch:/mu);
    }
    expect(source).not.toContain('"$EVENT_NAME" != "workflow_call"');
  });

  it("keeps preview and stable registry effects separate", async () => {
    const source = await workflow();
    expect(source).toContain('channel = "next"');
    expect(source).toContain('channel = "latest"');
    expect(source).toContain("needs.plan.outputs.channel == 'latest'");
    expect(source).toContain("git/refs/heads/master");
    expect(source).toContain("-F force=false");
    expect(source).not.toContain('draft: false');
    const finalizer = await readFile(".github/workflows/finalize-release.yml", "utf8");
    expect(finalizer).toContain("release:");
    expect(finalizer).toContain("channel: stable");
    expect(finalizer).not.toContain("npm publish");
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

  it("prepares the draft, starts validation, and leaves publication plus reopening to trusted workflows", async () => {
    const entry = await readFile("scripts/release/release.mjs", "utf8");
    const script = await readFile("scripts/release/release-workflow.mjs", "utf8");
    const publication = await workflow();
    expect(entry).toContain("./release-workflow.mjs");
    expect(script).toContain("const draft = await prepareDraftRelease");
    expect(script).toContain("OPEN_DEVELOPMENT.test(plan.current)");
    expect(script).toContain("dispatchValidation");
    expect(script).toContain("choose Publish release");
    expect(script).not.toContain("waitForDraftSave");
    expect(script).not.toContain("Save draft");
    expect(script).not.toContain("approvedSnapshot");
    expect(script).not.toContain("prepareVersion");
    expect(script).not.toMatch(/npm publish|npm pack/);
    expect(publication).not.toContain("node scripts/release/prepare-reopening.mjs");
    const finalizer = await readFile(".github/workflows/finalize-release.yml", "utf8");
    expect(finalizer).toContain("node scripts/release/prepare-reopening.mjs");
    expect(finalizer).toContain("actions/create-github-app-token@");
    expect(finalizer).not.toContain('["pr", "merge"');
  });

  it("moves synchronized package versions with the exact approved note in one manual reopening PR", async () => {
    const script = await readFile("scripts/release/prepare-reopening.mjs", "utf8");
    expect(script).toContain('value.lock.packages[""].version = version');
    expect(script).toContain("value.installer.version = version");
    expect(script).toContain('"packages/a1-install/package.json"');
    expect(script).toContain("reopening release note differs from the approved snapshot");
    expect(script).toContain("autoMergeRequest !== null");
    expect(script).toContain("--force-with-lease=refs/heads/${branch}:");
    expect(script).toContain('["pr", "create"');
    expect(script).not.toContain('["pr", "merge"');
  });
});
