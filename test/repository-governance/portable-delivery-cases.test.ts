import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { rm } from "node:fs/promises";
import { ownedFixtureRoot, fixtureEnvironment } from "../support/owned-fixture-root.js";
import { expect, it } from "vitest";

it("executes all 50 frozen portable delivery cases with complete observed assertions", async () => {
  const directory = await ownedFixtureRoot("shared-cases-worker-");
  try {
    const result = await promisify(execFile)(process.execPath, ["--import", "tsx", "--test", "test/repository-governance/portable-delivery-cases.node.mjs"],
      { timeout: 240_000, maxBuffer: 2 * 1024 * 1024, env: fixtureEnvironment(directory) });
    expect(result.stdout).toContain('"cases":50,"hazards":11,"skipped":0,"passed":true');
    expect(result.stdout).toContain("fail 0");
    await rm(directory, { recursive: true, force: true, maxRetries: 5 });
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    throw new Error([`Fixture evidence retained at ${directory}`, failure.message, failure.stdout, failure.stderr].filter(Boolean).join("\n"), { cause: error });
  }
}, 250_000);
