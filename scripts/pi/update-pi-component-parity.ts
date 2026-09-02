import { writeFile } from "node:fs/promises";
import identity from "../../src/product-identity.json" with { type: "json" };
import {
  buildStaticParityCases,
  STATIC_PARITY_COLOR_MODE,
  STATIC_PARITY_COVERAGE,
} from "../../test/features/owned-ui/pi-static-parity-fixture.js";

const output = {
  schema: identity.evidence.piComponentParitySchema,
  generatedFrom: {
    producer: "a1-diagnostic",
    evidenceAuthority: false,
    colorMode: STATIC_PARITY_COLOR_MODE,
    repository: "https://github.com/earendil-works/pi.git",
    sourceCommit: "914cf1472e715297caa30db4b9535d534a9eb718",
    packages: {
      "@earendil-works/pi-coding-agent": "0.84.2",
      "@earendil-works/pi-tui": "0.84.2",
    },
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
