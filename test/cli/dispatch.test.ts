import { describe, expect, it, vi } from "vitest";
import { CLI_USAGE, dispatchCli, parseCliCommand } from "../../src/cli/index.js";
import type { InteractiveLaunchIntent } from "../../src/features/launch/index.js";

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
    [["install", "npm:pi-mcp-adapter"], { kind: "packages", request: { verb: "install", source: "npm:pi-mcp-adapter" } }],
    [["remove", "npm:pi-mcp-adapter"], { kind: "packages", request: { verb: "remove", source: "npm:pi-mcp-adapter" } }],
    [["uninstall", "npm:pi-mcp-adapter"], { kind: "packages", request: { verb: "remove", source: "npm:pi-mcp-adapter" } }],
    [["list"], { kind: "packages", request: { verb: "list", source: null } }],
    [["update", "--extensions"], { kind: "packages", request: { verb: "update", source: null } }],
    [["update", "npm:pi-mcp-adapter"], { kind: "packages", request: { verb: "update", source: "npm:pi-mcp-adapter" } }],
    [["update", "--models"], { kind: "packages", request: { verb: "refresh-models", source: null } }],
  ] as const)("parses %j", (arguments_, expected) => {
    expect(parseCliCommand(arguments_)).toEqual(expected);
  });

  it("gives remove and its uninstall alias the same request", () => {
    expect(parseCliCommand(["uninstall", "npm:x"])).toEqual(parseCliCommand(["remove", "npm:x"]));
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
    }, { stderr: vi.fn() });

    expect(result).toBe(17);
    expect(launch).toHaveBeenCalledOnce();
    expect(launch.mock.calls[0]?.[0]).toMatchObject({
      kind: "interactive",
      profile: { id: profileId, terminalCapability },
    });
  });

  it("dispatches a package command without launching a profile", async () => {
    const commands = { ...handlers(), packages: vi.fn(async () => 3) };
    expect(await dispatchCli(["install", "npm:pi-mcp-adapter"], commands, { stderr: vi.fn() })).toBe(3);
    expect(commands.packages).toHaveBeenCalledWith({ verb: "install", source: "npm:pi-mcp-adapter" });
    expect(commands.launch).not.toHaveBeenCalled();
    expect(commands.update).not.toHaveBeenCalled();
  });

  it("keeps bare update on self-update rather than packages", async () => {
    const commands = handlers();
    expect(await dispatchCli(["update"], commands, { stderr: vi.fn() })).toBe(0);
    expect(commands.update).toHaveBeenCalledWith("stable");
    expect(commands.packages).not.toHaveBeenCalled();
  });

  it.each([
    { arguments_: ["update", "next"], guidance: "a1 update:next" },
    { arguments_: ["update", "stable"], guidance: "a1 update" },
  ])("keeps the channel word $arguments_ off the package path", async ({ arguments_, guidance }) => {
    const commands = handlers();
    const stderr = vi.fn();
    expect(await dispatchCli(arguments_, commands, { stderr })).toBe(2);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining(`run ${guidance}`));
    expect(commands.packages).not.toHaveBeenCalled();
    expect(commands.update).not.toHaveBeenCalled();
  });

  it("refuses to update the pinned Pi and points at updating A1 itself", async () => {
    const commands = handlers();
    const stderr = vi.fn();
    expect(await dispatchCli(["update", "pi"], commands, { stderr })).toBe(2);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("pins the Pi version"));
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("a1 update"));
    expect(commands.update).not.toHaveBeenCalled();
    expect(commands.packages).not.toHaveBeenCalled();
  });

  it.each([
    { arguments_: ["install", "pi"] },
    { arguments_: ["install", "sandbox"] },
    { arguments_: ["install", "--profile", "pi"] },
    { arguments_: ["list", "sandbox"] },
  ])("refuses a profile on package command $arguments_", async ({ arguments_ }) => {
    const commands = handlers();
    const stderr = vi.fn();
    expect(await dispatchCli(arguments_, commands, { stderr })).toBe(2);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("manages packages in its own profile"));
    expect(commands.packages).not.toHaveBeenCalled();
  });

  it("rejects the removed ui alias without running another profile", async () => {
    const commands = handlers();
    const stderr = vi.fn();

    expect(await dispatchCli(["ui"], commands, { stderr })).toBe(2);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("ui subcommand was removed"));
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining(CLI_USAGE));
    expect(commands.launch).not.toHaveBeenCalled();
  });

  it("rejects agent with bare-agent guidance before any handler runs", async () => {
    const commands = handlers();
    const stderr = vi.fn();
    expect(await dispatchCli(["agent"], commands, { stderr })).toBe(2);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("Bare a1 is the A1 agent experience"));
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining(CLI_USAGE));
    expect(commands.launch).not.toHaveBeenCalled();
  });

  it.each([
    { arguments_: ["unknown"] },
    { arguments_: ["pi", "extra"] },
    { arguments_: ["sandbox", "extra"] },
    { arguments_: ["ui", "extra"] },
    { arguments_: ["install"] },
    { arguments_: ["remove"] },
    { arguments_: ["install", "npm:one", "npm:two"] },
    { arguments_: ["install", "--local", "npm:one"] },
    { arguments_: ["update", "--all"] },
    { arguments_: ["update", "npm:one", "npm:two"] },
  ])("rejects invalid grammar $arguments_ without shell or child dispatch", async ({ arguments_ }) => {
    const commands = handlers();
    expect(await dispatchCli(arguments_, commands, { stderr: vi.fn() })).toBe(2);
    expect(commands.launch).not.toHaveBeenCalled();
    expect(commands.packages).not.toHaveBeenCalled();
    expect(JSON.stringify(parseCliCommand(arguments_))).not.toMatch(/shell|cmd\.exe|sh -c/i);
  });

  it("names every supported form in usage", () => {
    for (const form of ["install <source>", "remove <source>", "list", "update:next"]) {
      expect(CLI_USAGE).toContain(form);
    }
  });
});
