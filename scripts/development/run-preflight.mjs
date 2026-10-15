#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { collectWorktreeChanges, selectValidationImpact } from "../release/validation-impact.mjs";

// Rationale: pull-request validation's fast governance gates, run locally before a push. Every
// step invokes the script and arguments the CI job runs, against a local impact selection of the
// branch and worktree, so a failure reports the rule identifier and path CI would report.

export const PREFLIGHT_SELECTION = ".artifacts/validation/local-impact.json";
export const PREFLIGHT_BUILD_RECEIPT = ".artifacts/validation/receipts/build.json";
/** The exact pinned OpenSpec validator the Documentation governance validation job runs. */
export const PREFLIGHT_OPENSPEC = "@fission-ai/openspec@1.8.0";

/** The ordered preflight steps a local impact selection requires; nothing here builds the native host. */
export function preflightSteps(selection) {
  const ordinary = !selection.docsOnly && !selection.versionOnly;
  const steps = [];
  if (ordinary) {
    // Invariant: the core job type-checks `bin/` against `dist/` after `npm ci` ran `prepare`, the
    // ordinary build, and records the receipt that lets its test tier reuse that build.
    steps.push({ id: "build", executable: "npm", arguments: ["run", "build"] });
    steps.push({ id: "build-receipt", executable: "node", arguments: ["scripts/release/record-validation-prerequisite.mjs", "build"] });
    steps.push({ id: "typecheck", executable: "npm", arguments: ["run", "typecheck"] });
    steps.push({ id: "architecture", executable: "npm", arguments: ["run", "check:architecture"] });
  }
  if (ordinary && selection.documentation.required) {
    steps.push({ id: "code-documentation-changed", executable: "node", arguments: ["scripts/governance/check-code-documentation.mjs", "--mode", "changed", "--selection", PREFLIGHT_SELECTION, "--result", ".artifacts/validation/local-code-documentation.json"] });
  }
  steps.push({ id: "release-documentation", executable: "node", arguments: ["scripts/release/check-release-documentation.mjs", "--selection", PREFLIGHT_SELECTION] });
  if (selection.naming.required) {
    steps.push({ id: "naming-changed", executable: "node", arguments: ["scripts/governance/product-identifier-policy.mjs", "--check", "--selection", PREFLIGHT_SELECTION, "--result", ".artifacts/validation/local-naming.json"] });
  }
  steps.push({ id: "docs-governance", executable: "node", arguments: ["scripts/governance/check-docs-governance.mjs"] });
  if (selection.openspecTouched) {
    steps.push({ id: "openspec-strict", executable: "npx", arguments: ["--yes", PREFLIGHT_OPENSPEC, "validate", "--all", "--strict", "--no-interactive"] });
  }
  steps.push({ id: "delivery-guidance", executable: "npx", arguments: ["vitest", "run", "test/repository-governance/change-delivery-guidance.test.ts"] });
  if (ordinary) {
    // Invariant: the same scopes and selected tests the "PR core and affected unit owners" job runs.
    steps.push({ id: "changed-tests", executable: "node", arguments: ["scripts/release/run-validation-tier.mjs", "pr-core-tests", "pr-selected-tests"], environment: {
      VALIDATION_TESTS_JSON: JSON.stringify(selection.prCore.tests),
      VALIDATION_BUILD_READY: "1",
      VALIDATION_BUILD_RECEIPT: PREFLIGHT_BUILD_RECEIPT,
    } });
  }
  return steps;
}

async function runStep(step) {
  return await new Promise((resolvePromise, rejectPromise) => {
    // Platform: npm and npx are command shims on Windows and start only through a shell.
    const child = spawn(step.executable, step.arguments, { stdio: "inherit", env: { ...process.env, ...step.environment }, shell: process.platform === "win32", windowsHide: true });
    child.once("error", rejectPromise);
    child.once("exit", (exitCode, signal) => resolvePromise(signal ? 1 : exitCode ?? 1));
  });
}

async function main() {
  // Invariant: a push carries committed bytes, and changed-file naming accepts only the committed
  // merge-base diff, so the selection excludes the worktree; uncommitted paths are reported instead.
  const selection = await selectValidationImpact({ repository: process.cwd(), head: "HEAD", includeWorktree: false });
  const uncommitted = await collectWorktreeChanges(process.cwd());
  await mkdir(resolve(".artifacts/validation"), { recursive: true });
  await writeFile(resolve(PREFLIGHT_SELECTION), `${JSON.stringify(selection, null, 2)}\n`);
  const steps = preflightSteps(selection);
  process.stdout.write(`preflight: base ${selection.base}, ${selection.changes.length} committed changed paths, ${steps.length} steps\n`);
  if (uncommitted.length > 0) process.stdout.write(`preflight: ${uncommitted.length} uncommitted paths are outside the changed-file selection; commit them to check what you push\n`);
  for (const step of steps) {
    process.stdout.write(`preflight: ${step.id}\n`);
    const exitCode = await runStep(step);
    if (exitCode !== 0) {
      process.stderr.write(`preflight: ${step.id} failed (exit ${exitCode}); validation would fail the same gate\n`);
      process.exitCode = exitCode;
      return;
    }
  }
  process.stdout.write("preflight: passed; validation remains the authority\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
