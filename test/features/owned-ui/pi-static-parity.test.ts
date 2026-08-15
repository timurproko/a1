import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { buildStaticParityCases, STATIC_PARITY_COVERAGE } from "./pi-static-parity-fixture.js";

interface StaticParityFixture {
  readonly schema: string;
  readonly generatedFrom: {
    readonly sourceCommit: string;
    readonly packages: Record<string, string>;
  };
  readonly tolerance: {
    readonly ignored: readonly string[];
    readonly preserved: readonly string[];
  };
  readonly coverage: readonly string[];
  readonly cases: ReturnType<typeof buildStaticParityCases>;
}

describe("pinned Pi static component parity", () => {
  it("matches every owned shell surface at fixed widths and states", async () => {
    const fixture = JSON.parse(await readFile(
      "test/features/owned-ui/fixtures/pi-component-parity.json",
      "utf8",
    )) as StaticParityFixture;

    expect(fixture.schema).toBe("addone-pi-static-component-parity-v1");
    expect(fixture.generatedFrom.sourceCommit).toBe("53fa77ccd8a279eb87e92294ef3687b03ff80112");
    expect(fixture.generatedFrom.packages).toEqual({
      "@earendil-works/pi-coding-agent": "0.84.1",
      "@earendil-works/pi-tui": "0.84.1",
    });
    expect(fixture.tolerance).toEqual({
      ignored: ["ANSI control sequences"],
      preserved: ["visible text", "row order", "row count", "wrapping", "width truncation"],
    });
    expect(fixture.coverage).toEqual(STATIC_PARITY_COVERAGE);
    expect(buildStaticParityCases()).toEqual(fixture.cases);
  });

  it("fails coverage when any required baseline surface is absent", async () => {
    const fixture = JSON.parse(await readFile(
      "test/features/owned-ui/fixtures/pi-component-parity.json",
      "utf8",
    )) as StaticParityFixture;
    const covered = new Set(fixture.cases.flatMap(value => value.coverage));
    for (const surface of STATIC_PARITY_COVERAGE) expect(covered.has(surface), surface).toBe(true);
  });
});
