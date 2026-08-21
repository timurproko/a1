import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("CI and release operations runbook", () => {
  it("documents the required checks and references live workflow files", async () => {
    const runbook = await readFile("docs/ci-release-runbook.md", "utf8");
    for (const name of ["Development validation required", "Stable candidate required"]) expect(runbook).toContain(`\`${name}\``);
    const references = [...runbook.matchAll(/`(\.github\/workflows\/[^`]+\.yml)`/g)].map(match => match[1]!);
    expect(references.length).toBeGreaterThanOrEqual(2);
    await Promise.all(references.map(path => access(path)));
  });

  it("keeps the exact-bytes and physical-isolation safety rules", async () => {
    const runbook = await readFile("docs/ci-release-runbook.md", "utf8");
    expect(runbook).toContain("Never run physical host probes on a developer workstation");
    expect(runbook).toContain("Never upload locally rebuilt bytes");
    expect(runbook).toContain("never route around certification by rebuilding inside a publisher");
  });
});
