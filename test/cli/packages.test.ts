import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runPackageCommand, type PackageCommandRequest } from "../../src/cli/index.js";
import {
  agentPackageOutcome,
  type AgentPackageOutcome,
  type AgentPackagesPort,
  type AgentPackagesPortInput,
} from "../../src/foundation/agent-engine-contracts/index.js";

const roots: string[] = [];
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
): Promise<Harness> {
  const out: string[] = [];
  const error: string[] = [];
  const calls: string[] = [];
  let input: AgentPackagesPortInput | undefined;
  const record = (name: string) => async (): Promise<AgentPackageOutcome> => {
    calls.push(name);
    return outcome;
  };
  const createPort = (portInput: AgentPackagesPortInput): AgentPackagesPort => {
    input = portInput;
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
    expect(existsSync(resolve(profileHome, ".a1", "sandbox"))).toBe(false);
  });

  it("says a running session needs a restart after an install", async () => {
    const profileHome = await home();
    const harness = await run({ verb: "install", source: "npm:pi-mcp-adapter" }, agentPackageOutcome("install", "completed", null, "npm:pi-mcp-adapter"), profileHome);

    expect(harness.out).toContain("installed npm:pi-mcp-adapter");
    expect(harness.out).toContain("Restart a1");
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

  it("reports an empty profile plainly rather than printing nothing", async () => {
    const profileHome = await home();
    const harness = await run({ verb: "list", source: null }, agentPackageOutcome("list", "completed"), profileHome);
    expect(harness.out).toContain("no packages installed");
    expect(harness.code).toBe(0);
  });

  it("lists each package with where it is installed", async () => {
    const profileHome = await home();
    const outcome = agentPackageOutcome("list", "completed", null, null, [
      { source: "npm:pi-mcp-adapter", installedPath: "/somewhere/pi-mcp-adapter", filtered: false },
    ]);
    const harness = await run({ verb: "list", source: null }, outcome, profileHome);
    expect(harness.out).toContain("npm:pi-mcp-adapter");
    expect(harness.out).toContain("/somewhere/pi-mcp-adapter");
  });

  it("fails with the reported reason and A1's own voice", async () => {
    const profileHome = await home();
    const harness = await run(
      { verb: "install", source: "npm:pi-mcp-adapter" },
      agentPackageOutcome("install", "failed", "npm could not be run", "npm:pi-mcp-adapter"),
      profileHome,
    );

    expect(harness.code).toBe(1);
    expect(harness.error).toContain("npm could not be run");
    expect(harness.error).toContain("A1");
    expect(harness.error).not.toMatch(/\bpi (install|remove|update|list)\b/);
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
    expect(harness.error).toContain("no package matching npm:absent");
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
