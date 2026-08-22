import { describe, expect, it, vi } from "vitest";
import { CLI_USAGE, dispatchCli, parseCliCommand } from "../../src/cli/index.js";
import type { InteractiveLaunchIntent } from "../../src/features/launch/index.js";

describe("A1 CLI dispatch", () => {
  it.each([
    [[], { kind: "launch", profileId: "a1" }],
    [["pi"], { kind: "launch", profileId: "pi" }],
    [["sandbox"], { kind: "launch", profileId: "sandbox" }],
    [["version"], { kind: "version" }],
    [["update"], { kind: "update", channel: "stable" }],
    [["update:next"], { kind: "update", channel: "next" }],
  ] as const)("parses %j", (arguments_, expected) => {
    expect(parseCliCommand(arguments_)).toEqual(expected);
  });

  it.each([
    { arguments_: [] as const, profileId: "a1", terminalCapability: "owned-ui" },
    { arguments_: ["pi"] as const, profileId: "pi", terminalCapability: "owned-ui" },
    { arguments_: ["sandbox"] as const, profileId: "sandbox", terminalCapability: "owned-ui" },
  ] as const)("dispatches interactive form $arguments_ as a typed intent", async ({ arguments_, profileId, terminalCapability }) => {
    const launch = vi.fn(async (_intent: InteractiveLaunchIntent) => 17);
    const result = await dispatchCli(arguments_, {
      launch,
      version: vi.fn(async () => 0),
      update: vi.fn(async () => 0),
    }, { stderr: vi.fn() });

    expect(result).toBe(17);
    expect(launch).toHaveBeenCalledOnce();
    expect(launch.mock.calls[0]?.[0]).toMatchObject({
      kind: "interactive",
      profile: { id: profileId, terminalCapability },
    });
  });

  it("rejects the removed ui alias without running another profile", async () => {
    const handlers = {
      launch: vi.fn(async () => 0),
      version: vi.fn(async () => 0),
      update: vi.fn(async () => 0),
    };
    const stderr = vi.fn();

    expect(await dispatchCli(["ui"], handlers, { stderr })).toBe(2);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("ui subcommand was removed"));
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining(CLI_USAGE));
    expect(handlers.launch).not.toHaveBeenCalled();
  });

  it("rejects agent with bare-agent guidance before any handler runs", async () => {
    const handlers = {
      launch: vi.fn(async () => 0),
      version: vi.fn(async () => 0),
      update: vi.fn(async () => 0),
    };
    const stderr = vi.fn();
    expect(await dispatchCli(["agent"], handlers, { stderr })).toBe(2);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("Bare a1 is the A1 agent experience"));
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining(CLI_USAGE));
    expect(handlers.launch).not.toHaveBeenCalled();
  });

  it.each([
    { arguments_: ["unknown"] },
    { arguments_: ["pi", "extra"] },
    { arguments_: ["sandbox", "extra"] },
    { arguments_: ["ui", "extra"] },
  ])("rejects invalid grammar $arguments_ without shell or child dispatch", async ({ arguments_ }) => {
    const handlers = {
      launch: vi.fn(async () => 0),
      version: vi.fn(async () => 0),
      update: vi.fn(async () => 0),
    };
    expect(await dispatchCli(arguments_, handlers, { stderr: vi.fn() })).toBe(2);
    expect(handlers.launch).not.toHaveBeenCalled();
    expect(JSON.stringify(parseCliCommand(arguments_))).not.toMatch(/shell|cmd\.exe|sh -c/i);
  });
});
