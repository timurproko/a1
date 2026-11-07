import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("resource and data classification policy", () => {
  it("defines mandatory bounded resources, outcomes, and data classes", async () => {
    const policy = await readFile("docs/architecture/resource-and-data-policy.md", "utf8");
    const requiredTerms = [
      "Diagnostic payload",
      "Fatal-exit records",
      "Evidence file",
      "Packaged release-note resource",
      "Session writer lock",
      "Backpressure must isolate",
      "Release and update state",
      "Session worktree claims",
      "Terminal content",
      "Environment values",
      "Credentials and tokens",
      "Authentication state",
      "Logs and diagnostics",
      "Never persist in A1 state or diagnostics",
      "Unknown or untyped values are potentially sensitive by default",
      "active workstation",
    ];
    for (const term of requiredTerms) expect(policy).toContain(term);
    expect(policy).not.toContain("unbounded");
  });
});
