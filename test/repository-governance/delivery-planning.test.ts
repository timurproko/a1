import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, it } from "vitest";

it("checks portable planning, handoff publication and frozen installation boundaries", async () => {
  try {
    const result = await promisify(execFile)(process.execPath, ["--test", "test/repository-governance/delivery-planning.node.mjs", "test/repository-governance/delivery-publication.node.mjs"],
      { timeout: 30_000, maxBuffer: 1024 * 1024 });
    expect(result.stdout).toContain("fail 0");
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    throw new Error([failure.message, failure.stdout, failure.stderr].filter(Boolean).join("\n"), { cause: error });
  }
}, 35_000);
