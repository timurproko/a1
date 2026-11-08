import { detectCapabilities } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { TERMINAL_IDENTITY_VARIABLES } from "../support/terminal-environment.js";

describe("neutral test terminal", () => {
  it("starts every worker without terminal-identity variables", () => {
    expect(TERMINAL_IDENTITY_VARIABLES.filter(name => process.env[name] !== undefined)).toEqual([]);
  });

  it("detects no image protocol and no terminal-specific hyperlinks", () => {
    const capabilities = detectCapabilities(() => false);
    expect(capabilities.images).toBeNull();
    // Platform: a Windows console keeps hyperlinks off unless Windows Terminal was identified.
    expect(capabilities.hyperlinks).toBe(false);
  });
});
