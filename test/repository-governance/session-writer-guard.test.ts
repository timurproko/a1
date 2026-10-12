import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execute = promisify(execFile);
const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("session writer guard governance", () => {
  it("rejects a production writer outside the guarded owners", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "session-writer-guard-"));
    roots.push(root);
    await Promise.all([
      mkdir(resolve(root, "src", "feature"), { recursive: true }),
      mkdir(resolve(root, "bin"), { recursive: true }),
    ]);
    await writeFile(
      resolve(root, "src", "feature", "unguarded.ts"),
      "SessionManager.open(path);\n",
    );

    const script = resolve("scripts/governance/check-session-writer-guard.mjs");
    let failure: { readonly code: number; readonly stderr: string } | undefined;
    try {
      await execute(process.execPath, [script, "--root", root]);
    } catch (error) {
      failure = error as { readonly code: number; readonly stderr: string };
    }
    expect(failure?.code).toBe(1);
    expect(failure?.stderr).toContain("constructs a Pi session writer outside a guarded owner");
  });
});
