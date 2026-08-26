import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Pi-boundary manual candidate checkpoint", () => {
  it("provides user-controlled commands without claiming workstation automation", async () => {
    const document = await readFile("docs/manual-pi-boundary-candidate.md", "utf8");
    for (const value of [
      "Bare owned UI", "Extension surfaces", "Vanilla oracle", "Resize and input", "Shutdown", "Recovery",
      "& $Candidate pi", "READY, MANUAL EXECUTION PENDING",
    ]) expect(document).toContain(value);
    expect(document).toContain("Do not automate it on an active workstation");
    expect(document).not.toMatch(/manual execution (?:passed|complete)/i);
  });
});
