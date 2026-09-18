import { describe, expect, it } from "vitest";
import { carriesProvenanceHeader, renderProvenanceHeader, splitProvenanceHeader } from "../../scripts/pi/pinned-pi-source-header.mjs";

const upstream = {
  commit: "914cf1472e715297caa30db4b9535d534a9eb718",
  license: "MIT",
  packages: [{ name: "@earendil-works/pi-coding-agent", version: "0.84.2" }],
};
const record = {
  id: "pi-coding-agent:src/modes/interactive/components/countdown-timer",
  package: "@earendil-works/pi-coding-agent",
  upstreamPath: "packages/coding-agent/src/modes/interactive/components/countdown-timer.ts",
  modifications: "Mechanical source port with ECMAScript private fields; imports remain on the public Pi TUI package root.",
  approvedDeviations: [{ id: "countdown-owned-private-fields" }],
};

describe("pinned Pi source header", () => {
  it("renders the package, version, license, commit, path, wrapped modifications, and deviation ids", () => {
    expect(renderProvenanceHeader(record, upstream)).toBe([
      "/**",
      " * Provenance: @earendil-works/pi-coding-agent 0.84.2 (MIT), commit 914cf1472e715297caa30db4b9535d534a9eb718,",
      " * packages/coding-agent/src/modes/interactive/components/countdown-timer.ts.",
      " * Modifications: Mechanical source port with ECMAScript private fields; imports remain on the public",
      " * Pi TUI package root.",
      " * Deviations: countdown-owned-private-fields.",
      " */",
      "",
    ].join("\n"));
    expect(renderProvenanceHeader({ ...record, approvedDeviations: [] }, upstream)).toContain(" * Deviations: none.\n");
    expect(() => renderProvenanceHeader({ ...record, package: "@earendil-works/pi-tui" }, upstream)).toThrow("header has no package identity");
  });

  it("splits a leading provenance comment of either style from the body and leaves other comments alone", () => {
    const block = "/**\n * Adapted from @earendil-works/pi-tui 0.84.2, packages/tui/src/kill-ring.ts (MIT).\n */\n/**\n * Ring buffer.\n */\nexport class KillRing {}\n";
    expect(splitProvenanceHeader(block)).toEqual({
      header: "/**\n * Adapted from @earendil-works/pi-tui 0.84.2, packages/tui/src/kill-ring.ts (MIT).\n */\n",
      body: "/**\n * Ring buffer.\n */\nexport class KillRing {}\n",
    });
    const lines = "// Mechanically adapted from Pi commit 914cf14\n// packages/coding-agent/src/x.ts (MIT).\n\nimport { a } from \"b\";\n";
    expect(splitProvenanceHeader(lines)).toEqual({ header: "// Mechanically adapted from Pi commit 914cf14\n// packages/coding-agent/src/x.ts (MIT).\n", body: "import { a } from \"b\";\n" });
    const plain = "/** Coordinates fixture state. */\nexport class Plain {}\n";
    expect(splitProvenanceHeader(plain)).toEqual({ header: "", body: plain });
    expect(splitProvenanceHeader("import { a } from \"b\";\n")).toEqual({ header: "", body: "import { a } from \"b\";\n" });
  });

  it("only source files carry a header", () => {
    expect(carriesProvenanceHeader("src/integrations/pi/components/upstream/theme/theme.ts")).toBe(true);
    expect(carriesProvenanceHeader("src/integrations/pi/components/upstream/assets/earendil-image.json")).toBe(false);
  });
});
