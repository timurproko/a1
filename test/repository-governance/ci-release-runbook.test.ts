import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("CI and release operations runbook", () => {
  it("documents the required check and references live workflow files", async () => {
    const runbook = await readFile("docs/ci-release-runbook.md", "utf8");
    expect(runbook).toContain("`Development validation required`");
    const references = [...runbook.matchAll(/`(\.github\/workflows\/[^`]+\.yml)`/g)].map(match => match[1]!);
    expect(references.length).toBeGreaterThanOrEqual(2);
    await Promise.all(references.map(path => access(path)));
  });

  it("keeps the exact-bytes safety rules", async () => {
    const runbook = await readFile("docs/ci-release-runbook.md", "utf8");
    expect(runbook).toContain("Never upload locally rebuilt bytes");
    expect(runbook).toContain("Never route around validation by rebuilding inside a publisher");
    expect(runbook).toContain("Never move a release tag");
  });

  it("says how each channel is published", async () => {
    const runbook = await readFile("docs/ci-release-runbook.md", "utf8");
    expect(runbook).toContain("npm run develop");
    expect(runbook).toContain("03:17 UTC");
    expect(runbook).toContain("npm run release --");
    expect(runbook).toContain("explicitly dispatches");
    expect(runbook).toContain("A push of the stable version does not publish");
  });
});
