import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const exec = promisify(execFile), root = fileURLToPath(new URL("../../", import.meta.url));
it("restores packaged coordination after recoverable crashes without reclaiming live execution", async () => {
  const { stdout } = await exec(process.execPath, ["scripts/development/verify-worktree-package.mjs", "--allow-dirty"], {
    cwd: root, timeout: 240_000, maxBuffer: 8 * 1024 * 1024,
  });
  const result = JSON.parse(stdout.trim().split(/\r?\n/u).at(-1)!);
  expect(result.consumerPassed).toBe(true);
  expect(result.package.sha256).toMatch(/^[a-f0-9]{64}$/u);
}, 250_000);
