import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
// @ts-expect-error — plain shipped JS module without type declarations.
import { installPinnedPiTuiResolver } from "../../bin/module-resolver.js";
import { readPinnedPiIdentity } from "../governance/pinned-pi-identity.mjs";
import identity from "../../src/product-identity.json" with { type: "json" };

// Invariant: the resolver hook must be live before any Pi module links, exactly as the bin entries and the
// Vitest setup do, so the pinned components and A1's renderer share one pi-tui identity (and one keybinding
// registry, which the pinned hints read). The fixture module is therefore imported after the hook.
installPinnedPiTuiResolver(resolve("."));
const { buildStaticParityCases, STATIC_PARITY_COLOR_MODE, STATIC_PARITY_COVERAGE } = await import("../../test/features/owned-ui/pi-static-parity-fixture.js");
const pinned = await readPinnedPiIdentity(".");

const output = {
  schema: identity.evidence.piComponentParitySchema,
  generatedFrom: {
    producer: "a1-diagnostic",
    evidenceAuthority: false,
    colorMode: STATIC_PARITY_COLOR_MODE,
    repository: "https://github.com/earendil-works/pi.git",
    sourceCommit: pinned.commit,
    packages: Object.fromEntries(pinned.packages.map(entry => [entry.name, entry.version])),
  },
  tolerance: {
    ignored: ["file hyperlink availability and absolute targets", "declared product and path substitutions"],
    preserved: ["semantic ANSI", "reset boundaries", "visible text", "row order", "row count", "wrapping", "width truncation"],
  },
  coverage: STATIC_PARITY_COVERAGE,
  cases: buildStaticParityCases(),
};

await writeFile(
  "test/features/owned-ui/fixtures/pi-component-parity.json",
  `${JSON.stringify(output, null, 2)}\n`,
);
