import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  releaseDocumentationChanged,
  releaseDocumentationFindings,
} from "../../scripts/release/check-release-documentation.mjs";
import { parseReleaseArguments, RELEASE_USAGE, ReleaseUsageError, resolveReleasePlan } from "../../scripts/release/release-target.mjs";

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

  it("keeps concise README commands and detailed runbook gates aligned with release behavior", async () => {
    const [readme, runbook] = await Promise.all([
      readFile("README.md", "utf8"),
      readFile("docs/ci-release-runbook.md", "utf8"),
    ]);
    expect(releaseDocumentationFindings(readme, runbook)).toEqual([]);
    expect(RELEASE_USAGE).toContain("A target is required");
  });

  it("rejects inaccurate command examples and missing operator safeguards", async () => {
    const [readme, runbook] = await Promise.all([
      readFile("README.md", "utf8"),
      readFile("docs/ci-release-runbook.md", "utf8"),
    ]);
    expect(releaseDocumentationFindings(readme.replace("0.1.8-dev -> 0.1.8", "0.1.8-dev -> 0.1.9"), runbook))
      .toContain("README.md: inaccurate patch release example");
    const missing = releaseDocumentationFindings(readme, runbook
      .replace("A target is required", "A release target must be supplied")
      .replaceAll("0.1.9-dev", "next-development")
      .replace("Only after verified publication", "Before verified publication")
      .replace("merge it manually", "merge the reopening pull request")
      .replace("Never republish immutable bytes", "Do not publish casually"));
    expect(missing).toEqual(expect.arrayContaining([
      "docs/ci-release-runbook.md: missing target-required guidance",
      "docs/ci-release-runbook.md: missing next-development reopening example",
      "docs/ci-release-runbook.md: missing publication-before-reopening guidance",
      "docs/ci-release-runbook.md: missing manual reopening merge guidance",
      "docs/ci-release-runbook.md: missing immutable publication recovery guidance",
    ]));
  });

  it("selects semantic release checks only for the two release documents", async () => {
    expect(releaseDocumentationChanged([{ status: "M", path: "README.md" }])).toBe(true);
    expect(releaseDocumentationChanged([{ status: "R", oldPath: "README.md", path: "docs/old-readme.md" }])).toBe(true);
    expect(releaseDocumentationChanged([{ status: "M", path: "docs/ci-release-runbook.md" }])).toBe(true);
    expect(releaseDocumentationChanged([{ status: "M", path: "docs/validation.md" }])).toBe(false);
    expect(await readFile("scripts/release/run-changed-documentation.mjs", "utf8"))
      .toContain("releaseDocumentationChanged(selection.changes)");
    expect((await readFile(".github/workflows/ci.yml", "utf8")).match(/check-release-documentation\.mjs --selection/gmu))
      .toHaveLength(2);
  });
});
