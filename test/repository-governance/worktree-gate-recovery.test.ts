import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, it } from "vitest";
import { verifyBuildReceipt } from "../../scripts/release/validation-receipt.mjs";

const exec = promisify(execFile), root = fileURLToPath(new URL("../../", import.meta.url));
it("restores packaged coordination after recoverable crashes without reclaiming live execution", async () => {
  let receipt = process.env.VALIDATION_BUILD_RECEIPT;
  if (receipt) {
    try { await verifyBuildReceipt(receipt, { repository: root }); }
    catch {
      console.info("Regression build hint does not match current inputs/artifacts; selecting a fresh build, not receipt reuse");
      receipt = undefined;
    }
  }
  const args = ["scripts/development/verify-worktree-package.mjs", "--allow-dirty", "--regression-installed-npm"];
  if (receipt) args.push("--verified-build-receipt", receipt);
  const { stdout } = await exec(process.execPath, args, {
    cwd: root, timeout: 240_000, maxBuffer: 8 * 1024 * 1024,
  });
  const result = JSON.parse(stdout.trim().split(/\r?\n/u).at(-1)!);
  expect(result.consumerPassed).toBe(true);
  expect(result.packingPolicy).toBe("regression-installed-npm11");
  expect(result.package.sha256).toMatch(/^[a-f0-9]{64}$/u);
  const report = JSON.parse(await readFile(resolve(root, result.report), "utf8"));
  expect(report.build.mode).toBe(receipt ? "verified-existing-build" : "fresh-build");
  if (receipt) expect(report.build.receiptId).toMatch(/^[a-f0-9]{64}$/u);
}, 250_000);
