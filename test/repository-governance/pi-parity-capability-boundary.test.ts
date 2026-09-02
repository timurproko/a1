import { readFile, readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const DETERMINISTIC_PRODUCERS = [
  "test/features/owned-ui/pi-static-parity-fixture.ts",
  "test/features/owned-ui/pi-event-frame-parity-fixture.ts",
  "test/features/owned-ui/pinned-settings-presentation-parity.test.ts",
  "test/features/owned-ui/pi-raw-terminal-parity.test.ts",
  "test/integrations/pi/components/pinned-theme-parity.test.ts",
] as const;

describe("Pi parity capability boundary", () => {
  it("uses only the canonical public Pi-TUI capability identity", async () => {
    const helper = await readFile("test/support/pi-terminal-capabilities.ts", "utf8");
    expect(helper).toMatch(/from "#pi-tui"/u);
    expect(helper).not.toMatch(/@earendil-works|node_modules|terminal-image/u);
  });

  it("keeps capability overrides out of production", async () => {
    const paths = (await readdir("src", { recursive: true }))
      .filter(path => path.endsWith(".ts"))
      .map(path => `src/${path.replaceAll("\\", "/")}`);
    const sources = await Promise.all(paths.map(async path => await readFile(path, "utf8")));
    expect(sources.join("\n")).not.toMatch(/pi-terminal-capabilities|\bsetCapabilities\s*\(/u);
  });

  it("keeps deterministic producers non-concurrent and independent of host color hints", async () => {
    const sources = await Promise.all(DETERMINISTIC_PRODUCERS.map(async path => await readFile(path, "utf8")));
    for (const source of sources) {
      expect(source).not.toMatch(/it\.concurrent|describe\.concurrent/u);
      expect(source).not.toMatch(/COLORTERM|FORCE_COLOR|A1_RELEASE_RUNNER_LABEL|process\.platform|process\.env\.TERM/u);
    }
  });

  it("does not force a color mode in the release workflow", async () => {
    const workflow = await readFile(".github/workflows/release.yml", "utf8");
    expect(workflow).not.toMatch(/COLORTERM|FORCE_COLOR/u);
  });
});
