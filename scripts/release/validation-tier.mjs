import crossSpawn from "cross-spawn";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { recordBuildReceipt, verifyBuildReceipt, verifyPackageReceipt } from "./validation-receipt.mjs";
import {
  cleanupExactPackagePreparation,
  exactPackagePreparationEnvironment,
  EXACT_PACKAGE_INSTALL_POLICY,
  EXACT_PACKAGE_PREPARATION_ENV,
  prepareExactPackageInstallation,
  verifyExactPackagePreparation,
} from "./exact-package-preparation.mjs";

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const npxExecutable = process.platform === "win32" ? "npx.cmd" : "npx";
const maximumPortableCommandCharacters = 6_000;
/** Hang bound for the resource-sensitive partition; the same explicit bound the other fast-tier invocations use. */
export const RESOURCE_SENSITIVE_TIMEOUT_MS = 30_000;
/** Bounds the complete ordinary partition below hosted-runner process and memory capacity. */
export const FULL_REGRESSION_MAX_WORKERS = 2;

export async function loadValidationSuites(repository = process.cwd()) {
  const suites = JSON.parse(await readFile(resolve(repository, "config", "validation-suites.json"), "utf8"));
  if (suites.schema !== "a1-validation-suites-v1") throw new Error("unsupported validation suite schema");
  await validateValidationSuites(suites, repository);
  return suites;
}

export async function createTierPlan(requested, repository = process.cwd(), options = {}) {
  const suites = await loadValidationSuites(repository);
  const additionalTests = options.additionalTests ?? [];
  if (!Array.isArray(additionalTests) || additionalTests.length > 2048 || new Set(additionalTests).size !== additionalTests.length
    || additionalTests.some(test => typeof test !== "string" || !test.startsWith("test/") || !test.endsWith(".test.ts") || test.includes("\\") || test.includes(".."))) {
    throw new Error("additional validation tests are invalid or unbounded");
  }
  for (const test of additionalTests) {
    try { if (!(await stat(resolve(repository, test))).isFile()) throw new Error("not a file"); }
    catch { throw new Error(`additional validation test does not exist: ${test}`); }
  }
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
    if (existing && JSON.stringify({ id: existing.id, executable: existing.executable, arguments: existing.arguments }) !== JSON.stringify(normalized)) {
      throw new Error(`conflicting validation command id: ${normalized.id}`);
    }
    if (!existing) {
      const planned = { ...normalized, owners: [owner] };
      commandIds.set(normalized.id, planned);
      commands.push(planned);
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
  const resourceSensitiveTests = [
    ...(atomic.includes("fast-resource-sensitive") ? allResourceSensitiveTests.map(test => ({ test, scope: "fast-resource-sensitive" })) : []),
    ...(atomic.includes("pr-selected-resource") ? additionalTests.map(test => ({ test, scope: "pr-selected-resource" })) : []),
  ];
  // Invariant: sensitive selections get fresh serial invocations, never the generic explicit-file timeout.
  const explicitTests = definitions.filter(({ name }) => !["fast-resource-sensitive", "pr-selected-resource"].includes(name))
    .flatMap(({ name, definition }) => (definition.tests ?? []).map(test => ({ test, owner: name })));
  if (atomic.includes("pr-selected-tests")) {
    const alreadySelected = new Set(explicitTests.map(entry => entry.test));
    for (const test of additionalTests) if (!alreadySelected.has(test)) explicitTests.push({ test, owner: "pr-selected-tests" });
  }
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
  const exactPackageConsumers = [
    ...(requestedPackageStartup.length > 0 ? ["package-startup"] : []),
    ...(requestedPackageContracts.length > 0 ? ["package-contracts"] : []),
  ];
  const exactPackagePreparation = exactPackageConsumers.length > 0 ? {
    id: "exact-package-preparation",
    count: 1,
    policy: EXACT_PACKAGE_INSTALL_POLICY,
    consumers: exactPackageConsumers,
  } : null;
  // Concurrency: the sensitive files share one serial Vitest process on an isolated runner, paying
  // one cold start instead of one per file. The explicit bound is a hang detector, not a performance
  // gate; per-test durations stay in the reporter evidence for the focused timing report.
  const resourceSensitiveInvocations = boundedVitestInvocations("vitest-fast-resource-sensitive", resourceSensitiveTests.map(entry => entry.test),
    ["--no-file-parallelism", `--testTimeout=${RESOURCE_SENSITIVE_TIMEOUT_MS}`]).map(invocation => ({
    ...invocation,
    scopes: [...new Set(resourceSensitiveTests.map(entry => entry.scope))],
    evidence: {
      executionClass: "resource-sensitive",
      testFiles: invocation.arguments.filter(argument => resourceSensitiveTests.some(entry => entry.test === argument)),
      fileParallelism: false,
      timeoutMs: RESOURCE_SENSITIVE_TIMEOUT_MS,
      timeoutSource: "explicit",
      retries: 0,
      perFileTiming: "vitest-default-reporter",
    },
  }));
  const explicitByScope = new Map();
  for (const entry of regularExplicitTests) {
    const tests = explicitByScope.get(entry.owner) ?? [];
    tests.push(entry.test);
    explicitByScope.set(entry.owner, tests);
  }
  const regularInvocations = [
    ...(fast ? [{ id: "vitest-fast", scopes: ["fast-remainder"], arguments: ["vitest", "run", fast.definition.includeRoot, ...[...fast.definition.exclude, ...allResourceSensitiveTests].flatMap(path => ["--exclude", path])] }] : []),
    ...resourceSensitiveInvocations,
    ...[...explicitByScope].flatMap(([scope, tests]) => boundedVitestInvocations(`vitest-explicit-${scope}`, tests, ["--testTimeout=30000"]).map(invocation => ({ ...invocation, scopes: [scope] }))),
    ...(requestedPerformance.length > 0 ? [{ id: "vitest-isolated-timing", scopes: ["update-performance"], arguments: ["vitest", "run", ...requestedPerformance, "--no-file-parallelism", "--testTimeout=120000"] }] : []),
    ...requestedPackageSmoke.map((path, index) => ({ id: `vitest-package-smoke-${index + 1}`, scopes: ["package-smoke"], arguments: ["vitest", "run", path, "--no-file-parallelism", "--testTimeout=120000"] })),
    ...(requestedIsolated.length > 0 ? [{ id: "vitest-isolated-suites", scopes: selectedScopesForTests(explicitTests, requestedIsolated), arguments: ["vitest", "run", ...requestedIsolated, "--no-file-parallelism", "--testTimeout=600000"] }] : []),
    ...(requestedPackageStartup.length > 0 ? [{ id: "vitest-package-startup", scopes: ["package-startup"], arguments: ["vitest", "run", ...requestedPackageStartup, "--no-file-parallelism", "--testTimeout=600000"] }] : []),
    ...(requestedPackageContracts.length > 0 ? [{ id: "vitest-package-contracts", scopes: ["package-contracts"], arguments: ["vitest", "run", ...requestedPackageContracts, "--no-file-parallelism", "--testTimeout=600000"] }] : []),
  ];
  const vitest = full
    ? {
        mode: "full-deduplicated",
        invocations: [
          {
            id: "vitest-full-without-isolated",
            scopes: atomic,
            arguments: [
              "vitest", "run",
              ...[...packageTests, ...independentlyTimedTests, ...resourceSensitiveTests.map(entry => entry.test)].flatMap(path => ["--exclude", path]),
              `--maxWorkers=${FULL_REGRESSION_MAX_WORKERS}`,
              "--reporter=default",
              "--reporter=./scripts/release/validation-progress-reporter.mjs",
              "--testTimeout=30000",
            ],
            evidence: {
              executionClass: "bounded-parallel",
              fileParallelism: true,
              maxWorkers: FULL_REGRESSION_MAX_WORKERS,
              timeoutMs: 30_000,
              timeoutSource: "explicit",
              retries: 0,
              perFileTiming: "vitest-default-and-start-reporter",
            },
          },
          ...resourceSensitiveInvocations,
          { id: "vitest-isolated-timing", scopes: ["update-performance"], arguments: ["vitest", "run", ...performanceTests, "--no-file-parallelism", "--testTimeout=120000"] },
          ...[...packageSmokeTests].map((path, index) => ({ id: `vitest-package-smoke-${index + 1}`, scopes: ["package-smoke"], arguments: ["vitest", "run", path, "--no-file-parallelism", "--testTimeout=120000"] })),
          { id: "vitest-isolated-suites", scopes: ["rendering-stability"], arguments: ["vitest", "run", ...isolatedTests, "--no-file-parallelism", "--testTimeout=600000"] },
          { id: "vitest-package-startup", scopes: ["package-startup"], arguments: ["vitest", "run", ...packageStartupTests, "--no-file-parallelism", "--testTimeout=600000"] },
          { id: "vitest-package-contracts", scopes: ["package-contracts"], arguments: ["vitest", "run", ...packageContractTests, "--no-file-parallelism", "--testTimeout=600000"] },
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
    exactPackagePreparation,
    commands,
    vitest,
    releaseContracts: full ? suites.releaseContracts : undefined,
  };
}

export async function runTierPlan(plan, options = {}) {
  const startedAt = Date.now();
  const outcomes = [];
  const environment = { ...process.env, ...(options.env ?? {}) };
  delete environment.VALIDATION_SELECTION_JSON;
  delete environment.VALIDATION_TESTS_JSON;
  delete environment.NODE_COMPILE_CACHE;
  for (const name of Object.values(EXACT_PACKAGE_PREPARATION_ENV)) delete environment[name];
  const executeCommand = options.executeCommand ?? runCommand;
  const repository = resolve(options.repository ?? process.cwd());
  const verifyBuild = options.verifyBuildReceipt ?? verifyBuildReceipt;
  const verifyPackage = options.verifyPackageReceipt ?? verifyPackageReceipt;
  const recordBuild = options.recordBuildReceipt ?? recordBuildReceipt;
  const prepareExactPackage = options.prepareExactPackageInstallation ?? prepareExactPackageInstallation;
  const preparationEnvironment = options.exactPackagePreparationEnvironment ?? exactPackagePreparationEnvironment;
  const verifyExactPackage = options.verifyExactPackagePreparation ?? verifyExactPackagePreparation;
  const cleanupExactPackage = options.cleanupExactPackagePreparation ?? cleanupExactPackagePreparation;
  const readExactPackageHandoff = options.readExactPackageHandoff
    ?? (async path => JSON.parse(await readFile(resolve(path), "utf8")));
  const exactPackagePlan = plan.exactPackagePreparation ? assertExactPackagePreparationPlan(plan.exactPackagePreparation, plan.vitest) : null;
  const buildReceiptPath = resolve(environment.VALIDATION_BUILD_RECEIPT ?? resolve(repository, ".artifacts", "validation", "receipts", "build.json"));
  const packageReceiptPath = path => resolve(environment.VALIDATION_PACKAGE_RECEIPT ?? path.replace(/\.tgz$/u, ".receipt.json"));
  let passed = true;
  let preparation = null;
  let preparationOutcome = null;
  let preparationHandoff = null;
  let primaryError = null;

  try {
    for (const command of plan.commands) {
      let rejectedReuse = false;
      if (command.id === "candidate-build" && environment.VALIDATION_BUILD_READY === "1") {
        try {
          await verifyBuild(buildReceiptPath, { repository });
          environment.VALIDATION_BUILD_RECEIPT = buildReceiptPath;
          outcomes.push({ id: command.id, command: `${command.executable} ${command.arguments.join(" ")}`, exitCode: 0, durationMs: 0, scopes: command.owners, skipped: "verified-existing-build" });
          continue;
        } catch { rejectedReuse = true; }
      }
      if (command.id === "candidate-pack" && environment.VALIDATION_CANDIDATE_TARBALL) {
        try {
          const candidate = resolve(environment.VALIDATION_CANDIDATE_TARBALL);
          const receipt = packageReceiptPath(candidate);
          await verifyPackage(receipt, candidate, { repository, buildReceipt: environment.VALIDATION_BUILD_RECEIPT, sourceIdentity: environment.VALIDATION_PACKAGE_SOURCE_IDENTITY });
          environment.VALIDATION_PACKAGE_RECEIPT = receipt;
          outcomes.push({ id: command.id, command: `${command.executable} ${command.arguments.join(" ")}`, exitCode: 0, durationMs: 0, scopes: command.owners, skipped: "verified-exact-package" });
          continue;
        } catch { rejectedReuse = true; }
      }
      if (command.id === "code-documentation-full" && environment.VALIDATION_DOCUMENTATION_FULL_READY === "1") {
        outcomes.push({ id: command.id, command: `${command.executable} ${command.arguments.join(" ")}`, exitCode: 0, durationMs: 0, scopes: command.owners, skipped: "existing-full-documentation-review" });
        continue;
      }
      const executed = await executeCommand(command, environment, options.stdio ?? "inherit");
      const timed = { ...executed, scopes: command.owners };
      const outcome = rejectedReuse ? { ...timed, preparation: "receipt-missing-or-incompatible" } : timed;
      outcomes.push(outcome);
      if (outcome.exitCode !== 0) { passed = false; break; }
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

    if (passed && options.exactPackageHandoff) {
      // Invariant: a rejected handoff stops the run. Falling back to a second installation would
      // hide the rejection and reintroduce the duplicated install this split exists to remove.
      try {
        if (!exactPackagePlan) throw new Error("the selected validation scopes prepare no exact package");
        const handoff = assertExactPackageHandoff(await readExactPackageHandoff(options.exactPackageHandoff), exactPackagePlan);
        const consumer = exactPackagePlan.consumers[0];
        const verified = await verifyExactPackage({
          environment: { ...environment, ...handoff.handoffEnvironment, [EXACT_PACKAGE_PREPARATION_ENV.consumer]: consumer },
          consumer,
        });
        assertPreparedPackageMatchesPlan(verified, exactPackagePlan);
        preparation = verified;
        preparationHandoff = handoff.handoffEnvironment;
        preparationOutcome = {
          id: exactPackagePlan.id,
          command: "npm install --global <exact-candidate>",
          exitCode: 0,
          durationMs: verified.durationMs,
          scopes: exactPackagePlan.consumers,
          skipped: "verified-shared-preparation",
          evidence: preparationEvidence(verified.receipt),
        };
        outcomes.push(preparationOutcome);
      } catch (error) {
        preparationOutcome = {
          id: exactPackagePlan?.id ?? "exact-package-preparation",
          command: "npm install --global <exact-candidate>",
          exitCode: 1,
          durationMs: 0,
          scopes: exactPackagePlan?.consumers ?? [],
          preparation: "handoff-rejected",
          evidence: {
            schema: "a1-exact-package-preparation-evidence-v1",
            count: 0,
            consumers: exactPackagePlan?.consumers ?? [],
            reason: error instanceof Error ? error.message : "unknown exact-package handoff failure",
            cleanup: null,
          },
        };
        outcomes.push(preparationOutcome);
        passed = false;
      }
    }

    if (passed && plan.vitest) {
      for (const invocation of plan.vitest.invocations) {
        const consumer = exactPackageConsumer(exactPackagePlan, invocation);
        let invocationEnvironment = environment;
        if (consumer) {
          if (!preparation) {
            const planned = exactPackagePlan;
            const preparationStartedAt = Date.now();
            try {
              preparation = await prepareExactPackage({
                candidatePath: environment.VALIDATION_CANDIDATE_TARBALL,
                consumers: planned.consumers,
                environment,
              });
              assertPreparedPackageMatchesPlan(preparation, planned);
              preparationHandoff = preparationEnvironment(preparation);
              preparationOutcome = {
                id: planned.id,
                command: "npm install --global <exact-candidate>",
                exitCode: 0,
                durationMs: preparation.durationMs ?? Date.now() - preparationStartedAt,
                scopes: planned.consumers,
                evidence: preparationEvidence(preparation.receipt),
              };
            } catch (error) {
              preparationOutcome = {
                id: planned.id,
                command: "npm install --global <exact-candidate>",
                exitCode: 1,
                durationMs: Date.now() - preparationStartedAt,
                scopes: planned.consumers,
                evidence: {
                  schema: "a1-exact-package-preparation-evidence-v1",
                  count: 1,
                  consumers: planned.consumers,
                  cleanup: error?.cleanup ?? null,
                },
              };
              outcomes.push(preparationOutcome);
              passed = false;
              break;
            }
            outcomes.push(preparationOutcome);
          }
          invocationEnvironment = {
            ...environment,
            ...preparationHandoff,
            [EXACT_PACKAGE_PREPARATION_ENV.consumer]: consumer,
          };
          try {
            await verifyExactPackage({ environment: invocationEnvironment, consumer });
          } catch {
            outcomes.push({
              id: invocation.id,
              command: `npx ${invocation.arguments.join(" ")}`,
              exitCode: 1,
              durationMs: 0,
              scopes: invocation.scopes,
              preparation: "identity-rejected",
            });
            passed = false;
            break;
          }
        }

        const executed = await executeCommand({ id: invocation.id, executable: "npx", arguments: invocation.arguments }, invocationEnvironment, options.stdio ?? "inherit");
        let timed = { ...executed, scopes: invocation.scopes };
        if (consumer) {
          try {
            await verifyExactPackage({ environment: invocationEnvironment, consumer });
          } catch {
            if (timed.exitCode === 0) timed = { ...timed, exitCode: 1, preparation: "identity-rejected" };
            else timed = { ...timed, preparation: "owner-failed-and-identity-rejected" };
          }
        }
        const outcome = invocation.evidence ? { ...timed, evidence: invocation.evidence } : timed;
        outcomes.push(outcome);
        if (outcome.exitCode !== 0) { passed = false; break; }
      }
    }
  } catch (error) {
    primaryError = error;
    passed = false;
  } finally {
    if (preparation) {
      let cleanup;
      try { cleanup = await cleanupExactPackage(preparation); }
      catch (error) { cleanup = { status: "failed", durationMs: 0, error: error instanceof Error ? error.message : "unknown cleanup failure" }; }
      preparationOutcome.evidence.cleanup = cleanup;
      if (cleanup.status === "failed" && passed) {
        preparationOutcome.exitCode = 1;
        passed = false;
      }
    }
  }

  if (primaryError) throw primaryError;
  return {
    schema: "a1-validation-outcomes-v1",
    passed,
    startedAt,
    completedAt: Date.now(),
    exactPackagePreparation: preparationOutcome?.evidence ?? null,
    outcomes,
  };
}

export const EXACT_PACKAGE_HANDOFF_SCHEMA = "a1-exact-package-handoff-v1";

/** Perform the one shared exact-package installation ahead of the command that consumes it. */
export async function prepareSharedExactPackage(plan, options = {}) {
  const environment = { ...process.env, ...(options.env ?? {}) };
  for (const name of Object.values(EXACT_PACKAGE_PREPARATION_ENV)) delete environment[name];
  const repository = resolve(options.repository ?? process.cwd());
  const verifyBuild = options.verifyBuildReceipt ?? verifyBuildReceipt;
  const verifyPackage = options.verifyPackageReceipt ?? verifyPackageReceipt;
  const prepareExactPackage = options.prepareExactPackageInstallation ?? prepareExactPackageInstallation;
  const preparationEnvironment = options.exactPackagePreparationEnvironment ?? exactPackagePreparationEnvironment;
  const planned = assertExactPackagePreparationPlan(plan.exactPackagePreparation, plan.vitest);
  // Rationale: the consuming command still runs the whole plan, so this entry point verifies only
  // what shared preparation itself depends on. Replaying the command list here would run the
  // complete regression plan's real work twice.
  if (environment.VALIDATION_BUILD_READY !== "1") throw new Error("shared exact-package preparation requires a verified install-time build");
  const buildReceiptPath = resolve(environment.VALIDATION_BUILD_RECEIPT ?? resolve(repository, ".artifacts", "validation", "receipts", "build.json"));
  await verifyBuild(buildReceiptPath, { repository });
  if (!environment.VALIDATION_CANDIDATE_TARBALL) throw new Error("shared exact-package preparation requires an exact candidate tarball");
  const candidate = resolve(environment.VALIDATION_CANDIDATE_TARBALL);
  const receiptPath = resolve(environment.VALIDATION_PACKAGE_RECEIPT ?? candidate.replace(/\.tgz$/u, ".receipt.json"));
  await verifyPackage(receiptPath, candidate, {
    repository,
    buildReceipt: buildReceiptPath,
    sourceIdentity: environment.VALIDATION_PACKAGE_SOURCE_IDENTITY,
  });
  const startedAt = Date.now();
  const preparation = await prepareExactPackage({ candidatePath: candidate, consumers: planned.consumers, environment });
  assertPreparedPackageMatchesPlan(preparation, planned);
  return {
    schema: EXACT_PACKAGE_HANDOFF_SCHEMA,
    consumers: planned.consumers,
    root: preparation.root,
    prefix: preparation.prefix,
    packageRoot: preparation.packageRoot,
    receiptPath: preparation.receiptPath,
    receipt: preparation.receipt,
    durationMs: preparation.durationMs ?? Date.now() - startedAt,
    handoffEnvironment: preparationEnvironment(preparation),
  };
}

function assertExactPackageHandoff(handoff, plan) {
  if (!handoff || handoff.schema !== EXACT_PACKAGE_HANDOFF_SCHEMA
    || JSON.stringify(handoff.consumers) !== JSON.stringify(plan.consumers)
    || !handoff.handoffEnvironment || typeof handoff.handoffEnvironment !== "object"
    || handoff.handoffEnvironment[EXACT_PACKAGE_PREPARATION_ENV.mode] !== "runner") {
    throw new Error("exact-package preparation handoff is malformed or contradicts the validation plan");
  }
  return handoff;
}

function assertExactPackagePreparationPlan(plan, vitest) {
  if (!plan || plan.id !== "exact-package-preparation" || plan.count !== 1 || plan.policy !== EXACT_PACKAGE_INSTALL_POLICY
    || !Array.isArray(plan.consumers) || plan.consumers.length < 1 || plan.consumers.length > 2
    || new Set(plan.consumers).size !== plan.consumers.length
    || plan.consumers.some(consumer => !["package-startup", "package-contracts"].includes(consumer))) {
    throw new Error("exact-package preparation plan is invalid");
  }
  for (const consumer of plan.consumers) {
    const expectedId = consumer === "package-startup" ? "vitest-package-startup" : "vitest-package-contracts";
    const invocations = vitest?.invocations.filter(invocation => invocation.id === expectedId && invocation.scopes.includes(consumer)) ?? [];
    if (invocations.length !== 1) throw new Error(`exact-package consumer ${consumer} must have one invocation`);
  }
  return plan;
}

function assertPreparedPackageMatchesPlan(preparation, plan) {
  const receipt = preparation?.receipt;
  if (!receipt || receipt.preparation?.count !== 1 || receipt.install?.policy !== plan.policy
    || JSON.stringify(receipt.consumers) !== JSON.stringify(plan.consumers)
    || !/^[0-9a-f]{64}$/u.test(receipt.candidate?.sha256 ?? "")) {
    throw new Error("exact-package preparation evidence contradicts the validation plan");
  }
}

function exactPackageConsumer(plan, invocation) {
  if (!plan) return null;
  const consumer = invocation.id === "vitest-package-startup" ? "package-startup"
    : invocation.id === "vitest-package-contracts" ? "package-contracts" : null;
  if (!consumer) return null;
  if (!plan.consumers.includes(consumer) || !invocation.scopes.includes(consumer)) {
    throw new Error("exact-package invocation contradicts its planned consumer");
  }
  return consumer;
}

function preparationEvidence(receipt) {
  return {
    schema: "a1-exact-package-preparation-evidence-v1",
    receiptId: receipt.receiptId,
    count: receipt.preparation.count,
    durationMs: receipt.preparation.durationMs,
    candidateSha256: receipt.candidate.sha256,
    package: { name: receipt.candidate.name, version: receipt.candidate.version },
    lane: receipt.lane,
    policy: receipt.install.policy,
    prefix: receipt.install.prefix,
    installedIdentity: receipt.install.installedIdentity,
    phases: receipt.preparation.phases,
    consumers: receipt.consumers,
    cleanup: null,
  };
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

function selectedScopesForTests(entries, tests) {
  const selected = new Set(tests);
  return [...new Set(entries.filter(entry => selected.has(entry.test)).map(entry => entry.owner))];
}

function boundedVitestInvocations(id, tests, suffix, maximumCharacters = maximumPortableCommandCharacters) {
  if (tests.length === 0) return [];
  const prefix = ["vitest", "run"];
  const batches = [];
  let batch = [];
  for (const test of tests) {
    const candidate = [...prefix, ...batch, test, ...suffix];
    if (`npx ${candidate.join(" ")}`.length > maximumCharacters) {
      if (batch.length === 0) throw new Error(`validation test path exceeds the portable command bound: ${test}`);
      batches.push(batch);
      batch = [test];
    } else {
      batch.push(test);
    }
  }
  if (batch.length > 0) batches.push(batch);
  return batches.map((paths, index) => ({
    id: batches.length === 1 ? id : `${id}-${index + 1}`,
    arguments: [...prefix, ...paths, ...suffix],
  }));
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
