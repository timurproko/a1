import { describe, expect, it, vi } from "vitest";
import { cliCapabilities, cliHelp, cliUsage, dispatchCli, parseCliCommand } from "../../src/cli/index.js";
import type { InteractiveLaunchIntent } from "../../src/features/launch/index.js";

const PRERELEASE = cliCapabilities("0.1.1-dev.12");
const RELEASE = cliCapabilities("0.1.1");

function handlers() {
  return {
    launch: vi.fn(async () => 0),
    version: vi.fn(async () => 0),
    update: vi.fn(async () => 0),
    packages: vi.fn(async () => 0),
  };
}

function output() {
  return { stdout: vi.fn<(message: string) => void>(), stderr: vi.fn<(message: string) => void>() };
}

describe("A1 CLI dispatch", () => {
  it.each([
    [[], { kind: "launch", profileId: "a1" }],
    [["pi"], { kind: "launch", profileId: "pi" }],
    [["--help"], { kind: "help" }],
    [["-h"], { kind: "help" }],
    [["--version"], { kind: "version" }],
    [["-v"], { kind: "version" }],
    [["update"], { kind: "update", channel: "stable" }],
    [["update", "--develop"], { kind: "update", channel: "next" }],
    [["update", "--develop", "107"], { kind: "update", channel: "next", target: "107" }],
    [["update", "--develop", "0.1.8-dev.107"], { kind: "update", channel: "next", target: "0.1.8-dev.107" }],
    [["pi", "install", "npm:pi-mcp-adapter"], { kind: "packages", request: { verb: "install", source: "npm:pi-mcp-adapter" } }],
    [["pi", "remove", "npm:pi-mcp-adapter"], { kind: "packages", request: { verb: "remove", source: "npm:pi-mcp-adapter" } }],
    [["pi", "uninstall", "npm:pi-mcp-adapter"], { kind: "packages", request: { verb: "remove", source: "npm:pi-mcp-adapter" } }],
    [["pi", "list"], { kind: "packages", request: { verb: "list", source: null } }],
    [["pi", "update", "--extensions"], { kind: "packages", request: { verb: "update", source: null } }],
    [["pi", "update", "npm:pi-mcp-adapter"], { kind: "packages", request: { verb: "update", source: "npm:pi-mcp-adapter" } }],
    [["update", "--models"], { kind: "packages", request: { verb: "refresh-models", source: null } }],
    [["pi", "update", "--models"], { kind: "packages", request: { verb: "refresh-models", source: null } }],
  ] as const)("parses %j", (arguments_, expected) => {
    expect(parseCliCommand(arguments_, PRERELEASE)).toEqual(expected);
  });

  it("gives aliases the same typed requests", () => {
    expect(parseCliCommand(["pi", "uninstall", "npm:x"], PRERELEASE)).toEqual(parseCliCommand(["pi", "remove", "npm:x"], PRERELEASE));
    expect(parseCliCommand(["pi", "update", "--models"], PRERELEASE)).toEqual(parseCliCommand(["update", "--models"], PRERELEASE));
  });

  it.each([
    { arguments_: [] as const, profileId: "a1" },
    { arguments_: ["pi"] as const, profileId: "pi" },
  ] as const)("dispatches interactive form $arguments_ as a typed intent", async ({ arguments_, profileId }) => {
    const launch = vi.fn(async (_intent: InteractiveLaunchIntent) => 17);
    const result = await dispatchCli(arguments_, { ...handlers(), launch }, output(), PRERELEASE);

    expect(result).toBe(17);
    expect(launch).toHaveBeenCalledOnce();
    expect(launch.mock.calls[0]?.[0]).toMatchObject({ kind: "interactive", profileId });
  });

  it("prints help only when explicitly requested", async () => {
    for (const argument of ["--help", "-h"] as const) {
      const commands = handlers();
      const transcript = output();
      expect(await dispatchCli([argument], commands, transcript, PRERELEASE)).toBe(0);
      expect(transcript.stdout).toHaveBeenCalledWith(cliHelp(PRERELEASE));
      expect(transcript.stderr).not.toHaveBeenCalled();
      expectNoHandler(commands);
    }
  });

  it.each([
    ["update", "stable", undefined],
    ["update --develop", "next", undefined],
    ["update --develop 107", "next", "107"],
    ["update --develop 0.1.8-dev.107", "next", "0.1.8-dev.107"],
  ] as const)("dispatches %s to self-update", async (form, channel, target) => {
    const commands = handlers();
    expect(await dispatchCli(form.split(" "), commands, output(), PRERELEASE)).toBe(0);
    expect(commands.update).toHaveBeenCalledWith(channel, target);
    expect(commands.packages).not.toHaveBeenCalled();
  });

  it("dispatches package operations without launching a profile", async () => {
    const commands = { ...handlers(), packages: vi.fn(async () => 3) };
    expect(await dispatchCli(["pi", "install", "npm:pi-mcp-adapter"], commands, output(), PRERELEASE)).toBe(3);
    expect(commands.packages).toHaveBeenCalledWith({ verb: "install", source: "npm:pi-mcp-adapter" });
    expect(commands.launch).not.toHaveBeenCalled();
    expect(commands.update).not.toHaveBeenCalled();
  });

  it.each([
    ["unknown"],
    ["sdjjhd"],
    ["version"],
    ["ui"],
    ["agent"],
    ["help"],
    ["install", "npm:x"],
    ["remove", "npm:x"],
    ["list"],
    ["config"],
    ["update", "self"],
    ["update", "self", "extra"],
    ["update", "npm:x"],
    ["update:develop"],
    ["update:develop", "107"],
    ["update:107"],
    ["update:0.1.8-dev.107"],
    ["update:next"],
    ["update:"],
    ["pi", "extra"],
    ["pi", "config"],
  ])("silently ignores unsupported grammar %j", async (...arguments_) => {
    const commands = handlers();
    const transcript = output();
    expect(await dispatchCli(arguments_, commands, transcript, PRERELEASE)).toBe(0);
    expect(transcript.stdout).not.toHaveBeenCalled();
    expect(transcript.stderr).not.toHaveBeenCalled();
    expectNoHandler(commands);
    expect(parseCliCommand(arguments_, PRERELEASE)).toEqual({ kind: "noop" });
  });

  it.each([
    ["update", "--develop", "0"],
    ["update", "--develop", "0.1.8"],
    ["update", "--develop", "7eabe9e"],
    ["update", "--develop", "107", "108"],
    ["update", "--develop", "107", "--models"],
    ["update", "--develop", "--models"],
    ["update", "--models", "extra"],
    ["update", "--all"],
    ["--help", "extra"],
    ["--version", "extra"],
    ["-v", "extra"],
    ["pi", "install"],
    ["pi", "remove"],
    ["pi", "install", "npm:one", "npm:two"],
    ["pi", "install", "-l", "npm:one"],
    ["pi", "update", "npm:one", "npm:two"],
    ["pi", "update", "--extension"],
  ])("rejects malformed recognized grammar %j without help or dispatch", async (...arguments_) => {
    const commands = handlers();
    const transcript = output();
    expect(await dispatchCli(arguments_, commands, transcript, PRERELEASE)).toBe(2);
    expect(transcript.stderr).toHaveBeenCalledOnce();
    expect(transcript.stderr.mock.calls[0]?.[0]).not.toContain("Usage:");
    expect(transcript.stdout).not.toHaveBeenCalled();
    expectNoHandler(commands);
    expect(JSON.stringify(parseCliCommand(arguments_, PRERELEASE))).not.toMatch(/shell|cmd\.exe|sh -c/i);
  });

  it.each([
    ["update", "pi"],
    ["pi", "update"],
    ["pi", "update", "pi"],
    ["pi", "update", "self"],
    ["pi", "update", "--self"],
    ["pi", "update", "--all"],
  ])("refuses pinned Pi update form %j with focused alternatives", async (...arguments_) => {
    const commands = handlers();
    const transcript = output();
    expect(await dispatchCli(arguments_, commands, transcript, PRERELEASE)).toBe(2);
    const message = transcript.stderr.mock.calls[0]?.[0] ?? "";
    expect(message).toContain("pins its certified Pi runtime");
    expect(message).toContain("a1 update");
    expect(message).toContain("a1 pi update --extensions");
    expect(message).toContain("a1 pi update --models");
    expect(message).not.toContain("Usage:");
    expectNoHandler(commands);
  });

  it.each([
    ["pi", "install", "pi"],
    ["pi", "install", "--profile", "pi"],
  ])("refuses a profile on package command %j", async (...arguments_) => {
    const commands = handlers();
    const transcript = output();
    expect(await dispatchCli(arguments_, commands, transcript, PRERELEASE)).toBe(2);
    expect(transcript.stderr).toHaveBeenCalledWith(expect.stringContaining("manages packages in its own profile"));
    expectNoHandler(commands);
  });

  it("advertises exactly the implemented command design", () => {
    const usage = cliUsage(PRERELEASE);
    const help = cliHelp(PRERELEASE);
    expect(help).toMatch(/^Common:\n/);
    expect(help).toContain("\nUpdate:\n");
    expect(help).toContain("\nPi-compatible packages:\n");
    expect(help).not.toContain("Update A1:");
    expect(help).not.toContain("Pi-compatible packages for A1:");
    for (const form of [
      "--help",
      "-h",
      "--version",
      "-v",
      "update --develop [preview-or-version]",
      "update --models",
      "pi install <source>",
      "pi uninstall <source>",
      "pi update --extensions",
      "pi update --models",
      "pi update <source>",
    ]) expect(usage).toContain(form);
    expect(usage).not.toContain("update:");
    expect(usage).not.toContain("pi config");
    expect(usage).not.toContain(" -l");
  });
});

describe("A1 CLI dispatch in a release build", () => {
  it("silently ignores the unavailable Pi comparison launch", async () => {
    const commands = handlers();
    const transcript = output();
    expect(await dispatchCli(["pi"], commands, transcript, RELEASE)).toBe(0);
    expect(transcript.stdout).not.toHaveBeenCalled();
    expect(transcript.stderr).not.toHaveBeenCalled();
    expectNoHandler(commands);
  });

  it("keeps the comparison launch out of help but retains package commands", () => {
    expect(cliHelp(RELEASE)).not.toContain("\n  a1 pi\n");
    expect(cliHelp(RELEASE)).toContain("a1 pi install <source>");
    expect(cliHelp(PRERELEASE)).toContain("\n  a1 pi\n");
  });

  it.each([
    { arguments_: [] as const },
    { arguments_: ["--help"] as const },
    { arguments_: ["-h"] as const },
    { arguments_: ["--version"] as const },
    { arguments_: ["-v"] as const },
    { arguments_: ["update"] as const },
    { arguments_: ["update", "--develop"] as const },
    { arguments_: ["pi", "list"] as const },
    { arguments_: ["pi", "install", "npm:x"] as const },
    { arguments_: ["pi", "remove", "npm:x"] as const },
    { arguments_: ["update", "--models"] as const },
    { arguments_: ["pi", "update", "--models"] as const },
  ])("parses supported maintenance form $arguments_ identically", ({ arguments_ }) => {
    expect(parseCliCommand(arguments_, RELEASE)).toEqual(parseCliCommand(arguments_, PRERELEASE));
  });
});

function expectNoHandler(commands: ReturnType<typeof handlers>): void {
  expect(commands.launch).not.toHaveBeenCalled();
  expect(commands.version).not.toHaveBeenCalled();
  expect(commands.update).not.toHaveBeenCalled();
  expect(commands.packages).not.toHaveBeenCalled();
}
