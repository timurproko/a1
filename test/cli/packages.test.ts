import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Chalk } from "chalk";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  runPackageCommand,
  type PackageCommandRequest,
  type PackageCommandStyle,
} from "../../src/cli/index.js";
import {
  agentPackageOutcome,
  type AgentPackageOutcome,
  type AgentPackagesPort,
  type AgentPackagesPortInput,
} from "../../src/contracts/agent-engine/index.js";

const roots: string[] = [];
const transcriptStyle: PackageCommandStyle = new Chalk({ level: 1 });
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

async function home(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "a1-package-command-"));
  roots.push(root);
  return root;
}

interface Harness {
  readonly code: number;
  readonly out: string;
  readonly error: string;
  readonly input: AgentPackagesPortInput | undefined;
  readonly calls: readonly string[];
}

async function run(
  request: PackageCommandRequest,
  outcome: AgentPackageOutcome,
  profileHome: string,
  progress?: string,
): Promise<Harness> {
  const out: string[] = [];
  const error: string[] = [];
  const calls: string[] = [];
  let input: AgentPackagesPortInput | undefined;
  const createPort = (portInput: AgentPackagesPortInput): AgentPackagesPort => {
    input = portInput;
    const record = (name: AgentPackageOutcome["operation"]) => async (): Promise<AgentPackageOutcome> => {
      calls.push(name);
      if (progress !== undefined) portInput.onProgress?.({ operation: name, message: progress });
      return outcome;
    };
    return {
      capabilities: { install: true, remove: true, update: true, refreshModels: true },
      profileRoot: portInput.profileRoot,
      list: record("list"),
      install: record("install"),
      remove: record("remove"),
      update: record("update"),
      refreshModels: record("refresh-models"),
    };
  };
  const code = await runPackageCommand(request, {
    createPort,
    cwd: profileHome,
    environment: { A1_PROFILE_HOME: profileHome },
    stdout: message => out.push(message),
    stderr: message => error.push(message),
    style: transcriptStyle,
  });
  return { code, out: out.join(""), error: error.join(""), input, calls };
}

describe("A1 package commands", () => {
  it("runs against the A1 profile root and creates it when absent", async () => {
    const profileHome = await home();
    const harness = await run({ verb: "install", source: "npm:pi-mcp-adapter" }, agentPackageOutcome("install", "completed", null, "npm:pi-mcp-adapter"), profileHome);

    const profileRoot = resolve(profileHome, ".a1", "agent");
    expect(harness.code).toBe(0);
    expect(harness.input?.profileRoot).toBe(profileRoot);
    expect(existsSync(resolve(profileRoot, "extensions"))).toBe(true);
    expect(existsSync(resolve(profileHome, ".pi"))).toBe(false);
  });

  it.each([
    {
      name: "install",
      request: { verb: "install", source: "npm:pi-mcp-adapter" },
      outcome: agentPackageOutcome("install", "completed", null, "npm:pi-mcp-adapter"),
      progress: "Installing npm:pi-mcp-adapter...",
      expected: `${transcriptStyle.dim("Installing npm:pi-mcp-adapter...\n")}${transcriptStyle.green("Installed npm:pi-mcp-adapter")}\n`,
    },
    {
      name: "remove and uninstall",
      request: { verb: "remove", source: "npm:pi-mcp-adapter" },
      outcome: agentPackageOutcome("remove", "completed", null, "npm:pi-mcp-adapter"),
      progress: "Removing npm:pi-mcp-adapter...",
      expected: `${transcriptStyle.dim("Removing npm:pi-mcp-adapter...\n")}${transcriptStyle.green("Removed npm:pi-mcp-adapter")}\n`,
    },
    {
      name: "update every package",
      request: { verb: "update", source: null },
      outcome: agentPackageOutcome("update", "completed"),
      progress: undefined,
      expected: `${transcriptStyle.green("Updated packages")}\n`,
    },
    {
      name: "update one package",
      request: { verb: "update", source: "npm:pi-mcp-adapter" },
      outcome: agentPackageOutcome("update", "completed", null, "npm:pi-mcp-adapter"),
      progress: undefined,
      expected: `${transcriptStyle.green("Updated npm:pi-mcp-adapter")}\n`,
    },
  ] as const)("matches pinned Pi's $name transcript", async ({ request, outcome, progress, expected }) => {
    const profileHome = await home();
    const harness = await run(request, outcome, profileHome, progress);

    expect(harness.out).toBe(expected);
    expect(harness.error).toBe("");
  });

  it.each([
    { request: { verb: "list", source: null }, call: "list" },
    { request: { verb: "update", source: null }, call: "update" },
    { request: { verb: "refresh-models", source: null }, call: "refresh-models" },
    { request: { verb: "remove", source: "npm:x" }, call: "remove" },
  ] as const)("routes $request.verb to the port", async ({ request, call }) => {
    const profileHome = await home();
    const harness = await run(request, agentPackageOutcome(call === "refresh-models" ? "refresh-models" : call, "completed"), profileHome);
    expect(harness.calls).toEqual([call]);
    expect(harness.code).toBe(0);
  });

  it("matches pinned Pi's empty-list transcript", async () => {
    const profileHome = await home();
    const harness = await run({ verb: "list", source: null }, agentPackageOutcome("list", "completed"), profileHome);

    expect(harness.out).toBe(`${transcriptStyle.dim("No packages installed.")}\n`);
    expect(harness.error).toBe("");
    expect(harness.code).toBe(0);
  });

  it("matches pinned Pi's populated-list layout and styles", async () => {
    const profileHome = await home();
    const outcome = agentPackageOutcome("list", "completed", null, null, [
      { source: "npm:pi-mcp-adapter", installedPath: "/somewhere/pi-mcp-adapter", filtered: false },
      { source: "npm:filtered", installedPath: "/somewhere/filtered", filtered: true },
    ]);
    const harness = await run({ verb: "list", source: null }, outcome, profileHome);

    expect(harness.out).toBe(
      `${transcriptStyle.bold("User packages:")}\n`
      + "  npm:pi-mcp-adapter\n"
      + `${transcriptStyle.dim("    /somewhere/pi-mcp-adapter")}\n`
      + "  npm:filtered (filtered)\n"
      + `${transcriptStyle.dim("    /somewhere/filtered")}\n`,
    );
    expect(harness.error).toBe("");
  });

  it("matches pinned Pi's package-manager failure transcript", async () => {
    const profileHome = await home();
    const harness = await run(
      { verb: "install", source: "npm:pi-mcp-adapter" },
      agentPackageOutcome("install", "failed", "npm could not be run", "npm:pi-mcp-adapter"),
      profileHome,
    );

    expect(harness.code).toBe(1);
    expect(harness.error).toBe(`${transcriptStyle.red("Error: npm could not be run")}\n`);
    expect(harness.out).toBe("");
  });

  it("distinguishes a source that is not installed here", async () => {
    const profileHome = await home();
    const harness = await run(
      { verb: "remove", source: "npm:absent" },
      agentPackageOutcome("remove", "not-found", null, "npm:absent"),
      profileHome,
    );

    expect(harness.code).toBe(1);
    expect(harness.error).toBe(`${transcriptStyle.red("No matching package found for npm:absent")}\n`);
    expect(harness.out).toBe("");
  });

  it("reports a profile that cannot be prepared without calling the port", async () => {
    const profileHome = await home();
    const error: string[] = [];
    const createPort = vi.fn();
    const code = await runPackageCommand({ verb: "list", source: null }, {
      createPort: createPort as unknown as (input: AgentPackagesPortInput) => AgentPackagesPort,
      cwd: profileHome,
      environment: { A1_PROFILE_HOME: profileHome },
      stdout: () => undefined,
      stderr: message => error.push(message),
      initializeProfile: async () => { throw new Error("permission denied"); },
    });

    expect(code).toBe(1);
    expect(error.join("")).toContain("permission denied");
    expect(createPort).not.toHaveBeenCalled();
  });
});
