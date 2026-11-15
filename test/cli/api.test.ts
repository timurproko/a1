import { describe, expect, it, vi } from "vitest";
import { runApiCommand } from "../../src/cli/api.js";
import { parseCliCommand } from "../../src/cli/dispatch.js";
const DEVELOPMENT_CLI_CAPABILITIES = { developmentComparison: true };

async function invoke(args: string[]) {
  const stdout = vi.fn(); const code = await runApiCommand(args, { stdout, environment: {} });
  expect(stdout).toHaveBeenCalledTimes(1);
  const text = stdout.mock.calls[0]![0] as string;
  expect(text.endsWith("\n")).toBe(true); expect(text.split("\n")).toHaveLength(2);
  return { code, response: JSON.parse(text) };
}
describe("public API process contract", () => {
  it("uses one JSON operation selector", () => {
    expect(parseCliCommand(["api", "{}"], DEVELOPMENT_CLI_CAPABILITIES)).toEqual({ kind: "api", arguments: ["{}"] });
  });
  it("discovers without a home, Core or runtime", async () => {
    expect(await invoke([JSON.stringify({ version: 1, id: "discover", type: "capabilities" })])).toMatchObject({ code: 0,
      response: { version: 1, id: "discover", type: "response", command: "capabilities", success: true } });
  });
  it.each([[], ["{}", "{}"], ["not-json"], ["x".repeat(4097)], ["null"]].map(args => ({ args })))("bounds malformed invocations", async ({ args }) => {
    expect(await invoke(args)).toMatchObject({ code: 1, response: { success: false, error: { code: "invalid-request" } } });
  });
});
