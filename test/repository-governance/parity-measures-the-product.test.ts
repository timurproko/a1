import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Parity is worth something only while it measures the composition the product
 * actually runs, with A1's own surfaces withheld. A parity run built beside the
 * product measures itself and passes forever, so these are the things that must
 * stay true of it.
 */
const RUNNER = readFileSync("scripts/run-pi-terminal-parity.mjs", "utf8");
const LAUNCHER = readFileSync("bin/a1-ui.js", "utf8");
const COMPOSITION = readFileSync("src/composition/index.ts", "utf8");

describe("what the parity run measures", () => {
  it("launches the product's own entry point", () => {
    expect(RUNNER).toContain(`resolve(packageRoot, "bin", "a1-ui.js")`);
  });

  it("launches it with A1's own surfaces withheld", () => {
    expect(RUNNER).toContain(`A1_OWNED_SURFACES: "off"`);
  });

  it("reaches the same composition the product uses, rather than one of its own", () => {
    expect(LAUNCHER).toContain("composeOwnedUi");
    expect(LAUNCHER).toContain("A1_OWNED_SURFACES");
    // Withholding the surfaces is a switch inside that composition, not a second one.
    expect(COMPOSITION).toContain(`options.ownedSurfaces === "off"`);
  });

  it("withholds the surfaces by withholding the route they are reached through", () => {
    // Every owned surface is reachable only through the route host, so this is
    // the whole of what "off" means — no second list to keep in step.
    expect(COMPOSITION).toMatch(/const routeHost = settings === null \|\| options\.ownedSurfaces === "off" \? null :/);
  });

  it("keeps no notion of a checkpoint that is allowed to differ", () => {
    for (const word of ["superseded", "excluded", "skipCheckpoint", "forgive"]) {
      expect(RUNNER.toLowerCase(), `the parity runner mentions ${word}`).not.toContain(word.toLowerCase());
    }
  });
});
