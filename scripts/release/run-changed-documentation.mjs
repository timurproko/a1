import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { selectValidationImpact } from "./validation-impact.mjs";

const repository = process.cwd();
const artifactDirectory = resolve(repository, ".artifacts", "validation");
const selectionPath = resolve(artifactDirectory, "local-impact.json");
const resultPath = resolve(artifactDirectory, "local-code-documentation.json");
await mkdir(artifactDirectory, { recursive: true });
const selection = await selectValidationImpact({ repository, head: "HEAD", includeWorktree: true });
await writeFile(selectionPath, `${JSON.stringify(selection, null, 2)}\n`);
const code = await new Promise((resolvePromise, rejectPromise) => {
  const child = spawn(process.execPath, [
    "scripts/governance/check-code-documentation.mjs",
    "--mode", "changed",
    "--selection", ".artifacts/validation/local-impact.json",
    "--result", ".artifacts/validation/local-code-documentation.json",
  ], { cwd: repository, stdio: "inherit", env: process.env, windowsHide: true });
  child.once("error", rejectPromise);
  child.once("exit", (exitCode, signal) => signal ? rejectPromise(new Error(`changed documentation terminated by ${signal}`)) : resolvePromise(exitCode ?? 1));
});
process.exitCode = code;
