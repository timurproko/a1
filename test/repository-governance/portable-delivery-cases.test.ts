import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, it } from "vitest";

it("executes all 50 frozen portable delivery cases with complete observed assertions", async () => {
  try {
    const result = await promisify(execFile)(process.execPath, ["--import", "tsx", "--test", "test/repository-governance/portable-delivery-cases.node.mjs"],
      { timeout: 240_000, maxBuffer: 2 * 1024 * 1024 });
    expect(result.stdout).toContain('"cases":50,"hazards":11,"skipped":0,"passed":true');
    expect(result.stdout).toContain("fail 0");
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    throw new Error([failure.message, failure.stdout, failure.stderr].filter(Boolean).join("\n"), { cause: error });
  }
}, 250_000);
