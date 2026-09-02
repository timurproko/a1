import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  buildStaticParityCases,
  normalizeParityRow,
  STATIC_PARITY_COLOR_MODE,
  STATIC_PARITY_COVERAGE,
} from "./pi-static-parity-fixture.js";
import {
  PI_PARITY_COLOR_MODES,
  withPiParityColorMode,
} from "../../support/pi-terminal-capabilities.js";

interface StaticParityFixture {
  readonly schema: string;
  readonly generatedFrom: {
    readonly producer: "a1-diagnostic";
    readonly evidenceAuthority: false;
    readonly colorMode: "truecolor";
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

    expect(fixture.schema).toBe("a1-pi-static-component-parity-v1");
    expect(fixture.generatedFrom.producer).toBe("a1-diagnostic");
    expect(fixture.generatedFrom.evidenceAuthority).toBe(false);
    expect(fixture.generatedFrom.colorMode).toBe(STATIC_PARITY_COLOR_MODE);
    expect(fixture.generatedFrom.sourceCommit).toBe("914cf1472e715297caa30db4b9535d534a9eb718");
    expect(fixture.generatedFrom.packages).toEqual({
      "@earendil-works/pi-coding-agent": "0.84.2",
      "@earendil-works/pi-tui": "0.84.2",
    });
    expect(fixture.tolerance).toEqual({
      ignored: ["file hyperlink availability and absolute targets", "declared product and path substitutions"],
      preserved: ["semantic ANSI", "reset boundaries", "visible text", "row order", "row count", "wrapping", "width truncation"],
    });
    expect(fixture.coverage).toEqual(STATIC_PARITY_COVERAGE);
    const portableFixture = fixture.cases.map(entry => ({ ...entry, rows: entry.rows.map(normalizeParityRow) }));
    expect(buildStaticParityCases()).toEqual(portableFixture);
  });

  it("fails coverage when any required baseline surface is absent", async () => {
    const fixture = JSON.parse(await readFile(
      "test/features/owned-ui/fixtures/pi-component-parity.json",
      "utf8",
    )) as StaticParityFixture;
    const covered = new Set(fixture.cases.flatMap(value => value.coverage));
    for (const surface of STATIC_PARITY_COVERAGE) expect(covered.has(surface), surface).toBe(true);
  });

  it("produces one truecolor diagnostic hash under opposing ambient capabilities", () => {
    const hashes = PI_PARITY_COLOR_MODES.map(ambientMode => withPiParityColorMode(ambientMode, () => createHash("sha256")
      .update(JSON.stringify({ colorMode: STATIC_PARITY_COLOR_MODE, cases: buildStaticParityCases() }))
      .digest("hex")));
    expect(new Set(hashes).size).toBe(1);
  });
});
