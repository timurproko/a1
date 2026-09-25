import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, resolve } from "node:path";
import {
  classifyProgressLine,
  conciseFailure,
  installerHelp,
  parseArguments,
  renderProgressBar,
  runInstaller,
  sanitizeDiagnostic,
} from "../../../packages/a1-install/bin/a1-install.js";

const roots: string[] = [];
const exactTarget = ["--version", "0.2.1-dev.591"];
afterEach(async () => {
  await Promise.all(roots.splice(0).map(async root => await rm(root, { recursive: true, force: true })));
});

function capture() {
  let value = "";
  return {
    stream: { isTTY: false, write(chunk: string) { value += chunk; return true; } },
    read: () => value,
  };
}

async function fixture(version = "0.2.1-dev.591") {
  const root = await mkdtemp(resolve(tmpdir(), "a1-installer-test-"));
  roots.push(root);
  const prefix = resolve(root, "prefix");
  const globalRoot = process.platform === "win32" ? resolve(prefix, "node_modules") : resolve(prefix, "lib", "node_modules");
  const packageRoot = resolve(globalRoot, "@timurproko", "a1");
  const launcherDirectory = process.platform === "win32" ? prefix : resolve(prefix, "bin");
  const launchers = process.platform === "win32"
    ? [resolve(prefix, "a1"), resolve(prefix, "a1.cmd"), resolve(prefix, "a1.ps1")]
    : [resolve(launcherDirectory, "a1")];

  async function materialize() {
    await mkdir(resolve(packageRoot, "bin"), { recursive: true });
    await mkdir(launcherDirectory, { recursive: true });
    await writeFile(resolve(packageRoot, "package.json"), `${JSON.stringify({ name: "@timurproko/a1", version, updateActivationContracts: ["activate-v1"] })}\n`);
    await writeFile(resolve(packageRoot, "bin", "cli.js"), "// cli\n");
    await writeFile(resolve(packageRoot, "bin", "activate.js"), "// activate\n");
    await Promise.all(launchers.map(async path => await writeFile(path, "node_modules/@timurproko/a1/bin/cli.js\n")));
  }
  return { root, prefix, globalRoot, packageRoot, launcherDirectory, launchers, materialize };
}

describe("installer command contract", () => {
  it("accepts stable, development, and exact development targets", () => {
    expect(parseArguments([]).target).toEqual({ kind: "stable" });
    expect(parseArguments(["--develop"]).target).toEqual({ kind: "develop" });
    expect(parseArguments(["--version", "0.1.8-dev.107"]).target).toEqual({ kind: "version", version: "0.1.8-dev.107" });
    expect(() => parseArguments(["--develop", "--version", "0.1.8-dev.107"])).toThrow(/cannot be combined/u);
    expect(() => parseArguments(["--version", "latest"])).toThrow(/exact development version/u);
    expect(() => parseArguments(["--version", "01.1.8-dev.1"])).toThrow(/exact development version/u);
    expect(() => parseArguments(["--version", "0.1.8-dev.0"])).toThrow(/exact development version/u);
  });

  it("keeps help intentionally small", () => {
    expect(installerHelp()).toBe([
      "a1-install",
      "a1-install --develop",
      "a1-install --version <x.y.z-dev.n>",
      "a1-install --verbose",
      "",
    ].join("\n"));
  });

  it("renders the update palette and only allowlisted phases", () => {
    const rendered = renderProgressBar(31);
    expect(rendered).toContain("\u001b[38;2;138;190;183m");
    expect(rendered).toContain("\u001b[38;2;128;128;128m 31%");
    expect(classifyProgressLine("npm http fetch GET 200 package.tgz")).toBe("Downloading packages");
    expect(classifyProgressLine("arbitrary package output", "Resolving packages")).toBe("Resolving packages");
  });

  it("maps diagnostics without replaying them", () => {
    expect(conciseFailure("install", "npm ERR! code EACCES")).toBe("permission was denied");
    expect(conciseFailure("resolve", "npm ERR! code ETARGET")).toBe("the selected release was not found");
    expect(sanitizeDiagnostic("authorization: secret\nhttps://user:pass@example.test/a?token=secret")).toBe("https://[redacted]@example.test/a?token=[redacted]");
  });
});

describe("installer orchestration", () => {
  it.each([
    { args: [] as string[], returned: '"0.2.1-dev.591"' },
    { args: ["--develop"], returned: '"0.2.1"' },
  ])("rejects a release that does not match its selected channel", async ({ args, returned }) => {
    const stdout = capture();
    const stderr = capture();
    let calls = 0;
    const runner = {
      async npm() { calls += 1; return { code: 0, signal: null, stdout: returned, stderr: "" }; },
      async node() { throw new Error("mutation must not run"); },
    };
    const code = await runInstaller(args, {
      stdout: stdout.stream, stderr: stderr.stream, runner, platform: process.platform,
      environment: { PATH: process.env.PATH ?? "" }, handleSignals: false,
    });
    expect(code).toBe(1);
    expect(calls).toBe(1);
    expect(stdout.read()).toBe("");
    expect(stderr.read()).toBe("installation failed: could not resolve the selected release\n");
  });

  it("captures the npm transcript and prints one success result", async () => {
    const setup = await fixture();
    const stdout = capture();
    const stderr = capture();
    const calls: string[][] = [];
    const runner = {
      async npm(args: string[], callbacks: Record<string, ((value: string) => void) | undefined>) {
        calls.push(args);
        if (args[0] === "view") return { code: 0, signal: null, stdout: '"0.2.1-dev.591"\n', stderr: "" };
        if (args[0] === "root") return { code: 0, signal: null, stdout: `${setup.globalRoot}\n`, stderr: "" };
        await setup.materialize();
        callbacks.onStderrLine?.("npm warn deprecated hidden-noise");
        callbacks.onStderrLine?.("npm http fetch GET 200 package.tgz");
        return {
          code: 0, signal: null,
          stdout: "added 442 packages\n48 packages are looking for funding\n",
          stderr: "npm warn deprecated hidden-noise\nnpm warn lifecycle scripts were disabled\nnpm notice New major version of npm available\n0 vulnerabilities\n",
        };
      },
      async node(_entry: string, _args: string[], callbacks: Record<string, ((value: string) => void) | undefined>) {
        callbacks.onStdoutLine?.(JSON.stringify({ event: "phase", phase: "materialized" }));
        callbacks.onStdoutLine?.(JSON.stringify({ event: "phase", phase: "certified" }));
        callbacks.onStdoutLine?.(JSON.stringify({ event: "phase", phase: "active-reference-committed" }));
        callbacks.onStdoutLine?.(JSON.stringify({ event: "completed" }));
        return { code: 0, signal: null, stdout: "", stderr: "" };
      },
    };
    const code = await runInstaller(exactTarget, {
      stdout: stdout.stream,
      stderr: stderr.stream,
      runner,
      platform: process.platform,
      environment: { PATH: `${setup.launcherDirectory}${delimiter}${process.env.PATH ?? ""}` },
      handleSignals: false,
    });
    expect(code).toBe(0);
    expect(stdout.read()).toBe("a1 successfully installed\n");
    expect(stderr.read()).toBe("");
    const installCall = calls.find(call => call[0] === "install");
    expect(installCall).toContain("--loglevel=verbose");
    expect(installCall).toContain("--ignore-scripts");
    expect(installCall?.at(-1)).toBe("@timurproko/a1@0.2.1-dev.591");
    expect(installCall?.at(-1)).not.toMatch(/@(latest|next)$/u);
    expect(stdout.read()).not.toMatch(/deprecated|funding|lifecycle|packages|vulnerabilities|npm available/iu);
  });

  it("delegates an existing installation to the safe updater", async () => {
    const setup = await fixture();
    await setup.materialize();
    const stdout = capture();
    const stderr = capture();
    const nodeCalls: Array<{ entry: string; args: string[] }> = [];
    const runner = {
      async npm(args: string[]) {
        return args[0] === "view"
          ? { code: 0, signal: null, stdout: '"0.2.1-dev.591"', stderr: "" }
          : { code: 0, signal: null, stdout: setup.globalRoot, stderr: "" };
      },
      async node(entry: string, args: string[]) {
        nodeCalls.push({ entry, args });
        return { code: 0, signal: null, stdout: "", stderr: "" };
      },
    };
    const code = await runInstaller(["--develop"], {
      stdout: stdout.stream,
      stderr: stderr.stream,
      runner,
      platform: process.platform,
      environment: { PATH: `${setup.launcherDirectory}${delimiter}${process.env.PATH ?? ""}` },
      handleSignals: false,
    });
    expect(code).toBe(0);
    expect(nodeCalls).toEqual([{ entry: resolve(setup.packageRoot, "bin", "cli.js"), args: ["update", "--develop"] }]);
    expect(stdout.read()).toBe("a1 successfully installed\n");
  });

  it("refuses a linked existing package before mutation", async () => {
    const setup = await fixture();
    const foreign = resolve(setup.root, "foreign-package");
    await mkdir(resolve(setup.packageRoot, ".."), { recursive: true });
    await mkdir(foreign, { recursive: true });
    await writeFile(resolve(foreign, "package.json"), JSON.stringify({ name: "@timurproko/a1", version: "0.2.1-dev.591" }));
    await symlink(foreign, setup.packageRoot, process.platform === "win32" ? "junction" : "dir");
    const stdout = capture();
    const stderr = capture();
    const runner = {
      async npm(args: string[]) {
        return args[0] === "view"
          ? { code: 0, signal: null, stdout: '"0.2.1-dev.591"', stderr: "" }
          : { code: 0, signal: null, stdout: setup.globalRoot, stderr: "" };
      },
      async node() { throw new Error("mutation must not run"); },
    };
    const code = await runInstaller(exactTarget, {
      stdout: stdout.stream, stderr: stderr.stream, runner, platform: process.platform,
      environment: { PATH: process.env.PATH ?? "" }, handleSignals: false,
    });
    expect(code).toBe(1);
    expect(stdout.read()).toBe("");
    expect(stderr.read()).toBe("installation failed: existing installation ownership could not be verified\n");
  });

  it("refuses an unowned launcher before a fresh installation", async () => {
    const setup = await fixture();
    await mkdir(setup.launcherDirectory, { recursive: true });
    await writeFile(setup.launchers[0]!, "foreign launcher\n");
    const stdout = capture();
    const stderr = capture();
    const runner = {
      async npm(args: string[]) {
        if (args[0] === "view") return { code: 0, signal: null, stdout: '"0.2.1-dev.591"', stderr: "" };
        if (args[0] === "root") return { code: 0, signal: null, stdout: setup.globalRoot, stderr: "" };
        throw new Error("installation must not run");
      },
      async node() { throw new Error("activation must not run"); },
    };
    const code = await runInstaller(exactTarget, {
      stdout: stdout.stream, stderr: stderr.stream, runner, platform: process.platform,
      environment: { PATH: process.env.PATH ?? "" }, handleSignals: false,
    });
    expect(code).toBe(1);
    expect(stdout.read()).toBe("");
    expect(stderr.read()).toBe("installation failed: existing installation ownership could not be verified\n");
  });

  it("returns status 130 and restores a TTY after cancellation", async () => {
    const setup = await fixture();
    const stdout = capture();
    stdout.stream.isTTY = true;
    const stderr = capture();
    const controller = new AbortController();
    const runner = {
      async npm() {
        controller.abort();
        return { code: null, signal: "SIGTERM", stdout: "", stderr: "npm progress that must stay hidden" };
      },
      async node() { throw new Error("not reached"); },
    };
    const code = await runInstaller([], {
      stdout: stdout.stream, stderr: stderr.stream, runner, signal: controller.signal,
      platform: process.platform, environment: { PATH: process.env.PATH ?? "" }, handleSignals: false,
      progressOptions: { interval: 1 },
    });
    expect(code).toBe(130);
    expect(stderr.read()).toBe("installation cancelled\n");
    expect(stdout.read()).toContain("\u001b[38;2;138;190;183m");
    expect(stdout.read()).toContain("\u001b[?25h");
    expect(stdout.read()).not.toContain("npm progress");
    expect(stdout.read()).not.toContain("successfully installed");

    const retryStdout = capture();
    const retryStderr = capture();
    const retryRunner = {
      async npm(args: string[]) {
        if (args[0] === "view") return { code: 0, signal: null, stdout: '"0.2.1-dev.591"', stderr: "" };
        if (args[0] === "root") return { code: 0, signal: null, stdout: setup.globalRoot, stderr: "" };
        await setup.materialize();
        return { code: 0, signal: null, stdout: "", stderr: "" };
      },
      async node(_entry: string, _args: string[], callbacks: { onStdoutLine?: (line: string) => void }) {
        callbacks.onStdoutLine?.('{"event":"phase","phase":"materialized"}');
        callbacks.onStdoutLine?.('{"event":"phase","phase":"certified"}');
        callbacks.onStdoutLine?.('{"event":"phase","phase":"active-reference-committed"}');
        callbacks.onStdoutLine?.('{"event":"completed"}');
        return { code: 0, signal: null, stdout: "", stderr: "" };
      },
    };
    const retryCode = await runInstaller(exactTarget, {
      stdout: retryStdout.stream, stderr: retryStderr.stream, runner: retryRunner,
      platform: process.platform,
      environment: { PATH: `${setup.launcherDirectory}${delimiter}${process.env.PATH ?? ""}` },
      handleSignals: false,
    });
    expect(retryCode).toBe(0);
    expect(retryStdout.read()).toBe("a1 successfully installed\n");
    expect(retryStderr.read()).toBe("");
  });

  it("rejects malformed activation events without replaying them", async () => {
    const setup = await fixture();
    const stdout = capture();
    const stderr = capture();
    const runner = {
      async npm(args: string[]) {
        if (args[0] === "view") return { code: 0, signal: null, stdout: '"0.2.1-dev.591"', stderr: "" };
        if (args[0] === "root") return { code: 0, signal: null, stdout: setup.globalRoot, stderr: "" };
        await setup.materialize();
        return { code: 0, signal: null, stdout: "", stderr: "" };
      },
      async node(_entry: string, _args: string[], callbacks: { onStdoutLine?: (line: string) => void }) {
        callbacks.onStdoutLine?.('{"event":"phase","phase":"arbitrary-child-text"}');
        return { code: 0, signal: null, stdout: "", stderr: "" };
      },
    };
    const code = await runInstaller(exactTarget, {
      stdout: stdout.stream, stderr: stderr.stream, runner, platform: process.platform,
      environment: { PATH: `${setup.launcherDirectory}${delimiter}${process.env.PATH ?? ""}` },
      handleSignals: false,
    });
    expect(code).toBe(1);
    expect(stdout.read()).toBe("");
    expect(stderr.read()).toBe("installation failed: activation failed\n");
    expect(stderr.read()).not.toContain("arbitrary-child-text");
  });

  it("reports one concise default failure and reveals sanitized details only on request", async () => {
    const setup = await fixture();
    const run = async (verbose: boolean) => {
      const stdout = capture();
      const stderr = capture();
      const runner = {
        async npm(args: string[]) {
          if (args[0] === "view") return { code: 0, signal: null, stdout: '"0.2.1-dev.591"', stderr: "" };
          if (args[0] === "root") return { code: 0, signal: null, stdout: setup.globalRoot, stderr: "" };
          return {
            code: 1, signal: null, stdout: "added 0 packages",
            stderr: "npm ERR! code E401\nauthorization: secret\nnpm verbose config //registry.example/:_authToken=secret-value",
          };
        },
        async node() { throw new Error("not reached"); },
      };
      const code = await runInstaller(verbose ? [...exactTarget, "--verbose"] : exactTarget, {
        stdout: stdout.stream, stderr: stderr.stream, runner, platform: process.platform,
        environment: { PATH: process.env.PATH ?? "" }, handleSignals: false,
      });
      return { code, stdout: stdout.read(), stderr: stderr.read() };
    };
    expect(await run(false)).toEqual({ code: 1, stdout: "", stderr: "installation failed: registry authentication failed\n" });
    const verbose = await run(true);
    expect(verbose.stderr).toContain("installation failed: registry authentication failed\nDetails: npm ERR! code E401");
    expect(verbose.stderr).not.toContain("secret");
    expect(verbose.stderr).toContain("_authToken=[redacted]");
  });
});

describe("installer package manifest", () => {
  it("has no runtime dependencies, funding metadata, or lifecycle scripts", async () => {
    const manifestPath = resolve("packages/a1-install/package.json");
    const [manifest, applicationManifest, installerLicense, applicationLicense] = await Promise.all([
      readFile(manifestPath, "utf8").then(JSON.parse),
      readFile(resolve("package.json"), "utf8").then(JSON.parse),
      readFile(resolve("packages/a1-install/LICENSE"), "utf8"),
      readFile(resolve("LICENSE"), "utf8"),
    ]);
    expect(manifest.name).toBe("@timurproko/a1-install");
    expect(Object.entries(manifest.bin)).toEqual([["a1-install", "bin/a1-install.js"]]);
    expect(manifest.dependencies).toBeUndefined();
    expect(manifest.optionalDependencies).toBeUndefined();
    expect(manifest.peerDependencies).toBeUndefined();
    expect(manifest.funding).toBeUndefined();
    expect(manifest.scripts).toBeUndefined();
    expect(manifest.version).toBe(applicationManifest.version);
    expect(installerLicense).toBe(applicationLicense);
  });
});
