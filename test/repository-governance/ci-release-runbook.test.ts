import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("CI and release operations runbook", () => {
  it("documents stable required checks and live workflow producers", async () => {
    const runbook = await readFile("docs/ci-release-runbook.md", "utf8");
    for (const name of ["Development validation required", "Stable candidate required"]) expect(runbook).toContain(`\`${name}\``);
    const references = [...runbook.matchAll(/`(\.github\/workflows\/[^`]+\.yml)`/g)].map(match => match[1]);
    expect(references.length).toBeGreaterThanOrEqual(2);
    await Promise.all(references.map(path => access(path)));
  });

  it("covers widening, approvals, expiry, recovery, physical isolation, and rollback", async () => {
    const runbook = await readFile("docs/ci-release-runbook.md", "utf8");
    for (const required of [
      "full: true",
      "npm-next",
      "npm-stable",
      "expire after 14 days",
      "expire after 30 days",
      "PHYSICAL_WORKER_ISOLATED=true",
      "Never run physical host probes on a developer workstation",
      "Never upload locally rebuilt bytes",
      "Ruleset mutation is a separate administrative operation",
      "maintainer explicitly confirms",
    ]) expect(runbook).toContain(required);
  });

  it("states that rollback never permits publishing rebuilt bytes", async () => {
    const runbook = await readFile("docs/ci-release-runbook.md", "utf8");
    expect(runbook).toContain("Never route around certification by rebuilding inside a publisher");
    expect(runbook).toContain("publication still requires exact certified bytes");
  });
});
