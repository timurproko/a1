import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const script = "scripts/check-development-validation.mjs";

function run(overrides: Record<string, string | undefined> = {}) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    IMPACT_JOB_RESULT: "success",
    VALIDATION_JOB_RESULT: "success",
    SELECTED_VALIDATION_JSON: '["invariants","fast"]',
    ...overrides,
  };
  for (const [key, value] of Object.entries(env)) if (value === undefined) delete env[key];
  return spawnSync(process.execPath, [script], { encoding: "utf8", env });
}

describe("required development validation result", () => {
  it("accepts successful non-empty selected validation", () => {
    const result = run();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Development validation accepted");
  });

  it.each(["failure", "cancelled", "skipped"])("rejects an unsuccessful selected validation job: %s", resultName => {
    const result = run({ VALIDATION_JOB_RESULT: resultName });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`validation job result is ${resultName}`);
  });

  it("rejects selector failure", () => {
    const result = run({ IMPACT_JOB_RESULT: "failure" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("impact job result is failure");
  });

  it.each(["[]", "", "not-json"])("rejects an empty or malformed selection: %s", selected => {
    const result = run({ SELECTED_VALIDATION_JSON: selected });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/empty or invalid|missing or malformed/);
  });
});
