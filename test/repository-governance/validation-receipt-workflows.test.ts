import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

function step(job: any, name: string) {
  const index = job.steps.findIndex((candidate: any) => candidate.name === name);
  expect(index, `${name} missing`).toBeGreaterThanOrEqual(0);
  return { index, value: job.steps[index] };
}

describe("workflow prerequisite receipts", () => {
  it("records build identity after installation and verifies it before development reuse", async () => {
    const workflow = parse(await readFile(".github/workflows/ci.yml", "utf8"));
    for (const name of ["validate", "startup", "containment"]) {
      const job = workflow.jobs[name];
      const install = job.steps.findIndex((candidate: any) => candidate.run === "npm ci" || candidate.name?.includes("Install exact dependencies"));
      const receipt = step(job, "Record verified install-time build");
      expect(receipt.index, name).toBeGreaterThan(install);
      expect(receipt.value.run).toBe("node scripts/release/record-validation-prerequisite.mjs build");
      const tier = job.steps.filter((candidate: any) => candidate.run?.includes("run-validation-tier.mjs"));
      expect(tier.length, name).toBeGreaterThan(0);
      for (const candidate of tier) {
        if (candidate.env?.VALIDATION_BUILD_READY === "1") expect(candidate.env.VALIDATION_BUILD_RECEIPT.replaceAll("\\", "/")).toContain(".artifacts/validation/receipts/build.json");
      }
    }
    const startup = workflow.jobs.startup;
    expect(step(startup, "Cache process guardian build").index).toBeLessThan(step(startup, "Record verified install-time build").index);
    expect(step(startup, "Validate exact-package identity, layers, recovery, and cleanup").value.env).toMatchObject({
      VALIDATION_PACKAGE_RECEIPT: "${{ github.workspace }}/.artifacts/validation/package/candidate.receipt.json",
    });
  });

  it("binds full-regression build and package receipts before the complete plan", async () => {
    const workflow = parse(await readFile(".github/workflows/full-regression.yml", "utf8"));
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
    expect(bind).toContain("--source-identity .artifacts/release/candidate-identity.json");
    const run = step(validate, "Validate the exact package").value;
    expect(run.env).toMatchObject({
      VALIDATION_BUILD_RECEIPT: "${{ github.workspace }}/.artifacts/validation/receipts/build.json",
      VALIDATION_PACKAGE_RECEIPT: "${{ github.workspace }}/.artifacts/release/candidate.receipt.json",
      VALIDATION_PACKAGE_SOURCE_IDENTITY: "${{ github.workspace }}/.artifacts/release/candidate-identity.json",
    });
  });

  it("never treats receipt or download caches as publication authority", async () => {
    const sources = await Promise.all([".github/workflows/ci.yml", ".github/workflows/full-regression.yml", ".github/workflows/release.yml"].map(path => readFile(path, "utf8")));
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
