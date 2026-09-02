import crossSpawn from "cross-spawn";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const npxExecutable = process.platform === "win32" ? "npx.cmd" : "npx";

export async function loadValidationSuites(repository = process.cwd()) {
  const suites = JSON.parse(await readFile(resolve(repository, "config", "validation-suites.json"), "utf8"));
  if (suites.schema !== "a1-validation-suites-v1") throw new Error("unsupported validation suite schema");
  return suites;
}

export async function createTierPlan(requested, repository = process.cwd()) {
  const suites = await loadValidationSuites(repository);
  const atomic = [];
  const visiting = new Set();

  function expand(name) {
    const definition = suites.tiers[name] ?? suites.scopes[name];
    if (!definition) throw new Error(`unknown validation tier or scope: ${name}`);
    if (definition.kind !== "composition") {
      if (!atomic.includes(name)) atomic.push(name);
      return;
    }
    if (visiting.has(name)) throw new Error(`cyclic validation composition: ${name}`);
    visiting.add(name);
    for (const child of definition.includes ?? []) expand(child);
    visiting.delete(name);
  }

  for (const name of requested) expand(name);
  const definitions = atomic.map(name => ({ name, definition: suites.tiers[name] ?? suites.scopes[name] }));
  const full = requested.includes("full-release");
  const requiresBuild = definitions.some(({ definition }) => definition.requiresBuild === true);
  const consumesPackage = definitions.some(({ definition }) => definition.consumesPackage === true);
  const structuralEvidence = Object.fromEntries(definitions
    .filter(({ definition }) => definition.evidence !== undefined)
    .map(({ name, definition }) => [name, definition.evidence]));
  const candidateTarball = resolve(repository, ".artifacts", "validation", "package", "candidate.tgz");
  const commands = [];
  const commandIds = new Map();

  function addCommand(command, owner) {
    const normalized = normalizeCommand(command);
    const existing = commandIds.get(normalized.id);
    if (existing && JSON.stringify(existing.command) !== JSON.stringify(normalized)) throw new Error(`conflicting validation command id: ${normalized.id}`);
    if (!existing) {
      commandIds.set(normalized.id, { command: normalized, owners: [owner] });
      commands.push({ ...normalized, owners: [owner] });
    } else {
      existing.owners.push(owner);
    }
  }

  if (requiresBuild) addCommand({ id: "candidate-build", executable: "npm", arguments: ["run", "build", "--silent"] }, "build-prerequisite");
  if (consumesPackage) addCommand({ id: "candidate-pack", executable: "node", arguments: ["scripts/release/prepare-validation-package.mjs"] }, "package-prerequisite");
  for (const { name, definition } of definitions) {
    for (const command of definition.commands ?? []) addCommand(command, name);
  }

  const fast = definitions.find(({ definition }) => definition.kind === "vitest-remainder");
  const explicitTests = definitions.flatMap(({ name, definition }) => (definition.tests ?? []).map(test => ({ test, owner: name })));
  const duplicateTests = explicitTests.filter((entry, index) => explicitTests.findIndex(candidate => candidate.test === entry.test) !== index);
  if (duplicateTests.length > 0) throw new Error(`tests have duplicate selected owners: ${duplicateTests.map(entry => entry.test).join(", ")}`);

  const packageSmokeTests = new Set(suites.scopes["package-smoke"]?.tests ?? []);
  const packageInstallTests = new Set(suites.scopes["package-install"]?.tests ?? []);
  const performanceTests = new Set(suites.scopes["update-performance"]?.tests ?? []);
  const isolatedTests = new Set(Object.values(suites.scopes)
    .filter(definition => definition.kind === "vitest-isolated")
    .flatMap(definition => definition.tests ?? []));
  const packageTests = new Set([...packageSmokeTests, ...packageInstallTests]);
  const independentlyTimedTests = new Set([...performanceTests, ...isolatedTests]);
  const regularExplicitTests = explicitTests.filter(entry => !packageTests.has(entry.test) && !independentlyTimedTests.has(entry.test));
  const selectedTestPaths = new Set(explicitTests.map(entry => entry.test));
  const requestedPerformance = [...performanceTests].filter(path => selectedTestPaths.has(path));
  const requestedIsolated = [...isolatedTests].filter(path => selectedTestPaths.has(path));
  const requestedPackageSmoke = [...packageSmokeTests].filter(path => selectedTestPaths.has(path));
  const requestedPackageInstall = [...packageInstallTests].filter(path => selectedTestPaths.has(path));
  const regularInvocations = [
    ...(fast ? [{ id: "vitest-fast", arguments: ["vitest", "run", fast.definition.includeRoot, ...fast.definition.exclude.flatMap(path => ["--exclude", path])] }] : []),
    ...(regularExplicitTests.length > 0 ? [{ id: "vitest-explicit", arguments: ["vitest", "run", ...regularExplicitTests.map(entry => entry.test), "--testTimeout=30000"] }] : []),
    ...(requestedPerformance.length + requestedPackageSmoke.length > 0 ? [{ id: "vitest-isolated-timing", arguments: ["vitest", "run", ...requestedPerformance, ...requestedPackageSmoke, "--no-file-parallelism", "--testTimeout=120000"] }] : []),
    ...(requestedIsolated.length > 0 ? [{ id: "vitest-isolated-suites", arguments: ["vitest", "run", ...requestedIsolated, "--no-file-parallelism", "--testTimeout=600000"] }] : []),
    ...(requestedPackageInstall.length > 0 ? [{ id: "vitest-package-install", arguments: ["vitest", "run", ...requestedPackageInstall, "--no-file-parallelism", "--testTimeout=600000"] }] : []),
  ];
  const vitest = full
    ? {
        mode: "full-deduplicated",
        invocations: [
          { id: "vitest-full-without-isolated", arguments: ["vitest", "run", ...[...packageTests, ...independentlyTimedTests].flatMap(path => ["--exclude", path]), "--testTimeout=30000"] },
          { id: "vitest-isolated-timing", arguments: ["vitest", "run", ...performanceTests, ...packageSmokeTests, "--no-file-parallelism", "--testTimeout=120000"] },
          { id: "vitest-isolated-suites", arguments: ["vitest", "run", ...isolatedTests, "--no-file-parallelism", "--testTimeout=600000"] },
          { id: "vitest-package-install", arguments: ["vitest", "run", ...packageInstallTests, "--no-file-parallelism", "--testTimeout=600000"] },
        ],
      }
    : regularInvocations.length > 0
      ? { mode: fast ? "fast-and-explicit" : "explicit", invocations: regularInvocations }
      : null;

  return {
    schema: "a1-validation-plan-v1",
    requested,
    selected: atomic,
    requiresBuild,
    consumesPackage,
    candidateTarball,
    structuralEvidence,
    commands,
    vitest,
    releaseContracts: full ? suites.releaseContracts : undefined,
  };
}

export async function runTierPlan(plan, options = {}) {
  const startedAt = Date.now();
  const outcomes = [];
  const environment = { ...process.env, ...(options.env ?? {}) };

  for (const command of plan.commands) {
    if (command.id === "candidate-build" && environment.VALIDATION_BUILD_READY === "1") {
      outcomes.push({ id: command.id, command: `${command.executable} ${command.arguments.join(" ")}`, exitCode: 0, durationMs: 0, skipped: "existing-explicit-build" });
      continue;
    }
    if (command.id === "candidate-pack" && environment.VALIDATION_CANDIDATE_TARBALL) {
      outcomes.push({ id: command.id, command: `${command.executable} ${command.arguments.join(" ")}`, exitCode: 0, durationMs: 0, skipped: "existing-exact-package" });
      continue;
    }
    if (command.id === "code-documentation-full" && environment.VALIDATION_DOCUMENTATION_FULL_READY === "1") {
      outcomes.push({ id: command.id, command: `${command.executable} ${command.arguments.join(" ")}`, exitCode: 0, durationMs: 0, skipped: "existing-full-documentation-review" });
      continue;
    }
    const outcome = await runCommand(command, environment, options.stdio ?? "inherit");
    outcomes.push(outcome);
    if (outcome.exitCode !== 0) return finish(false);
    if (command.id === "candidate-build") environment.VALIDATION_BUILD_READY = "1";
    if (command.id === "candidate-pack") environment.VALIDATION_CANDIDATE_TARBALL = plan.candidateTarball;
  }

  if (plan.vitest) {
    for (const invocation of plan.vitest.invocations) {
      const outcome = await runCommand({ id: invocation.id, executable: "npx", arguments: invocation.arguments }, environment, options.stdio ?? "inherit");
      outcomes.push(outcome);
      if (outcome.exitCode !== 0) return finish(false);
    }
  }

  return finish(true);

  function finish(passed) {
    return { schema: "a1-validation-outcomes-v1", passed, startedAt, completedAt: Date.now(), outcomes };
  }
}

function normalizeCommand(command) {
  if (!command?.id || !command?.executable || !Array.isArray(command.arguments)) throw new Error("invalid validation command");
  return { id: command.id, executable: command.executable, arguments: command.arguments.map(String) };
}

function runCommand(command, environment, stdio) {
  const executable = command.executable === "npm" ? npmExecutable : command.executable === "npx" ? npxExecutable : command.executable;
  const startedAt = Date.now();
  return new Promise((resolvePromise, rejectPromise) => {
    const child = crossSpawn(executable, command.arguments, { stdio, env: environment, windowsHide: true });
    child.once("error", rejectPromise);
    child.once("exit", (exitCode, signal) => {
      if (signal) rejectPromise(new Error(`${command.id} terminated by ${signal}`));
      else resolvePromise({ id: command.id, command: `${command.executable} ${command.arguments.join(" ")}`, exitCode: exitCode ?? 1, durationMs: Date.now() - startedAt });
    });
  });
}
