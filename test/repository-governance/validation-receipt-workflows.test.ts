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
    expect(source.indexOf('phases.runSync("npm-pack"')).toBeLessThan(source.indexOf('phases.run("package-receipt"'));
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
    const workflow = parse(await readFile(".github/workflows/release.yml", "utf8"));
    const packageJob = workflow.jobs.package;
    expect(step(packageJob, "Record verified candidate build").index).toBeLessThan(step(packageJob, "Pack the candidate exactly once").index);
    expect(step(packageJob, "Record downloaded registry candidate prerequisite").value.if).toBe("needs.plan.outputs.build != 'true'");
    const upload = packageJob.steps.find((candidate: any) => candidate.uses?.startsWith("actions/upload-artifact"));
    expect(upload.with.path).toContain("candidate.receipt.json");
    const validate = workflow.jobs.validate;
    expect(step(validate, "Record verified install-time build").index).toBeLessThan(step(validate, "Bind downloaded package to this validation job").index);
    const bind = step(validate, "Bind downloaded package to this validation job").value.run;
    expect(bind).toContain("--build-receipt .artifacts/validation/receipts/build.json");
    expect(bind).toContain("--source-identity .artifacts/release/candidate-identity.json");
    const run = step(validate, "Validate the exact package").value;
    expect(run.env).toMatchObject({
      VALIDATION_BUILD_RECEIPT: "${{ github.workspace }}/.artifacts/validation/receipts/build.json",
      VALIDATION_PACKAGE_RECEIPT: "${{ github.workspace }}/.artifacts/release/candidate.receipt.json",
      VALIDATION_PACKAGE_SOURCE_IDENTITY: "${{ github.workspace }}/.artifacts/release/candidate-identity.json",
    });
  });

  it("never treats receipt or download caches as publication authority", async () => {
    const sources = await Promise.all([".github/workflows/ci.yml", ".github/workflows/full-regression-shared.yml", ".github/workflows/release.yml", ".github/workflows/full-regression.yml"].map(path => readFile(path, "utf8")));
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
