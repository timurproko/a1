import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const execute = promisify(execFile);

// Rationale: use the same dependency-free fixtures for local diagnosis and the Windows fast CI gate.
it("verifies local cleanup identity, archive authority, ownership, recovery, and bounded watch behavior", async () => {
  let result;
  try { result = await execute(process.execPath, ["--test",
    "test/repository-governance/local-cleanup.node.mjs",
    "test/repository-governance/local-cleanup-evidence.node.mjs",
    "test/repository-governance/local-cleanup-watch.node.mjs",
  ], { cwd: process.cwd(), timeout: 110000, maxBuffer: 4 * 1024 * 1024 }); }
  catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    throw new Error([failure.message, failure.stdout, failure.stderr].filter(Boolean).join("\n"), { cause: error });
  }
  expect(result.stdout).toContain("fail 0");
}, 120000);
