import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ADDONE_USAGE, parseAddOneCommand } from "../../src/cli/dispatch.js";

describe("owned UI launch documentation", () => {
  it("keeps bare, oracle, sandbox, and removed-ui guidance consistent with CLI dispatch", async () => {
    const [readme, profiles, checkpoint] = await Promise.all([
      readFile("README.md", "utf8"),
      readFile("docs/features/launch-profiles.md", "utf8"),
      readFile("docs/manual-transparent-checkpoint.md", "utf8"),
    ]);
    for (const document of [readme, profiles]) {
      expect(document).toContain("AddOne-owned");
      expect(document).toMatch(/a1 pi[^\n]*(untouched|vanilla)/i);
      expect(document).toMatch(/a1 sandbox[^\n]*(unchanged|isolated)/i);
      expect(document).toMatch(/a1 ui[^\n]*remove/i);
    }
    expect(checkpoint).toContain("Compare bare AddOne with `a1 pi`");
    expect(checkpoint).toContain("For recovery, use `a1 pi`");
    expect(ADDONE_USAGE).toBe("Usage: a1 | a1 pi | a1 sandbox | a1 version | a1 update | a1 update:next");
    expect(parseAddOneCommand(["ui"])).toEqual({
      kind: "error",
      message: "The ui subcommand was removed; run bare a1 or addone for the owned UI.",
    });
  });
});
