import crossSpawn from "cross-spawn";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { recordBuildReceipt, verifyBuildReceipt, verifyPackageReceipt } from "./validation-receipt.mjs";

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const npxExecutable = process.platform === "win32" ? "npx.cmd" : "npx";

export async function loadValidationSuites(repository = process.cwd()) {
  const suites = JSON.parse(await readFile(resolve(repository, "config", "validation-suites.json"), "utf8"));
  if (suites.schema !== "a1-validation-suites-v1") throw new Error("unsupported validation suite schema");
  await validateValidationSuites(suites, repository);
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
  const allResourceSensitiveTests = suites.scopes["fast-resource-sensitive"].tests;
  const resourceSensitiveTests = atomic.includes("fast-resource-sensitive") ? [...allResourceSensitiveTests] : [];
  // Invariant: the sensitive owner gets its own invocation, never the generic explicit-file timeout.
  const explicitTests = definitions.filter(({ name }) => name !== "fast-resource-sensitive")
    .flatMap(({ name, definition }) => (definition.tests ?? []).map(test => ({ test, owner: name })));
  const duplicateTests = explicitTests.filter((entry, index) => explicitTests.findIndex(candidate => candidate.test === entry.test) !== index);
  if (!full && duplicateTests.length > 0) throw new Error(`tests have duplicate selected owners: ${duplicateTests.map(entry => entry.test).join(", ")}`);

  const packageSmokeTests = new Set(suites.scopes["package-smoke"]?.tests ?? []);
  const packageContractTests = new Set(suites.scopes["package-contracts"]?.tests ?? []);
  const packageStartupTests = new Set(suites.scopes["package-startup"]?.tests ?? []);
  const performanceTests = new Set(suites.scopes["update-performance"]?.tests ?? []);
  const isolatedTests = new Set(Object.values(suites.scopes)
    .filter(definition => definition.kind === "vitest-isolated")
    .flatMap(definition => definition.tests ?? []));
  const packageTests = new Set([...packageSmokeTests, ...packageContractTests, ...packageStartupTests]);
  const independentlyTimedTests = new Set([...performanceTests, ...isolatedTests]);
  const regularExplicitTests = explicitTests.filter(entry => !packageTests.has(entry.test) && !independentlyTimedTests.has(entry.test));
  const selectedTestPaths = new Set(explicitTests.map(entry => entry.test));
  const requestedPerformance = [...performanceTests].filter(path => selectedTestPaths.has(path));
  const requestedIsolated = [...isolatedTests].filter(path => selectedTestPaths.has(path));
  const requestedPackageSmoke = [...packageSmokeTests].filter(path => selectedTestPaths.has(path));
  const requestedPackageContracts = [...packageContractTests].filter(path => selectedTestPaths.has(path));
  const requestedPackageStartup = [...packageStartupTests].filter(path => selectedTestPaths.has(path));
  // Concurrency: each sensitive file gets a fresh serial Vitest process so prior Git, SQLite,
  // editor, and child-process workloads cannot consume another file's fixed five-second budget.
  const resourceSensitiveInvocations = resourceSensitiveTests.map((test, index) => ({
    id: `vitest-fast-resource-sensitive-${index + 1}`,
    arguments: ["vitest", "run", test, "--no-file-parallelism"],
    evidence: {
      executionClass: "resource-sensitive",
      testFiles: [test],
      fileParallelism: false,
      timeoutMs: 5_000,
      timeoutSource: "vitest-default",
      retries: 0,
      perFileTiming: "vitest-default-reporter",
    },
  }));
  const regularInvocations = [
    ...(fast ? [{ id: "vitest-fast", arguments: ["vitest", "run", fast.definition.includeRoot, ...[...fast.definition.exclude, ...allResourceSensitiveTests].flatMap(path => ["--exclude", path])] }] : []),
    ...resourceSensitiveInvocations,
    ...(regularExplicitTests.length > 0 ? [{ id: "vitest-explicit", arguments: ["vitest", "run", ...regularExplicitTests.map(entry => entry.test), "--testTimeout=30000"] }] : []),
    ...(requestedPerformance.length > 0 ? [{ id: "vitest-isolated-timing", arguments: ["vitest", "run", ...requestedPerformance, "--no-file-parallelism", "--testTimeout=120000"] }] : []),
    ...requestedPackageSmoke.map((path, index) => ({ id: `vitest-package-smoke-${index + 1}`, arguments: ["vitest", "run", path, "--no-file-parallelism", "--testTimeout=120000"] })),
    ...(requestedIsolated.length > 0 ? [{ id: "vitest-isolated-suites", arguments: ["vitest", "run", ...requestedIsolated, "--no-file-parallelism", "--testTimeout=600000"] }] : []),
    ...(requestedPackageContracts.length > 0 ? [{ id: "vitest-package-contracts", arguments: ["vitest", "run", ...requestedPackageContracts, "--no-file-parallelism", "--testTimeout=600000"] }] : []),
    ...(requestedPackageStartup.length > 0 ? [{ id: "vitest-package-startup", arguments: ["vitest", "run", ...requestedPackageStartup, "--no-file-parallelism", "--testTimeout=600000"] }] : []),
  ];
  const vitest = full
    ? {
        mode: "full-deduplicated",
        invocations: [
          { id: "vitest-full-without-isolated", arguments: ["vitest", "run", ...[...packageTests, ...independentlyTimedTests, ...resourceSensitiveTests].flatMap(path => ["--exclude", path]), "--testTimeout=30000"] },
          ...resourceSensitiveInvocations,
          { id: "vitest-isolated-timing", arguments: ["vitest", "run", ...performanceTests, "--no-file-parallelism", "--testTimeout=120000"] },
          ...[...packageSmokeTests].map((path, index) => ({ id: `vitest-package-smoke-${index + 1}`, arguments: ["vitest", "run", path, "--no-file-parallelism", "--testTimeout=120000"] })),
          { id: "vitest-isolated-suites", arguments: ["vitest", "run", ...isolatedTests, "--no-file-parallelism", "--testTimeout=600000"] },
          { id: "vitest-package-contracts", arguments: ["vitest", "run", ...packageContractTests, "--no-file-parallelism", "--testTimeout=600000"] },
          { id: "vitest-package-startup", arguments: ["vitest", "run", ...packageStartupTests, "--no-file-parallelism", "--testTimeout=600000"] },
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
  const executeCommand = options.executeCommand ?? runCommand;
  const repository = resolve(options.repository ?? process.cwd());
  const verifyBuild = options.verifyBuildReceipt ?? verifyBuildReceipt;
  const verifyPackage = options.verifyPackageReceipt ?? verifyPackageReceipt;
  const recordBuild = options.recordBuildReceipt ?? recordBuildReceipt;
  const buildReceiptPath = resolve(environment.VALIDATION_BUILD_RECEIPT ?? resolve(repository, ".artifacts", "validation", "receipts", "build.json"));
  const packageReceiptPath = path => resolve(environment.VALIDATION_PACKAGE_RECEIPT ?? path.replace(/\.tgz$/u, ".receipt.json"));

  for (const command of plan.commands) {
    let rejectedReuse = false;
    if (command.id === "candidate-build" && environment.VALIDATION_BUILD_READY === "1") {
      try {
        await verifyBuild(buildReceiptPath, { repository });
        environment.VALIDATION_BUILD_RECEIPT = buildReceiptPath;
        outcomes.push({ id: command.id, command: `${command.executable} ${command.arguments.join(" ")}`, exitCode: 0, durationMs: 0, skipped: "verified-existing-build" });
        continue;
      } catch { rejectedReuse = true; }
    }
    if (command.id === "candidate-pack" && environment.VALIDATION_CANDIDATE_TARBALL) {
      try {
        const candidate = resolve(environment.VALIDATION_CANDIDATE_TARBALL);
        const receipt = packageReceiptPath(candidate);
        await verifyPackage(receipt, candidate, { repository, buildReceipt: environment.VALIDATION_BUILD_RECEIPT, sourceIdentity: environment.VALIDATION_PACKAGE_SOURCE_IDENTITY });
        environment.VALIDATION_PACKAGE_RECEIPT = receipt;
        outcomes.push({ id: command.id, command: `${command.executable} ${command.arguments.join(" ")}`, exitCode: 0, durationMs: 0, skipped: "verified-exact-package" });
        continue;
      } catch { rejectedReuse = true; }
    }
    if (command.id === "code-documentation-full" && environment.VALIDATION_DOCUMENTATION_FULL_READY === "1") {
      outcomes.push({ id: command.id, command: `${command.executable} ${command.arguments.join(" ")}`, exitCode: 0, durationMs: 0, skipped: "existing-full-documentation-review" });
      continue;
    }
    const executed = await executeCommand(command, environment, options.stdio ?? "inherit");
    const outcome = rejectedReuse ? { ...executed, preparation: "receipt-missing-or-incompatible" } : executed;
    outcomes.push(outcome);
    if (outcome.exitCode !== 0) return finish(false);
    if (command.id === "candidate-build") {
      await recordBuild({ repository, output: buildReceiptPath });
      environment.VALIDATION_BUILD_READY = "1";
      environment.VALIDATION_BUILD_RECEIPT = buildReceiptPath;
    }
    if (command.id === "candidate-pack") {
      environment.VALIDATION_CANDIDATE_TARBALL = plan.candidateTarball;
      environment.VALIDATION_PACKAGE_RECEIPT = packageReceiptPath(plan.candidateTarball);
    }
  }

  if (plan.vitest) {
    for (const invocation of plan.vitest.invocations) {
      const executed = await executeCommand({ id: invocation.id, executable: "npx", arguments: invocation.arguments }, environment, options.stdio ?? "inherit");
      const outcome = invocation.evidence ? { ...executed, evidence: invocation.evidence } : executed;
      outcomes.push(outcome);
      if (outcome.exitCode !== 0) return finish(false);
    }
  }

  return finish(true);

  function finish(passed) {
    return { schema: "a1-validation-outcomes-v1", passed, startedAt, completedAt: Date.now(), outcomes };
  }
}

async function validateValidationSuites(suites, repository) {
  if (Object.keys(suites.scopes ?? {}).some(name => Object.hasOwn(suites.tiers ?? {}, name))) {
    throw new Error("validation scopes must not be shadowed by tiers");
  }
  for (const [name, definition] of Object.entries({ ...suites.tiers, ...suites.scopes })) {
    if ((definition.kind === "vitest-remainder" && name !== "fast-remainder")
      || (definition.kind === "vitest-resource-sensitive" && name !== "fast-resource-sensitive")) {
      throw new Error("fast partition kinds require their authoritative scope names");
    }
  }
  const composition = suites.tiers?.fast;
  const fast = suites.scopes?.["fast-remainder"];
  const sensitive = suites.scopes?.["fast-resource-sensitive"];
  if (composition?.kind !== "composition"
    || JSON.stringify(composition.includes) !== JSON.stringify(["fast-remainder", "fast-resource-sensitive"])) {
    throw new Error("fast validation must compose both atomic partitions exactly once");
  }
  if (fast?.kind !== "vitest-remainder" || sensitive?.kind !== "vitest-resource-sensitive") {
    throw new Error("fast validation requires remainder and resource-sensitive atomic scopes");
  }
  for (const [definition, fields] of [
    [composition, ["kind", "includes"]],
    [fast, ["kind", "includeRoot", "exclude"]],
    [sensitive, ["kind", "requiresBuild", "tests"]],
  ]) {
    const unsupportedFields = Object.keys(definition).filter(field => !fields.includes(field));
    if (unsupportedFields.length > 0) throw new Error(`unsupported fast validation fields: ${unsupportedFields.join(", ")}`);
  }
  if (fast.includeRoot !== "test" || !Array.isArray(fast.exclude) || fast.exclude.some(test => typeof test !== "string")) {
    throw new Error("fast remainder must retain the complete test root and explicit exclusions");
  }
  if (sensitive.requiresBuild !== true) throw new Error("resource-sensitive validation must authenticate emitted build prerequisites");
  if (!Array.isArray(sensitive.tests) || sensitive.tests.length === 0) {
    throw new Error("fast validation requires resource-sensitive tests");
  }
  if (sensitive.tests.some(test => typeof test !== "string")) throw new Error("resource-sensitive test paths must be strings");
  const duplicateResourceTests = sensitive.tests.filter((test, index) => sensitive.tests.indexOf(test) !== index);
  if (duplicateResourceTests.length > 0) throw new Error(`duplicate resource-sensitive tests: ${[...new Set(duplicateResourceTests)].join(", ")}`);

  const excluded = new Set(fast.exclude ?? []);
  const explicitOwners = new Map();
  for (const [scope, definition] of Object.entries(suites.scopes ?? {})) {
    if (scope === "fast-resource-sensitive") continue;
    for (const test of definition.tests ?? []) {
      const owners = explicitOwners.get(test) ?? [];
      owners.push(scope);
      explicitOwners.set(test, owners);
    }
  }
  for (const test of sensitive.tests) {
    if (test.includes("\\") || !test.startsWith(`${fast.includeRoot}/`) || !test.endsWith(".test.ts")) {
      throw new Error(`invalid resource-sensitive test path: ${test}`);
    }
    if (excluded.has(test)) throw new Error(`resource-sensitive test overlaps fast exclusion: ${test}`);
    const incompatibleOwners = (explicitOwners.get(test) ?? []).filter(owner => !["image-compatibility", "history-compatibility", "unix-containment"].includes(owner));
    if (incompatibleOwners.length > 0) throw new Error(`resource-sensitive test overlaps explicit scope ${incompatibleOwners.join(", ")}: ${test}`);
    try {
      if (!(await stat(resolve(repository, test))).isFile()) throw new Error("not a file");
    } catch {
      throw new Error(`resource-sensitive test does not exist: ${test}`);
    }
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
