import { describe, expect, it, vi } from "vitest";
import { cliCapabilities, cliUsage, dispatchCli, parseCliCommand } from "../../src/cli/index.js";
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

describe("A1 CLI dispatch", () => {
  it.each([
    [[], { kind: "launch", profileId: "a1" }],
    [["pi"], { kind: "launch", profileId: "pi" }],
    [["sandbox"], { kind: "launch", profileId: "sandbox" }],
    [["version"], { kind: "version" }],
    [["update"], { kind: "update", channel: "stable" }],
    [["update", "self"], { kind: "update", channel: "stable" }],
    [["update:next"], { kind: "update", channel: "next" }],
    [["update:7eabe9e"], { kind: "update", channel: "next", target: "7eabe9e" }],
    [["update:0.1.8-dev.7eabe9e"], { kind: "update", channel: "next", target: "0.1.8-dev.7eabe9e" }],
    [["pi", "install", "npm:pi-mcp-adapter"], { kind: "packages", request: { verb: "install", source: "npm:pi-mcp-adapter" } }],
    [["pi", "remove", "npm:pi-mcp-adapter"], { kind: "packages", request: { verb: "remove", source: "npm:pi-mcp-adapter" } }],
    [["pi", "uninstall", "npm:pi-mcp-adapter"], { kind: "packages", request: { verb: "remove", source: "npm:pi-mcp-adapter" } }],
    [["pi", "list"], { kind: "packages", request: { verb: "list", source: null } }],
    [["pi", "update", "--extensions"], { kind: "packages", request: { verb: "update", source: null } }],
    [["pi", "update", "npm:pi-mcp-adapter"], { kind: "packages", request: { verb: "update", source: "npm:pi-mcp-adapter" } }],
    [["update", "--models"], { kind: "packages", request: { verb: "refresh-models", source: null } }],
  ] as const)("parses %j", (arguments_, expected) => {
    expect(parseCliCommand(arguments_, PRERELEASE)).toEqual(expected);
  });

  it("gives remove and its uninstall alias the same request", () => {
    expect(parseCliCommand(["pi", "uninstall", "npm:x"], PRERELEASE)).toEqual(parseCliCommand(["pi", "remove", "npm:x"], PRERELEASE));
  });

  it.each([
    { arguments_: [] as const, profileId: "a1", terminalCapability: "owned-ui" },
    { arguments_: ["pi"] as const, profileId: "pi", terminalCapability: "owned-ui" },
    { arguments_: ["sandbox"] as const, profileId: "sandbox", terminalCapability: "owned-ui" },
  ] as const)("dispatches interactive form $arguments_ as a typed intent", async ({ arguments_, profileId, terminalCapability }) => {
    const launch = vi.fn(async (_intent: InteractiveLaunchIntent) => 17);
    const result = await dispatchCli(arguments_, {
      ...handlers(),
      launch,
    }, { stderr: vi.fn() }, PRERELEASE);

    expect(result).toBe(17);
    expect(launch).toHaveBeenCalledOnce();
    expect(launch.mock.calls[0]?.[0]).toMatchObject({
      kind: "interactive",
      profile: { id: profileId, terminalCapability },
    });
  });

  it("dispatches a package command without launching a profile", async () => {
    const commands = { ...handlers(), packages: vi.fn(async () => 3) };
    expect(await dispatchCli(["pi", "install", "npm:pi-mcp-adapter"], commands, { stderr: vi.fn() }, PRERELEASE)).toBe(3);
    expect(commands.packages).toHaveBeenCalledWith({ verb: "install", source: "npm:pi-mcp-adapter" });
    expect(commands.launch).not.toHaveBeenCalled();
    expect(commands.update).not.toHaveBeenCalled();
  });

  it("keeps bare update on self-update rather than packages", async () => {
    const commands = handlers();
    expect(await dispatchCli(["update"], commands, { stderr: vi.fn() }, PRERELEASE)).toBe(0);
    expect(commands.update).toHaveBeenCalledWith("stable", undefined);
    expect(commands.packages).not.toHaveBeenCalled();
  });

  it.each([
    { arguments_: ["update", "next"], guidance: "a1 update:next" },
    { arguments_: ["update", "stable"], guidance: "a1 update" },
  ])("keeps the channel word $arguments_ off the package path", async ({ arguments_, guidance }) => {
    const commands = handlers();
    const stderr = vi.fn();
    expect(await dispatchCli(arguments_, commands, { stderr }, PRERELEASE)).toBe(2);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining(`run ${guidance}`));
    expect(commands.packages).not.toHaveBeenCalled();
    expect(commands.update).not.toHaveBeenCalled();
  });

  it("refuses to update the pinned Pi and points at updating A1 itself", async () => {
    const commands = handlers();
    const stderr = vi.fn();
    expect(await dispatchCli(["update", "pi"], commands, { stderr }, PRERELEASE)).toBe(2);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("pins the Pi version"));
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("a1 update"));
    expect(commands.update).not.toHaveBeenCalled();
    expect(commands.packages).not.toHaveBeenCalled();
  });

  it.each([
    { arguments_: ["pi", "install", "pi"] },
    { arguments_: ["pi", "install", "sandbox"] },
    { arguments_: ["pi", "install", "--profile", "pi"] },
    { arguments_: ["pi", "list", "sandbox"] },
  ])("refuses a profile on package command $arguments_", async ({ arguments_ }) => {
    const commands = handlers();
    const stderr = vi.fn();
    expect(await dispatchCli(arguments_, commands, { stderr }, PRERELEASE)).toBe(2);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("manages packages in its own profile"));
    expect(commands.packages).not.toHaveBeenCalled();
  });

  it("rejects the removed ui alias without running another profile", async () => {
    const commands = handlers();
    const stderr = vi.fn();

    expect(await dispatchCli(["ui"], commands, { stderr }, PRERELEASE)).toBe(2);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("ui subcommand was removed"));
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining(cliUsage(PRERELEASE)));
    expect(commands.launch).not.toHaveBeenCalled();
  });

  it("rejects agent with bare-agent guidance before any handler runs", async () => {
    const commands = handlers();
    const stderr = vi.fn();
    expect(await dispatchCli(["agent"], commands, { stderr }, PRERELEASE)).toBe(2);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("Bare a1 is the A1 agent experience"));
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining(cliUsage(PRERELEASE)));
    expect(commands.launch).not.toHaveBeenCalled();
  });

  it.each([
    { arguments_: ["unknown"] },
    { arguments_: ["pi", "extra"] },
    { arguments_: ["sandbox", "extra"] },
    { arguments_: ["ui", "extra"] },
    { arguments_: ["pi", "install"] },
    { arguments_: ["pi", "remove"] },
    { arguments_: ["pi", "install", "npm:one", "npm:two"] },
    { arguments_: ["pi", "install", "--local", "npm:one"] },
    { arguments_: ["pi", "update"] },
    { arguments_: ["pi", "update", "--models"] },
    { arguments_: ["pi", "update", "--all"] },
    { arguments_: ["update", "--all"] },
    { arguments_: ["update:next", "7eabe9e"] },
    { arguments_: ["update:"] },
    { arguments_: ["update:-force"] },
    { arguments_: ["update", "npm:one", "npm:two"] },
  ])("rejects invalid grammar $arguments_ without shell or child dispatch", async ({ arguments_ }) => {
    const commands = handlers();
    expect(await dispatchCli(arguments_, commands, { stderr: vi.fn() }, PRERELEASE)).toBe(2);
    expect(commands.launch).not.toHaveBeenCalled();
    expect(commands.packages).not.toHaveBeenCalled();
    expect(JSON.stringify(parseCliCommand(arguments_, PRERELEASE))).not.toMatch(/shell|cmd\.exe|sh -c/i);
  });

  it("moves extension package commands under the pi namespace and keeps model refresh top-level", () => {
    for (const form of ["pi install <source>", "pi remove <source>", "pi list", "pi update [--extensions|<source>]", "update [self|--models]"]) {
      expect(cliUsage(PRERELEASE)).toContain(form);
    }
  });

  it.each([
    { arguments_: ["install", "npm:x"], guidance: "a1 pi install npm:x" },
    { arguments_: ["remove", "npm:x"], guidance: "a1 pi remove npm:x" },
    { arguments_: ["list"], guidance: "a1 pi list" },
    { arguments_: ["update", "--extensions"], guidance: "a1 pi update --extensions" },
    { arguments_: ["update", "npm:x"], guidance: "a1 pi update npm:x" },
  ])("rejects legacy package form $arguments_ with namespace guidance", async ({ arguments_, guidance }) => {
    const commands = handlers();
    const stderr = vi.fn();
    expect(await dispatchCli(arguments_, commands, { stderr }, PRERELEASE)).toBe(2);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining(guidance));
    expect(commands.packages).not.toHaveBeenCalled();
  });
});

describe("A1 CLI dispatch in a release build", () => {
  it.each([["pi"], ["sandbox"]])("does not recognize the %s profile", async profile => {
    const commands = handlers();
    const stderr = vi.fn();

    expect(await dispatchCli([profile], commands, { stderr }, RELEASE)).toBe(2);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining(`unknown command: ${profile}`));
    expect(commands.launch).not.toHaveBeenCalled();
  });

  it("keeps the development profiles out of usage", () => {
    expect(cliUsage(RELEASE)).not.toContain("Usage: a1 | a1 pi |");
    expect(cliUsage(RELEASE)).not.toContain("a1 sandbox");
    expect(cliUsage(RELEASE)).toContain("a1 pi install <source>");
    expect(cliUsage(PRERELEASE)).toContain("Usage: a1 | a1 pi |");
    expect(cliUsage(PRERELEASE)).toContain("a1 sandbox");
  });

  it.each([
    { arguments_: [] as const, kind: "launch" },
    { arguments_: ["version"] as const, kind: "version" },
    { arguments_: ["update"] as const, kind: "update" },
    { arguments_: ["update:next"] as const, kind: "update" },
    { arguments_: ["pi", "list"] as const, kind: "packages" },
    { arguments_: ["pi", "install", "npm:x"] as const, kind: "packages" },
    { arguments_: ["pi", "remove", "npm:x"] as const, kind: "packages" },
    { arguments_: ["update", "--models"] as const, kind: "packages" },
  ])("still parses $arguments_ the same way", ({ arguments_, kind }) => {
    expect(parseCliCommand(arguments_, RELEASE)).toEqual(parseCliCommand(arguments_, PRERELEASE));
    expect(parseCliCommand(arguments_, RELEASE).kind).toBe(kind);
  });

  it("still refuses a profile named to a package command", async () => {
    const commands = handlers();
    const stderr = vi.fn();
    expect(await dispatchCli(["pi", "install", "pi"], commands, { stderr }, RELEASE)).toBe(2);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("takes no profile"));
    expect(commands.packages).not.toHaveBeenCalled();
  });
});
