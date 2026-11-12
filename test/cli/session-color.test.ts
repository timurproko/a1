import { describe, expect, it, vi } from "vitest";
import { runSessionColorCommand } from "../../src/cli/session-color.js";
import { cliCapabilities, dispatchCli, parseCliCommand } from "../../src/cli/index.js";

async function run(args: readonly string[], environment = {}) {
  const lines: string[] = [];
  const code = await runSessionColorCommand(args, { environment, stdout: text => lines.push(text) });
  expect(lines).toHaveLength(1);
  return { code, json: JSON.parse(lines[0]!) };
}

describe("always-JSON session color commands", () => {
  it("lists ordered colors without a running session or a JSON flag", async () => {
    expect(await run(["list"])).toEqual({ code: 0, json: { colors: ["blue", "green", "orange", "pink", "purple", "cyan", "grey"] } });
    expect(cliCapabilities("1.0.0").sessionColors).toBe(true);
  });
  it.each([
    [[], "invalid-request"], [["get"], "session-required"], [["set", "grey"], "session-required"],
    [["set", "automatic"], "invalid-color"], [["get", "--session", "prefix"], "invalid-session"],
    [["list", "--json"], "invalid-request"], [["get", "--session", "one", "--session", "two"], "invalid-request"],
  ] as const)("returns one JSON error for %j", async (args, error) => {
    expect(await run(args)).toMatchObject({ code: 2, json: { error: { code: error } } });
  });
  it("routes only the dedicated namespace and keeps parser errors in the JSON handler", async () => {
    const capabilities = cliCapabilities("1.0.0");
    expect(parseCliCommand(["session", "color", "get", "--bad"], capabilities)).toEqual({ kind: "session-color", arguments: ["get", "--bad"] });
    const sessionColor = vi.fn(async () => 2);
    const unused = vi.fn(async () => 0);
    await dispatchCli(["session", "color", "list"], { sessionColor, launch: unused, version: unused, update: unused, packages: unused, sessionContext: unused }, { stdout() {}, stderr() {} }, capabilities);
    expect(sessionColor).toHaveBeenCalledWith(["list"]);
    expect(unused).not.toHaveBeenCalled();
  });
});
