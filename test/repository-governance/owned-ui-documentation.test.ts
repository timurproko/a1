import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { cliCapabilities } from "../../src/cli/capabilities.js";
import { cliUsage, parseCliCommand } from "../../src/cli/dispatch.js";

const prerelease = cliCapabilities("0.1.1-dev.12");
const release = cliCapabilities("0.1.1");

describe("owned UI launch documentation", () => {
  it("keeps bare, comparison, and removed-ui guidance consistent with CLI dispatch", async () => {
    const [profiles, checkpoint] = await Promise.all([
      readFile("docs/features/launch-profiles.md", "utf8"),
      readFile("docs/manual-owned-ui-checkpoint.md", "utf8"),
    ]);
    expect(profiles).toContain("A1-owned");
    expect(profiles).toMatch(/a1 pi[^\n]*(comparison|ordinary Pi profile)/i);
    expect(profiles).toMatch(/a1 ui[^\n]*remove/i);
    expect(checkpoint).toContain("Compare bare A1 with `a1 pi`");
    expect(checkpoint).toContain("Both commands use the same A1-owned rendering and input pipeline");
    expect(checkpoint).toContain("For recovery, use `a1 pi`");
    expect(cliUsage(prerelease)).toBe(
      "Usage: a1 | a1 pi | a1 --version | a1 update [self|--models]"
      + " | a1 update:develop | a1 update:<number> | a1 pi install <source> | a1 pi remove <source>"
      + " | a1 pi list | a1 pi update [--extensions|<source>]",
    );
    expect(cliUsage(release)).toBe(
      "Usage: a1 | a1 --version | a1 update [self|--models]"
      + " | a1 update:develop | a1 update:<number> | a1 pi install <source> | a1 pi remove <source>"
      + " | a1 pi list | a1 pi update [--extensions|<source>]",
    );
    expect(parseCliCommand(["ui"], prerelease)).toEqual({
      kind: "error",
      message: "The ui subcommand was removed; run bare a1 for the owned UI.",
    });
  });
});
