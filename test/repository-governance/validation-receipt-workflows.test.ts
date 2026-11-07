import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { DEVELOPMENT_VALIDATION_MATRIX } from "../../scripts/release/validation-matrix.mjs";

function step(job: any, name: string) {
  const index = job.steps.findIndex((candidate: any) => candidate.name === name);
  expect(index, `${name} missing`).toBeGreaterThanOrEqual(0);
  return { index, value: job.steps[index] };
}

describe("workflow prerequisite receipts", () => {
  it("records build identity after installation and verifies it in every active build matrix cell", async () => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    const job = workflow.jobs.modular;
    const install = step(job, "Install exact dependencies and build");
    const receipt = step(job, "Record verified install-time build");
    const run = step(job, "Run exact selected scopes");
    expect([install.index, receipt.index, run.index]).toEqual([...new Set([install.index, receipt.index, run.index])].sort((a, b) => a - b));
    expect(receipt.value.if).toContain("matrix.build");
    expect(receipt.value.run).toBe("node scripts/release/record-validation-prerequisite.mjs build");
    expect(run.value.env.VALIDATION_BUILD_RECEIPT).toContain(".artifacts/validation/receipts/build.json");
    expect(step(job, "Cache process guardian build").index).toBeLessThan(receipt.index);
    expect(DEVELOPMENT_VALIDATION_MATRIX.find(entry => entry.group === "startup")).toMatchObject({ node: 22, build: true, defender: true });
  });

  it("verifies the build immediately before packing and then binds the exact package receipt", async () => {
    const source = await readFile("scripts/release/prepare-validation-package.mjs", "utf8");
    expect(source.indexOf('phases.run("verify-build-receipt"')).toBeLessThan(source.indexOf('phases.runSync("npm-pack"'));
    expect(source.indexOf('phases.run("verify-local-native-artifacts"')).toBeLessThan(source.indexOf('phases.runSync("npm-pack"'));
    expect(source.indexOf('phases.runSync("npm-pack"')).toBeLessThan(source.indexOf('phases.run("package-receipt"'));
  });

  // Rationale: a candidate packed without the release terminal host makes every packaged launch fall
  // back to the direct UI, so #750's packaged suites passed on pull requests and failed at publication.
  it("provides the release terminal host to every packed candidate before recording the build", async () => {
    const ci = parse(await readFile(".github/workflows/ci.yml", "utf8")).jobs.modular;
    const full = parse(await readFile(".github/workflows/full-regression-shared.yml", "utf8")).jobs;
    const packed = "steps.job-selection.outputs.packs_candidate == 'true'";
    const cacheMiss = `${packed} && steps.release-terminal-host.outputs.cache-hit != 'true'`;
    for (const [job, install, condition] of [
      [ci, "Install exact dependencies and build", cacheMiss],
      [full["windows-shard"], "Install dependencies and build once", "matrix.shard == 'package' || matrix.shard == 'predecessor'"],
      [full["full-regression"], "Install dependencies and build once", undefined],
    ] as const) {
      const build = step(job, "Build the release terminal host into the candidate");
      expect(build.value.run).toBe("npm run build:terminal-host");
      expect(build.value.if).toBe(condition);
      expect(step(job, install).index).toBeLessThan(step(job, "Set up Zig for the release terminal host").index);
      expect(step(job, "Cache release terminal host build").value.with["shared-key"]).toBe(job === ci
        ? "terminal-host-release${{ runner.os == 'macOS' && format('-{0}-xcode-26.0.1', matrix.os) || '' }}"
        : "terminal-host-release");
      expect(build.index).toBeLessThan(step(job, "Record verified install-time build").index);
    }
    const reuse = step(ci, "Reuse the restored release terminal host");
    const verify = step(ci, "Verify the candidate's release terminal host");
    expect(reuse.value.if).toBe(`${packed} && steps.release-terminal-host.outputs.cache-hit == 'true'`);
    expect(reuse.value.run).toBe("node scripts/development/build-terminal-host.mjs --reuse");
    expect(verify.value.if).toBe(packed);
    expect(verify.value.run).toBe("node scripts/release/verify-native-artifacts.mjs --local");
    expect(step(ci, "Build the release terminal host into the candidate").index).toBeLessThan(verify.index);
    expect(reuse.index).toBeLessThan(verify.index);
    expect(verify.index).toBeLessThan(step(ci, "Record verified install-time build").index);
    // Performance: Windows/Linux validation shares the release cache saved by publication and
    // Full regression; Development's macOS SDK intentionally has its own cache namespace.
    const publish = parse(await readFile(".github/workflows/publish.yml", "utf8")).jobs.terminal_hosts;
    expect(step(publish, "Cache terminal host build").value.with).toEqual({ "shared-key": "terminal-host-release", workspaces: "native/terminal-host" });
  });

  it("binds full-regression build and package receipts before the complete plan", async () => {
    const workflow = parse(await readFile(".github/workflows/full-regression-shared.yml", "utf8"));
    const job = workflow.jobs["full-regression"];
    const install = step(job, "Install dependencies and build once");
    const build = step(job, "Record verified install-time build");
    const pack = step(job, "Pack exact regression candidate once");
    const run = step(job, "Run complete non-physical validation");
    expect([install.index, build.index, pack.index, run.index]).toEqual([...new Set([install.index, build.index, pack.index, run.index])].sort((a, b) => a - b));
    expect(pack.value.env.VALIDATION_BUILD_RECEIPT).toContain("receipts/build.json");
    expect(run.value.env).toMatchObject({
      VALIDATION_BUILD_READY: "1",
      VALIDATION_BUILD_RECEIPT: "${{ github.workspace }}/.artifacts/validation/receipts/build.json",
      VALIDATION_CANDIDATE_TARBALL: "${{ github.workspace }}/.artifacts/validation/package/candidate.tgz",
      VALIDATION_PACKAGE_RECEIPT: "${{ github.workspace }}/.artifacts/validation/package/candidate.receipt.json",
    });
  });

  it("retains release package authority while creating validation-job-local receipts", async () => {
    const workflow = parse(await readFile(".github/workflows/publish.yml", "utf8"));
    const packageJob = workflow.jobs.package;
    expect(step(packageJob, "Record verified candidate build").index).toBeLessThan(step(packageJob, "Pack the candidate exactly once").index);
    expect(step(packageJob, "Record downloaded registry candidate prerequisite").value.if).toBe("needs.plan.outputs.build != 'true'");
    const upload = packageJob.steps.find((candidate: any) => candidate.uses?.startsWith("actions/upload-artifact"));
    expect(upload.with.path).toContain("candidate.receipt.json");
    for (const [jobName, bindName, runName] of [
      ["validate_sequential", "Bind downloaded package to this validation job", "Validate the exact package"],
      ["validate_windows_shard", "Bind downloaded package to this validation shard", "Run complete publication validation shard"],
    ] as const) {
      const validate = workflow.jobs[jobName];
      const build = step(validate, "Record verified install-time build");
      const bound = step(validate, bindName);
      expect(build.index).toBeLessThan(bound.index);
      expect(bound.value.run).toContain("--build-receipt .artifacts/validation/receipts/build.json");
      expect(bound.value.run).toContain("--source-identity .artifacts/release/candidate-identity.json");
      const run = step(validate, runName).value;
      expect(run.env).toMatchObject({
        VALIDATION_BUILD_RECEIPT: "${{ github.workspace }}/.artifacts/validation/receipts/build.json",
        VALIDATION_PACKAGE_RECEIPT: "${{ github.workspace }}/.artifacts/release/candidate.receipt.json",
        VALIDATION_PACKAGE_SOURCE_IDENTITY: "${{ github.workspace }}/.artifacts/release/candidate-identity.json",
      });
    }
  });

  it("never treats receipt or download caches as publication authority", async () => {
    const sources = await Promise.all([".github/workflows/ci.yml", ".github/workflows/full-regression-shared.yml", ".github/workflows/publish.yml", ".github/workflows/full-regression.yml"].map(path => readFile(path, "utf8")));
    for (const source of sources) {
      expect(source).not.toMatch(/node_modules[\s\S]{0,80}(?:cache|restore)|certification-[^\s]*[\s\S]{0,80}(?:cache|restore)/i);
      expect(source).not.toMatch(/startup-node[^\s]*performance[^\n]*(?:cache|restore)/i);
    }
    const release = sources[2]!;
    const publish = release.slice(release.indexOf("\n  publish:"));
    expect(publish).not.toContain("VALIDATION_PACKAGE_RECEIPT");
    expect(publish).toContain("EXPECTED_INTEGRITY");
  });
});
