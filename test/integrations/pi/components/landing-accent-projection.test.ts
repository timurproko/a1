import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyPiTheme, piCanvasBackgroundAnsi, piTheme, setPiAccentColor } from "../../../../src/integrations/pi/components/index.js";

// Invariant: the native landing paints the wordmark, the footer-placed cwd and version, and its
// canvas with the same colors an Agent tab derives; its pinned table lives in this fixture, which
// the Rust test also asserts against its own copy.
const fixture = JSON.parse(readFileSync(
  path.join(import.meta.dirname, "../../../../native/terminal-host/src/roles/landing_accents.json"),
  "utf8",
)) as {
  readonly dim: readonly number[];
  readonly darkCanvas: readonly number[];
  readonly accents: Readonly<Record<string, {
    readonly accent: readonly number[];
    readonly border: readonly number[];
    readonly canvas: readonly number[];
  }>>;
};

const ACCENTS = ["purple", "blue", "cyan", "green", "orange", "pink"] as const;

function rgb(sequence: string | null): number[] {
  const match = sequence === null ? null : /^\u001b\[[34]8;2;(\d+);(\d+);(\d+)m$/.exec(sequence);
  if (match === null) throw new Error(`not a truecolor color: ${JSON.stringify(sequence)}`);
  return match.slice(1).map(Number);
}

describe("landing accent projection", () => {
  afterEach(() => setPiAccentColor("purple"));

  it("pins every accent's dark accent, border, and canvas, and the footer dim", () => {
    applyPiTheme("dark", false, "truecolor");
    // Invariant: the landing draws its cwd and version in the footer's `dim`, so they match the Agent's.
    expect(rgb(piTheme().getFgAnsi("dim"))).toEqual(fixture.dim);
    expect(Object.keys(fixture.accents).sort()).toEqual([...ACCENTS].sort());
    for (const accent of ACCENTS) {
      setPiAccentColor(accent);
      const theme = piTheme();
      expect({
        accent: rgb(theme.getFgAnsi("accent")),
        border: rgb(theme.getFgAnsi("border")),
        canvas: rgb(piCanvasBackgroundAnsi("accent")),
      }, accent).toEqual(fixture.accents[accent]);
      expect(rgb(piCanvasBackgroundAnsi("dark")), accent).toEqual(fixture.darkCanvas);
      expect(piCanvasBackgroundAnsi("transparent")).toBeNull();
    }
  });
});
