import { mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTierPlan, loadValidationSuites, runTierPlan } from "../../scripts/release/validation-tier.mjs";

const resourceSensitiveChange = "stabilize-resource-sensitive-validation";

const originalResourceSensitiveTests = [
  "test/repository-governance/validation-impact.test.ts",
  "test/repository-governance/code-documentation.test.ts",
  "test/foundation/storage/storage.test.ts",
  "test/foundation/release/cohort-state.test.ts",
  "test/foundation/release/update-live-cohort.test.ts",
  "test/features/workspace/reconciliation.test.ts",
];

// Provenance: archived incident evidence keeps its original partition; new storage and isolated-producer workloads join only the active partition.
const resourceSensitiveTests = [
  ...originalResourceSensitiveTests.slice(0, 1),
  "test/repository-governance/naming-selection.test.ts",
  "test/foundation/launch-context/cutover.test.ts",
  ...originalResourceSensitiveTests.slice(1, 2),
  "test/repository-governance/local-cleanup.test.ts",
  ...originalResourceSensitiveTests.slice(2, 4),
  "test/foundation/release/release-gc.test.ts",
  ...originalResourceSensitiveTests.slice(4),
  "test/features/workspace/workspace.test.ts",
  "test/features/prompt-history/store.test.ts",
  "test/integrations/pi/session-ui/command-message-parity.test.ts",
  "test/integrations/pi/session-ui/command-outcome-parity.test.ts",
  "test/integrations/pi/session-ui/session-shell.test.ts",
  "test/integrations/pi/session-ui/paste-executor.test.ts",
  "test/integrations/pi/session-ui/clipboard-executor-lifecycle.test.ts",
  "test/integrations/pi/session-ui/clipboard-packaged.test.ts",
  "test/integrations/pi/components/editor-text-paste.test.ts",
  "test/integrations/pi/session-ui/prompt-history-controller.test.ts",
  "test/foundation/release/update-activation.test.ts",
];

function invocation(plan: Awaited<ReturnType<typeof createTierPlan>>, id: string) {
  const found = plan.vitest?.invocations.find(candidate => candidate.id === id);
  expect(found, `missing ${id}`).toBeDefined();
  return found!;
}

function resourceInvocations(plan: Awaited<ReturnType<typeof createTierPlan>>) {
  return plan.vitest?.invocations.filter(candidate => candidate.id.startsWith("vitest-fast-resource-sensitive-")) ?? [];
}

describe("resource-sensitive validation partition", () => {
  it("subtracts every resource-sensitive test from the ordinary remainder and runs each once in a fresh process without a timeout override", async () => {
    const plan = await createTierPlan(["fast"]);
    const ordinary = invocation(plan, "vitest-fast");
    const resources = resourceInvocations(plan);

    expect(resources).toHaveLength(resourceSensitiveTests.length);
    for (const [index, test] of resourceSensitiveTests.entries()) {
      expect(ordinary.arguments).toContain(test);
      expect(ordinary.arguments[ordinary.arguments.indexOf(test) - 1]).toBe("--exclude");
      expect(resources[index]).toEqual({
        id: `vitest-fast-resource-sensitive-${index + 1}`,
        arguments: ["vitest", "run", test, "--no-file-parallelism"],
        scopes: ["fast-resource-sensitive"],
        evidence: {
          executionClass: "resource-sensitive",
          testFiles: [test],
          fileParallelism: false,
          timeoutMs: 5000,
          timeoutSource: "vitest-default",
          retries: 0,
          perFileTiming: "vitest-default-reporter",
        },
      });
      expect(resources[index]!.arguments.some(argument => argument.toLowerCase().includes("timeout"))).toBe(false);
    }
  });

  it("uses one partition for pull-request, exact-package, and full-release plans", async () => {
    const pullRequest = await createTierPlan(["typecheck", "architecture", "fast", "dist-integration"]);
    const exactPackage = await createTierPlan(["typecheck", "architecture", "fast", "rendering-stability", "dist-integration", "package-smoke", "package-install"]);
    const full = await createTierPlan(["full-release"]);

    expect(resourceInvocations(pullRequest)).toEqual(resourceInvocations(exactPackage));
    expect(resourceInvocations(full)).toEqual(resourceInvocations(pullRequest));
    const fullRemainder = invocation(full, "vitest-full-without-isolated");
    for (const test of resourceSensitiveTests) {
      expect(fullRemainder.arguments[fullRemainder.arguments.indexOf(test) - 1]).toBe("--exclude");
    }
    expect(resourceInvocations(full)).toHaveLength(resourceSensitiveTests.length);
  });

  it("exposes disjoint atomic invocations with the identical public fast composition", async () => {
    const remainder = await createTierPlan(["fast-remainder"]);
    const sensitive = await createTierPlan(["fast-resource-sensitive"]);
    const composed = await createTierPlan(["fast"]);
    expect(composed.selected).toEqual(["fast-remainder", "fast-resource-sensitive"]);
    expect(remainder.selected).toEqual(["fast-remainder"]);
    expect(sensitive.selected).toEqual(["fast-resource-sensitive"]);
    expect(remainder.vitest?.invocations).toEqual([invocation(composed, "vitest-fast")]);
    expect(sensitive.vitest?.invocations).toEqual(resourceInvocations(composed));
    expect(composed.vitest?.invocations).toEqual([...remainder.vitest!.invocations, ...sensitive.vitest!.invocations]);
    expect(remainder.commands).toEqual([]);
    expect(remainder.requiresBuild).toBe(false);
    expect(sensitive.commands.map(command => command.id)).toEqual(["candidate-build"]);
    expect(sensitive.requiresBuild).toBe(true);
    for (const plan of [remainder, sensitive]) expect(plan.consumesPackage).toBe(false);
    const repeated = await createTierPlan(["fast", "fast-resource-sensitive", "fast-remainder", "fast"]);
    expect(repeated.selected).toEqual(composed.selected);
    expect(repeated.vitest).toEqual(composed.vitest);
  });

  it("preserves the complete disjoint fast population and full-suite ownership", async () => {
    const all = await discoverTestPaths("test");
    const suites = JSON.parse(await readFile("config/validation-suites.json", "utf8"));
    const excluded = new Set<string>(suites.scopes["fast-remainder"].exclude);
    const expectedFast = all.filter(path => !excluded.has(path));
    const remainder = await createTierPlan(["fast-remainder"]);
    const sensitive = await createTierPlan(["fast-resource-sensitive"]);
    const combined = [...remainder.vitest!.invocations, ...sensitive.vitest!.invocations]
      .flatMap(item => selectedPaths(item.arguments, all));
    expect([...combined].sort()).toEqual(expectedFast.sort());
    expect(new Set(combined).size).toBe(combined.length);
    const full = await createTierPlan(["full-release"]);
    const fullPaths = full.vitest!.invocations.flatMap(item => selectedPaths(item.arguments, all));
    expect(fullPaths.sort()).toEqual(all.sort());
    expect(new Set(fullPaths).size).toBe(fullPaths.length);
  });

  it("executes each atomic plan without launching the other partition", async () => {
    for (const scope of ["fast-remainder", "fast-resource-sensitive"]) {
      const plan = await createTierPlan([scope]);
      const calls: string[] = [];
      const result = await runTierPlan(plan, {
        executeCommand: async command => {
          calls.push(command.id);
          return { id: command.id, command: command.arguments.join(" "), exitCode: 0, durationMs: 1 };
        },
        recordBuildReceipt: async () => ({} as never),
        env: { VALIDATION_BUILD_READY: "0" },
      });
      expect(result.passed).toBe(true);
      expect(calls).toEqual(scope === "fast-resource-sensitive"
        ? ["candidate-build", ...resourceInvocations(plan).map(item => item.id)]
        : ["vitest-fast"]);
    }
  });

  it("fails closed on invalid ownership, missing files, and timeout configuration", async () => {
    const source = JSON.parse(await readFile("config/validation-suites.json", "utf8"));
    const fixtures = [
      {
        label: "duplicates",
        mutate: (value: any) => value.scopes["fast-resource-sensitive"].tests.push(value.scopes["fast-resource-sensitive"].tests[0]),
        error: "duplicate resource-sensitive tests",
      },
      {
        label: "fast exclusion overlap",
        mutate: (value: any) => value.scopes["fast-remainder"].exclude.push(value.scopes["fast-resource-sensitive"].tests[0]),
        error: "overlaps fast exclusion",
      },
      {
        label: "explicit scope overlap",
        mutate: (value: any) => { value.scopes.typecheck.tests = [value.scopes["fast-resource-sensitive"].tests[0]]; },
        error: "overlaps explicit scope",
      },
      {
        label: "missing path",
        mutate: (value: any) => { value.scopes["fast-resource-sensitive"].tests[0] = "test/missing.test.ts"; },
        error: "does not exist",
      },
      {
        label: "missing build prerequisite",
        mutate: (value: any) => { value.scopes["fast-resource-sensitive"].requiresBuild = false; },
        error: "must authenticate emitted build prerequisites",
      },
      {
        label: "timeout override",
        mutate: (value: any) => { value.tiers.fast.resourceSensitiveTimeoutMs = 30_000; },
        error: "unsupported fast validation fields",
      },
      ...["fast-remainder", "fast-resource-sensitive"].map(scope => ({
        label: `${scope} timeout override`,
        mutate: (value: any) => { value.scopes[scope].timeoutMs = 30_000; },
        error: "unsupported fast validation fields",
      })),
      {
        label: "incomplete composition",
        mutate: (value: any) => { value.tiers.fast.includes.pop(); },
        error: "must compose both atomic partitions exactly once",
      },
      {
        label: "duplicate composition member",
        mutate: (value: any) => { value.tiers.fast.includes.push("fast-remainder"); },
        error: "must compose both atomic partitions exactly once",
      },
      {
        label: "narrowed remainder",
        mutate: (value: any) => { value.scopes["fast-remainder"].includeRoot = "test/foundation"; },
        error: "complete test root",
      },
      {
        label: "shadowed sensitive owner",
        mutate: (value: any) => { value.tiers["fast-resource-sensitive"] = { kind: "commands", commands: [] }; },
        error: "must not be shadowed",
      },
      {
        label: "additional remainder owner",
        mutate: (value: any) => { value.scopes.extra = structuredClone(value.scopes["fast-remainder"]); },
        error: "authoritative scope names",
      },
      {
        label: "sensitive generic timeout class",
        mutate: (value: any) => { value.scopes["fast-resource-sensitive"].kind = "vitest-files"; },
        error: "atomic scopes",
      },
    ];

    const repository = await suiteFixture(source);
    try {
      for (const fixture of fixtures) {
        const value = structuredClone(source);
        fixture.mutate(value);
        await writeFile(join(repository, "config", "validation-suites.json"), `${JSON.stringify(value, null, 2)}\n`);
        await expect(loadValidationSuites(repository), fixture.label).rejects.toThrow(fixture.error);
      }
    } finally {
      await rm(repository, { recursive: true, force: true });
    }
  });

  it("stops after one failed resource-sensitive invocation and retains its evidence", async () => {
    const calls: string[] = [];
    const evidence = {
      executionClass: "resource-sensitive" as const,
      testFiles: resourceSensitiveTests,
      fileParallelism: false as const,
      timeoutMs: 5000 as const,
      timeoutSource: "vitest-default" as const,
      retries: 0 as const,
      perFileTiming: "vitest-default-reporter" as const,
    };
    const result = await runTierPlan({
      schema: "a1-validation-plan-v1",
      requested: ["fast"],
      selected: ["fast"],
      requiresBuild: false,
      consumesPackage: false,
      candidateTarball: "unused.tgz",
      commands: [],
      vitest: {
        mode: "fast-and-explicit",
        invocations: [
          { id: "vitest-fast-resource-sensitive", scopes: ["fast-resource-sensitive"], arguments: ["vitest", "run", "fixture.test.ts", "--no-file-parallelism"], evidence },
          { id: "must-not-run", scopes: ["fast-remainder"], arguments: ["vitest", "run", "later.test.ts"] },
        ],
      },
    }, {
      stdio: "pipe",
      executeCommand: async command => {
        calls.push(command.id);
        return { id: command.id, command: `${command.executable} ${command.arguments.join(" ")}`, exitCode: 7, durationMs: 12 };
      },
    });

    expect(result.passed).toBe(false);
    expect(calls).toEqual(["vitest-fast-resource-sensitive"]);
    expect(result.outcomes).toEqual([expect.objectContaining({ id: "vitest-fast-resource-sensitive", exitCode: 7, evidence })]);
  });

  it("preserves incident and repeated focused execution evidence", async () => {
    const { regression, execution } = await readResourceSensitiveEvidence();
    expect(regression).toMatchObject({
      schema: "a1-resource-sensitive-validation-regression-v1",
      policy: { testTimeoutMs: 5000, timeoutIncreaseAllowed: false, automaticRetries: 0, fileParallelism: false },
      partition: originalResourceSensitiveTests,
    });
    expect(regression.incidents.map((incident: any) => incident.workflowRun)).toEqual([33617331350, 33642848728, 33657859943, 33767055550]);
    expect(regression.verification).toMatchObject({
      focusedExecution: { platform: "win32-x64", node: "v24.16.0", repeats: 3, timeoutMs: 5000, result: "passed" },
    });
    expect(regression.verification.commands.every((command: any) => command.result.includes("passed"))).toBe(true);
    for (const incident of regression.incidents) {
      expect(incident.platform).toBe("windows-2025-node24");
      expect(incident.timeoutMs).toBe(5000);
      expect(incident.timedOutTests.length).toBeGreaterThan(0);
      expect(incident.url).toMatch(/^https:\/\/github\.com\/timurproko\/a1\/actions\/runs\/\d+\/job\/\d+$/u);
      expect(incident.comparison.url).toMatch(/^https:\/\/github\.com\/timurproko\/a1\/actions\/runs\/\d+(?:\/job\/\d+)?$/u);
      expect(incident.excludedUnrelatedFailures.length).toBeGreaterThan(0);
    }

    expect(execution).toMatchObject({
      schema: "a1-resource-sensitive-execution-v1",
      policy: { fileParallelism: false, timeoutMs: 5000, timeoutSource: "vitest-default", retries: 0, timeoutOverridePresent: false },
      invocation: { id: "vitest-fast-resource-sensitive", testFiles: originalResourceSensitiveTests },
    });
    expect(execution.runs).toHaveLength(3);
    for (const run of execution.runs) {
      expect(run.files.map((file: any) => file.path).sort()).toEqual([...originalResourceSensitiveTests].sort());
      expect(run.files.every((file: any) => file.status === "passed")).toBe(true);
      expect(run.maxTestBodyDurationMs).toBeLessThan(5000);
    }
  });
});

describe("resource-sensitive evidence location", () => {
  it.each(["2026-09-11", "2027-01-02"])("preserves both evidence records through a %s archive move", async date => {
    const source = await readResourceSensitiveEvidence();
    const repository = await evidenceFixture(source);
    try {
      expect(await readResourceSensitiveEvidence(repository)).toEqual(source);
      const changes = join(repository, "openspec", "changes");
      await mkdir(join(changes, "archive"));
      await rename(join(changes, resourceSensitiveChange), join(changes, "archive", `${date}-${resourceSensitiveChange}`));
      expect(await readResourceSensitiveEvidence(repository)).toEqual(source);
    } finally {
      await rm(repository, { recursive: true, force: true });
    }
  });

  it.each([
    { label: "missing change", locations: [] },
    { label: "unrelated and near-match names", locations: ["archive/2026-09-11-other-change", `archive/undated-${resourceSensitiveChange}`, `archive/2026-09-11-${resourceSensitiveChange}-other`] },
    { label: "active and archived copies", locations: [resourceSensitiveChange, `archive/2026-09-11-${resourceSensitiveChange}`] },
    { label: "multiple archived copies", locations: [`archive/2026-09-11-${resourceSensitiveChange}`, `archive/2026-09-12-${resourceSensitiveChange}`] },
  ])("rejects $label rather than choosing arbitrary evidence", async ({ locations }) => {
    const repository = await mkdtemp(join(tmpdir(), "a1-evidence-location-"));
    try {
      const changes = join(repository, "openspec", "changes");
      await mkdir(changes, { recursive: true });
      for (const location of locations) await mkdir(join(changes, location), { recursive: true });
      await expect(readResourceSensitiveEvidence(repository)).rejects.toThrow("Expected exactly one active or archived");
    } finally {
      await rm(repository, { recursive: true, force: true });
    }
  });

  it.each([
    { filename: "resource-sensitive-validation-regression.json", corrupt: false },
    { filename: "resource-sensitive-execution.json", corrupt: false },
    { filename: "resource-sensitive-validation-regression.json", corrupt: true },
    { filename: "resource-sensitive-execution.json", corrupt: true },
  ])("fails closed for invalid $filename (corrupt=$corrupt)", async ({ filename, corrupt }) => {
    const repository = await evidenceFixture(await readResourceSensitiveEvidence());
    try {
      const path = join(repository, "openspec", "changes", resourceSensitiveChange, "evidence", filename);
      if (corrupt) await writeFile(path, "{invalid JSON", "utf8");
      else await rm(path);
      await expect(readResourceSensitiveEvidence(repository)).rejects.toThrow(corrupt ? SyntaxError : /ENOENT/u);
    } finally {
      await rm(repository, { recursive: true, force: true });
    }
  });

  it("propagates an invalid archive directory instead of ignoring it", async () => {
    const repository = await evidenceFixture(await readResourceSensitiveEvidence());
    try {
      await writeFile(join(repository, "openspec", "changes", "archive"), "not a directory", "utf8");
      await expect(readResourceSensitiveEvidence(repository)).rejects.toThrow(/ENOTDIR/u);
    } finally {
      await rm(repository, { recursive: true, force: true });
    }
  });
});

// Invariant: Select one change directory before reading either file; never mix evidence across copies.
async function readResourceSensitiveEvidence(repository = process.cwd()) {
  const changes = join(repository, "openspec", "changes");
  const entries = await readdir(changes, { withFileTypes: true });
  const candidates = entries
    .filter(entry => entry.isDirectory() && entry.name === resourceSensitiveChange)
    .map(entry => join(changes, entry.name));
  if (entries.some(entry => entry.name === "archive")) {
    const archived = await readdir(join(changes, "archive"), { withFileTypes: true });
    for (const entry of archived) {
      if (entry.isDirectory() && /^\d{4}-\d{2}-\d{2}-/u.test(entry.name) && entry.name.slice(11) === resourceSensitiveChange) {
        candidates.push(join(changes, "archive", entry.name));
      }
    }
  }
  if (candidates.length !== 1) {
    throw new Error(`Expected exactly one active or archived ${resourceSensitiveChange} directory; found ${candidates.length}: ${candidates.join(", ")}`);
  }
  const evidence = join(candidates[0]!, "evidence");
  return {
    regression: JSON.parse(await readFile(join(evidence, "resource-sensitive-validation-regression.json"), "utf8")),
    execution: JSON.parse(await readFile(join(evidence, "resource-sensitive-execution.json"), "utf8")),
  };
}

async function evidenceFixture(source: Awaited<ReturnType<typeof readResourceSensitiveEvidence>>) {
  const repository = await mkdtemp(join(tmpdir(), "a1-evidence-location-"));
  try {
    const evidence = join(repository, "openspec", "changes", resourceSensitiveChange, "evidence");
    await mkdir(evidence, { recursive: true });
    await writeFile(join(evidence, "resource-sensitive-validation-regression.json"), JSON.stringify(source.regression), "utf8");
    await writeFile(join(evidence, "resource-sensitive-execution.json"), JSON.stringify(source.execution), "utf8");
    return repository;
  } catch (error) {
    await rm(repository, { recursive: true, force: true });
    throw error;
  }
}

async function discoverTestPaths(directory: string): Promise<string[]> {
  const paths: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) paths.push(...await discoverTestPaths(path));
    else if (entry.name.endsWith(".test.ts")) paths.push(path);
  }
  return paths;
}

function selectedPaths(args: string[], paths: string[]): string[] {
  const excluded = new Set(args.filter((_argument, index) => args[index - 1] === "--exclude"));
  const explicit = args.filter((argument, index) => argument.endsWith(".test.ts") && args[index - 1] !== "--exclude");
  return paths.filter(path => !excluded.has(path) && (explicit.length === 0 || explicit.includes(path)));
}

async function suiteFixture(suites: any) {
  const repository = await mkdtemp(join(tmpdir(), "a1-validation-suite-"));
  await mkdir(join(repository, "config"), { recursive: true });
  await writeFile(join(repository, "config", "validation-suites.json"), `${JSON.stringify(suites, null, 2)}\n`);
  for (const path of resourceSensitiveTests) {
    await mkdir(dirname(join(repository, path)), { recursive: true });
    await writeFile(join(repository, path), "export {};\n");
  }
  return repository;
}
