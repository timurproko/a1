import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("launch-instance documentation", () => {
  it("documents concurrent non-detachable instances and automatic tree cleanup", async () => {
    const [readme, profiles, boundaries] = await Promise.all([
      readFile("README.md", "utf8"),
      readFile("docs/features/launch-profiles.md", "utf8"),
      readFile("docs/architecture/boundaries.md", "utf8"),
    ]);
    expect(profiles).toContain("There is no product-wide foreground slot");
    expect(profiles).toContain("Closing one instance never closes another");
    expect(boundaries).toContain("plural");
    expect(`${readme}\n${profiles}\n${boundaries}`).not.toMatch(/taskkill|Stop-Process|process\.kill|rm\s+.*control\.sqlite/i);
  });
});
