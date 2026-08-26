import { describe, expect, it } from "vitest";
import { cliCapabilities, isPrereleaseVersion } from "../../src/cli/index.js";

describe("A1 CLI capabilities", () => {
  it.each([
    ["0.1.1-dev.12", true],
    ["0.1.1-rc.1", true],
    ["1.0.0-0", true],
    ["0.1.1", false],
    ["1.0.0", false],
    ["10.2.3", false],
  ])("reads %s as prerelease=%s", (version, expected) => {
    expect(isPrereleaseVersion(version)).toBe(expected);
    expect(cliCapabilities(version).developmentComparison).toBe(expected);
  });

  it("is frozen, so nothing can grant itself the development comparison later", () => {
    const capabilities = cliCapabilities("0.1.1");
    expect(Object.isFrozen(capabilities)).toBe(true);
    expect(() => {
      (capabilities as { developmentComparison: boolean }).developmentComparison = true;
    }).toThrow();
  });
});
