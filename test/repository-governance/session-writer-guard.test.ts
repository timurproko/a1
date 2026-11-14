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
  it("requires the optional selector owner to retain its writer-lock dependency", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "session-selector-guard-")); roots.push(root);
    const directory = resolve(root, "src/integrations/pi/engine");
    await mkdir(directory, { recursive: true }); await mkdir(resolve(root, "bin"));
    const file = resolve(directory, "session-launch.ts"), script = resolve("scripts/governance/check-session-writer-guard.mjs");
    await writeFile(file, "SessionManager.create(cwd);\n");
    await expect(execute(process.execPath, [script, "--root", root])).rejects.toMatchObject({ stderr: expect.stringContaining("guarded owner does not import the session-writer lock") });
    await writeFile(file, 'import { acquireSessionWriter } from "../../../foundation/session-writer-lock/index.js";\nSessionManager.create(cwd);\n');
    expect((await execute(process.execPath, [script, "--root", root])).stdout).toContain("Session writer guard OK");
  });
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
