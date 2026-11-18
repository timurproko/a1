import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, it } from "vitest";

it("verifies exact protected integration and independently authenticated native-arm provenance", async () => {
  try {
    const result = await promisify(execFile)(process.execPath, ["--test", "test/repository-governance/delivery-integration.node.mjs", "test/repository-governance/delivery-scope.node.mjs"],
      { timeout: 60_000, maxBuffer: 2 * 1024 * 1024 });
    expect(result.stdout).toContain("fail 0");
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    throw new Error([failure.message, failure.stdout, failure.stderr].filter(Boolean).join("\n"), { cause: error });
  }
}, 65_000);
