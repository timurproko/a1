import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, it } from "vitest";

it("checks exact published local removal against independent preservation hazards and interrupted recovery", async () => {
  try {
    const result = await promisify(execFile)(process.execPath, ["--test", "test/repository-governance/delivery-local-removal.node.mjs"],
      { timeout: 240_000, maxBuffer: 2 * 1024 * 1024 });
    expect(result.stdout).toContain("fail 0");
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    throw new Error([failure.message, failure.stdout, failure.stderr].filter(Boolean).join("\n"), { cause: error });
  }
}, 250_000);
