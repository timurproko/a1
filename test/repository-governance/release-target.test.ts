import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseReleaseArguments, ReleaseUsageError, resolveReleasePlan } from "../../scripts/release/release-target.mjs";

describe("explicit prerelease-aware release targets", () => {
  it.each([
    ["0.1.8-dev", "patch", "0.1.8", "0.1.9-dev"],
    ["0.1.8-dev.123", "patch", "0.1.8", "0.1.9-dev"],
    ["0.1.8-rc.1", "patch", "0.1.8", "0.1.9-dev"],
    ["0.1.8", "patch", "0.1.9", "0.1.10-dev"],
    ["0.1.8-dev", "minor", "0.2.0", "0.2.1-dev"],
    ["0.1.8-dev", "major", "1.0.0", "1.0.1-dev"],
    ["0.2.0-dev", "minor", "0.3.0", "0.3.1-dev"],
    ["1.0.0-dev", "major", "2.0.0", "2.0.1-dev"],
    ["0.1.8-dev", "0.4.0", "0.4.0", "0.4.1-dev"],
    ["0.1.8", "0.1.8", "0.1.8", "0.1.9-dev"],
    ["0.1.8-dev+build.1", "patch", "0.1.8", "0.1.9-dev"],
  ])("resolves %s with %s to %s, then %s", (current, target, version, opening) => {
    expect(resolveReleasePlan(current, [target])).toEqual({ current, version, opening });
  });

  it.each([[], [""], ["--patch"], ["prepatch"], ["latest"], ["0.4"], ["v0.4.0"], ["00.4.0"],
    ["0.4.0-dev"], ["0.4.0+build"], ["patch", "minor"], ["0.4.0", "extra"]])("rejects unsupported arguments %j", (...args) => {
    expect(() => parseReleaseArguments(args)).toThrow(ReleaseUsageError);
  });

  it.each([undefined, null, "", "broken", "v0.1.8", "01.1.8", "0.1", " 0.1.8", "0.1.8 ", "0.1.8-dev.01"])("rejects malformed current version %j", current => {
    expect(() => resolveReleasePlan(current, ["patch"])).toThrow(ReleaseUsageError);
  });

  it.each(["README.md", "docs/ci-release-runbook.md"])("keeps the %s examples aligned with the resolver and manual gates", async path => {
    const text = await readFile(path, "utf8");
    const examples = [...text.matchAll(/^npm run release -- (\S+) +# (\S+) -> ([^\s;]+)/gmu)];
    expect(examples).toHaveLength(3);
    for (const match of examples) expect(resolveReleasePlan(match[2], [match[1]!]).version).toBe(match[3]);
    expect(text).toContain("already-stable 0.1.8 -> 0.1.9");
    expect(text).toContain("0.1.9-dev");
    expect(text).toMatch(/[Aa] target is required/);
    expect(text).toMatch(/merge (?:it )?manually/u);
    expect(text).not.toMatch(/self-merging|merge themselves/u);
  });
});
