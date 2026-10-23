import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyPiTheme, piTheme, setPiAccentColor } from "../../../../src/integrations/pi/components/index.js";

// Invariant: the native landing paints the wordmark and box rules with the same dark accent and
// border the owned editor derives; its pinned table lives in this fixture, which the Rust test
// also asserts against its own copy.
const fixture = JSON.parse(readFileSync(
  path.join(import.meta.dirname, "../../../../native/terminal-host/src/roles/landing_accents.json"),
  "utf8",
)) as { readonly accents: Readonly<Record<string, { readonly accent: readonly number[]; readonly border: readonly number[] }>> };

const ACCENTS = ["purple", "blue", "cyan", "green", "orange", "pink"] as const;

function rgb(sequence: string): number[] {
  const match = /^\u001b\[38;2;(\d+);(\d+);(\d+)m$/.exec(sequence);
  if (match === null) throw new Error(`not a truecolor foreground: ${JSON.stringify(sequence)}`);
  return match.slice(1).map(Number);
}

describe("landing accent projection", () => {
  afterEach(() => setPiAccentColor("purple"));

  it("pins every accent's dark accent and border foregrounds", () => {
    applyPiTheme("dark", false, "truecolor");
    expect(Object.keys(fixture.accents).sort()).toEqual([...ACCENTS].sort());
    for (const accent of ACCENTS) {
      setPiAccentColor(accent);
      const theme = piTheme();
      expect({ accent: rgb(theme.getFgAnsi("accent")), border: rgb(theme.getFgAnsi("border")) }, accent)
        .toEqual(fixture.accents[accent]);
    }
  });
});
