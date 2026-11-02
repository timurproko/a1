import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  assertHostedFixtureJob,
  fixtureEnvironment,
  fixtureReceiptPath,
  isolationReceipt,
  linuxSandboxArguments,
  macSandboxProfile,
  writableOutputs,
  type IsolationPlan,
  type IsolationProbe,
} from "../../scripts/development/native-fixture-isolation-plan.mjs";
import { assertNativeFixtureContext } from "../../scripts/development/native-fixture-policy.mjs";

const plan: IsolationPlan = {
  id: "nonce",
  platform: "linux",
  head: "a".repeat(40),
  runId: "123",
  runAttempt: "1",
  repo: resolve("."),
  workspace: "/tmp/fixture/work/repo",
  node: "/opt/node/bin/node",
  home: "/tmp/fixture/work/home",
  temp: "/tmp/fixture/work/tmp",
  work: "/tmp/fixture/work",
  control: "/tmp/fixture/control",
  cargo: "/tmp/fixture/work/cargo",
  rustup: "/tmp/fixture/work/rustup",
  receipt: "/home/runner/work/_temp/receipt.json",
  runnerHome: "/home/runner",
};
const probe: IsolationProbe = {
  loopback: true,
  remoteBlocked: true,
  credentialsHidden: true,
  unprivileged: true,
  sourceImmutable: true,
};
const hosted = {
  CI: "true",
  GITHUB_ACTIONS: "true",
  RUNNER_ENVIRONMENT: "github-hosted",
  GITHUB_RUN_ID: "123",
  GITHUB_RUN_ATTEMPT: "1",
  GITHUB_SHA: plan.head,
  GITHUB_REPOSITORY: "owner/repo",
};

describe("native fixture OS isolation plan", () => {
  it("derives the controller receipt at runtime without unsupported workflow contexts", () => {
    expect(fixtureReceiptPath({ RUNNER_TEMP: "/private-runner-temp" })).toBe(
      join("/private-runner-temp", "native-fixture-isolation.json"),
    );
    expect(
      fixtureReceiptPath({
        NATIVE_FIXTURE_ISOLATION_RECEIPT: "explicit-step-receipt",
      }),
    ).toBe("explicit-step-receipt");
    expect(() => fixtureReceiptPath({})).toThrow("private temporary directory");
  });
  it.each([
    {},
    { ...hosted, RUNNER_ENVIRONMENT: "self-hosted" },
    { ...hosted, CI: "1" },
    { ...hosted, GITHUB_RUN_ATTEMPT: "0" },
    { ...hosted, GITHUB_SHA: "mutable" },
  ])("rejects non-hosted or unbound provisioners %j", (env) => {
    expect(() => assertHostedFixtureJob(env)).toThrow(
      "workstation execution is refused",
    );
  });
  it("accepts a hosted immutable job, not merely CI=1", () =>
    expect(() => assertHostedFixtureJob(hosted)).not.toThrow());
  it("strips credentials, proxies, GitHub special files and arbitrary ambient environment", () => {
    const sourceEnvironment = {
      ...hosted,
      PATH: "/usr/bin",
      GH_TOKEN: "credential",
      GITHUB_TOKEN: "credential",
      ACTIONS_RUNTIME_TOKEN: "credential",
      SSH_AUTH_SOCK: "socket",
      HTTPS_PROXY: "proxy",
      NPM_TOKEN: "credential",
      VALIDATION_SECRET: "credential",
      GITHUB_ENV: "special",
      GITHUB_OUTPUT: "special",
      NODE_OPTIONS: "--import=untrusted",
      AWS_ACCESS_KEY_ID: "credential",
      VALIDATION_SELECTION_ID: "selection",
      XDG_SESSION_ID: "production",
      A1_CONFIG_DIR: "production",
    };
    const env = fixtureEnvironment(sourceEnvironment, plan);
    expect(JSON.stringify(env)).not.toMatch(
      /credential|socket|proxy|special|untrusted|production/u,
    );
    expect(env).toMatchObject({
      VALIDATION_SELECTION_ID: "selection",
      CARGO_NET_OFFLINE: "true",
      HOME: plan.home,
      NATIVE_FIXTURE_ISOLATION_RECEIPT: plan.receipt,
      GITHUB_WORKSPACE: plan.workspace,
    });
    expect(env.GIT_CONFIG_VALUE_0).toBe(plan.workspace);
    expect(env.XDG_SESSION_ID).toBe(`native-fixture-${plan.id}`);
  });
  it.each(Object.keys(probe) as (keyof IsolationProbe)[])(
    "refuses a receipt when the actual %s probe fails",
    (key) => {
      expect(() => isolationReceipt(plan, { ...probe, [key]: false })).toThrow(
        "probe failed",
      );
    },
  );
  it("requires enabled Defender for Windows and binds the receipt to the actual run", () => {
    expect(() =>
      isolationReceipt({ ...plan, platform: "win32" }, probe, false),
    ).toThrow("Defender");
    expect(
      isolationReceipt({ ...plan, platform: "win32" }, probe, true),
    ).toMatchObject({
      head: plan.head,
      runId: "123",
      runAttempt: "1",
      defenderRealtime: true,
      sandboxId: plan.id,
    });
  });
  it("makes privileged source immutable and shares only generated reports", () => {
    expect(writableOutputs(plan.repo)).toEqual([resolve(".artifacts")]);
    const args = linuxSandboxArguments(plan, ["node", "worker"]);
    for (const flag of [
      "--unshare-user",
      "--unshare-pid",
      "--die-with-parent",
      "--cap-drop",
    ])
      expect(args).toContain(flag);
    expect(args).toContain("/home");
    expect(args).toContain("/root");
    expect(args).toContain("/tmp");
    expect(args).toContain(plan.workspace);
    expect(args).not.toContain("--unshare-net");
    const profile = macSandboxProfile(plan);
    expect(profile).toContain("(deny network*)");
    expect(profile).toContain('(remote ip "localhost:*")');
    expect(profile).toContain("(remote unix-socket)");
    expect(profile).toContain("(deny file-read*");
    expect(profile).toContain("(deny file-write*");
    expect(profile).not.toContain("undefined");
  });
  it("preserves isolation across detached children without granting the workload runner credentials", async () => {
    const windows = await readFile(
      "scripts/development/native-fixture-windows.ps1",
      "utf8",
    );
    expect(windows).toContain("New-LocalUser");
    expect(windows).toContain("-RunLevel Limited");
    expect(windows).toContain("New-NetFirewallRule");
    expect(windows).toContain("-LocalUser $sddl");
    expect(windows).toContain("Require-OwnedAccount");
    expect(windows).toContain("$live.Handle");
    expect(windows).toContain("$live.StartTime");
    const worker = await readFile(
      "scripts/development/native-fixture-windows-worker.ps1",
      "utf8",
    );
    expect(worker).toContain("EnvironmentVariables.Clear()");
    expect(worker).toContain("WindowsBuiltInRole]::Administrator");
    const cache = await readFile(
      "scripts/development/native-fixture-cache.mjs",
      "utf8",
    );
    expect(cache).toContain('"--ignore-scripts"');
    expect(cache).toContain('"--shared"');
    const controller = await readFile(
      "scripts/development/run-isolated-native-fixtures.mjs",
      "utf8",
    );
    expect(controller).toContain("::stop-commands::");
  });
});

describe("automatic native isolation", () => {
  it("admits actual isolation proof without deployment approval or a GitHub API token", () => {
    const actual = isolationReceipt(
      { ...plan, platform: process.platform },
      probe,
      true,
    );
    expect(actual).not.toHaveProperty("securityReview");
    expect(actual).not.toHaveProperty("environment");
    expect(() => assertNativeFixtureContext(hosted, actual)).not.toThrow();
    expect(hosted).not.toHaveProperty("GH_TOKEN");
  });
  it("does not query review history or introduce a GitHub API credential dependency", async () => {
    const source = await readFile(
      "scripts/development/run-isolated-native-fixtures.mjs",
      "utf8",
    );
    for (const removed of [
      "requireHumanReview",
      "api.github.com",
      "GH_TOKEN",
      "GITHUB_TOKEN",
      "/approvals",
    ])
      expect(source).not.toContain(removed);
    expect(source).toContain("assertHostedFixtureJob(process.env)");
    expect(source).toContain("isolationReceipt(");
  });
});

it("all Full and publication native consumers enter the OS boundary automatically", async () => {
  for (const [file, jobs] of [
    ["full-regression-shared.yml", ["windows-shard", "full-regression"]],
    ["publish.yml", ["validate_sequential", "validate_windows_shard"]],
  ] as const) {
    const workflow = parse(await readFile(`.github/workflows/${file}`, "utf8"));
    if (file === "publish.yml")
      expect(workflow.jobs.publish.environment).toBe("npm-publish");
    for (const key of jobs) {
      const job = workflow.jobs[key];
      expect(job.environment).toBeUndefined();
      expect(workflow.permissions?.deployments).toBeUndefined();
      const steps = job.steps as {
        id?: string;
        name?: string;
        run?: string;
        shell?: string;
      }[];
      const setup = steps.findIndex((step) => step.id === "native-isolation");
      expect(setup).toBeGreaterThan(-1);
      expect(
        (steps[setup] as { env?: Record<string, string> }).env?.GH_TOKEN,
      ).toBeUndefined();
      const consumers = steps.filter((step) =>
        step.run?.includes("run-validation-tier.mjs"),
      );
      expect(consumers.length).toBeGreaterThan(0);
      for (const consumer of consumers) {
        expect(consumer.shell).toContain(
          "run-isolated-native-fixtures.mjs run",
        );
        expect(steps.indexOf(consumer)).toBeGreaterThan(setup);
      }
      expect(steps.some((step) => step.run?.endsWith("mjs cleanup"))).toBe(
        true,
      );
      if (key !== "full-regression")
        expect(steps.some((step) => step.run?.endsWith("mjs security"))).toBe(
          true,
        );
      expect(steps.slice(0, setup).some((step) => step.run === "npm ci")).toBe(
        false,
      );
      expect(job.env.NATIVE_FIXTURE_ISOLATION_RECEIPT).toBeUndefined();
    }
  }
});

it.each([
  "ci.yml",
  "full-regression-shared.yml",
  "full-regression.yml",
  "publish.yml",
])(
  "uses GitHub-supported shell and job-environment contexts in %s",
  async (file) => {
    const workflow = parse(await readFile(`.github/workflows/${file}`, "utf8"));
    for (const [name, job] of Object.entries(workflow.jobs) as [
      string,
      {
        env?: Record<string, unknown>;
        steps?: { shell?: string }[];
        defaults?: { run?: { shell?: string } };
      },
    ][]) {
      for (const step of [
        ...(job.steps ?? []),
        { shell: job.defaults?.run?.shell },
      ]) {
        expect(
          step.shell ?? "",
          `${name} shell must be a literal declaration`,
        ).not.toContain("${{");
      }
      for (const value of Object.values(job.env ?? {})) {
        for (const expression of String(value).matchAll(
          /\$\{\{([\s\S]*?)\}\}/gu,
        )) {
          expect(
            expression[1],
            `${name} job env cannot reference step-runtime contexts`,
          ).not.toMatch(/\b(?:runner|steps|env)\./u);
        }
      }
    }
  },
);
