import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { cliCapabilities } from "../../src/cli/capabilities.js";
import { cliUsage, parseCliCommand } from "../../src/cli/dispatch.js";

const prerelease = cliCapabilities("0.1.1-dev.12");
const release = cliCapabilities("0.1.1");

describe("owned UI launch documentation", () => {
  it("keeps bare, oracle, sandbox, and removed-ui guidance consistent with CLI dispatch", async () => {
    const [profiles, checkpoint] = await Promise.all([
      readFile("docs/features/launch-profiles.md", "utf8"),
      readFile("docs/manual-transparent-checkpoint.md", "utf8"),
    ]);
    expect(profiles).toContain("A1-owned");
    expect(profiles).toMatch(/a1 pi[^\n]*(untouched|vanilla)/i);
    expect(profiles).toMatch(/a1 sandbox[^\n]*(unchanged|isolated)/i);
    expect(profiles).toMatch(/a1 ui[^\n]*remove/i);
    expect(checkpoint).toContain("Compare bare A1 with `a1 pi`");
    expect(checkpoint).toContain("For recovery, use `a1 pi`");
    expect(cliUsage(prerelease)).toBe(
      "Usage: a1 | a1 pi | a1 sandbox | a1 version | a1 update [self|<source>|--extensions|--models]"
      + " | a1 update:next | a1 update:<commit> | a1 install <source> | a1 remove <source> | a1 list",
    );
    expect(cliUsage(release)).toBe(
      "Usage: a1 | a1 version | a1 update [self|<source>|--extensions|--models]"
      + " | a1 update:next | a1 update:<commit> | a1 install <source> | a1 remove <source> | a1 list",
    );
    expect(parseCliCommand(["ui"], prerelease)).toEqual({
      kind: "error",
      message: "The ui subcommand was removed; run bare a1 for the owned UI.",
    });
  });
});
