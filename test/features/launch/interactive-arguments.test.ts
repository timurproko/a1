import { describe, expect, it } from "vitest";
import { interactiveLaunchIntent, parseInteractiveLaunchArguments } from "../../../src/features/launch/index.js";
import { interactiveStartupArguments } from "../../../src/foundation/launch-context/index.js";
import { cliCapabilities, dispatchCli, parseCliCommand } from "../../../src/cli/index.js";

const capabilities = cliCapabilities("1.0.0");
describe("invocation startup argv", () => {
  it.each(["blue", "green", "orange", "pink", "purple", "cyan", "grey"])("round-trips %s through frozen intent and literal child argv", color => {
    const selection = ["--session-dir", "D:/literal's store", "--session", "history"];
    const prompt = ["--session-color", "pink", "quote ' and spaces", "$(not-shell)"];
    const command = parseCliCommand([...selection, "--session-color", color, "--", ...prompt], capabilities);
    expect(command).toMatchObject({ kind: "launch", profileId: "a1", sessionColor: color, promptArguments: prompt });
    if (command.kind !== "launch") throw new Error("expected launch");
    const intent = interactiveLaunchIntent(command.profileId, command.sessionSelection, command);
    expect(Object.isFrozen(intent)).toBe(true);
    expect(parseInteractiveLaunchArguments([...selection, ...interactiveStartupArguments(intent)])).toMatchObject({ sessionColor: color, promptArguments: prompt });
    expect(parseInteractiveLaunchArguments(["--session-color", color, ...selection])).toMatchObject({ sessionColor: color, sessionSelection: command.sessionSelection });
  });
  it.each([
    ["--session-color"], ["--session-color", "bad"], ["--session-color", "--"],
    ["--session-color", "blue", "--session-color", "green"], ["--session-dir", "dir", "--session-color", "blue"],
    ["--session-color", "blue", "--unknown", "value"],
  ].map(args => ({ args })))("rejects $args before any handler can launch", async ({ args }) => {
    expect(parseCliCommand(args, capabilities).kind).toBe("error");
    let launches = 0;
    const unused = async () => { launches++; return 0; };
    expect(await dispatchCli(args, { launch: unused, update: unused, packages: unused, version: unused, sessionContext: unused }, { stdout() {}, stderr() {} }, capabilities)).toBe(2);
    expect(launches).toBe(0);
  });
  it("protects the first boundary and retains unsupported leading words", () => {
    expect(parseCliCommand(["--", "--session-color", "pink"], capabilities)).toMatchObject({ kind: "launch", promptArguments: ["--session-color", "pink"] });
    for (const args of [["pi", "--session-color", "blue"], ["prompt", "--session-color", "blue"], ["--unknown"], ["solo", "--"]]) {
      expect(parseCliCommand(args, capabilities)).toEqual({ kind: "noop" });
    }
    expect(() => interactiveLaunchIntent("pi", undefined, { sessionColor: "green" })).toThrow();
    expect(() => parseInteractiveLaunchArguments(["--", "bad\0prompt"])).toThrow();
  });
});
