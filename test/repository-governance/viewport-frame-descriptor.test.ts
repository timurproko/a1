import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const SOURCE = new URL("../../src/ui/components/transcript-viewport.ts", import.meta.url);

describe("viewport frame descriptor architecture", () => {
  it("derives shift metadata from neutral geometry and semantic ranges only", async () => {
    const source = await readFile(SOURCE, "utf8");
    const start = source.indexOf("const nextDocumentRange =");
    const end = source.indexOf("const hits: TranscriptViewportHitRegions", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const descriptor = source.slice(start, end);
    expect(descriptor).toContain("previousDocumentRange");
    expect(descriptor).toContain("verticalShiftRows");
    expect(descriptor).toContain("safeVerticalShift");
    expect(descriptor).toContain("selectionRevision");
    expect(descriptor).toContain("selectionDamagedRows");
    expect(descriptor).not.toMatch(/stripAnsi|visibleWidth|ANSI|OSC|SGR|instanceof|\.constructor|component|@earendil|#pi-tui/u);
  });

  it("keeps the neutral viewport free of Pi runtime and component imports", async () => {
    const source = await readFile(SOURCE, "utf8");
    const imports = source.split("\n").filter(line => line.startsWith("import ")).join("\n");
    expect(imports).not.toMatch(/integrations\/pi|@earendil|#pi-tui|coding-agent/u);
    expect(source).toContain('from "./scrollbar.js"');
    expect(source).toContain('from "./text-selection.js"');
  });
});
