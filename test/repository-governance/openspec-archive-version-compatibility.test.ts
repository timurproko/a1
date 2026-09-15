import { describe, expect, it } from "vitest";
import { parseImplementation } from "../../scripts/governance/openspec-archive-policy.mjs";

const change = "compatibility-check";
const invalidLegacyValues = [null, 0, false, ""] as const;
const framed = (json: string) => `\`\`\`openspec-implementation\n${json}\n\`\`\``;

// Invariant: a forbidden property remains present even when its value is falsey.
describe("archive metadata version compatibility", () => {
  it.each(invalidLegacyValues)("rejects a present version-2 legacy field valued %j", specificationPr => {
    const body = framed(JSON.stringify({ version: 2, change, specificationPr }));
    expect(() => parseImplementation(body)).toThrow("metadata-fields");
  });

  it.each(invalidLegacyValues)("rejects invalid version-1 linkage valued %j", specificationPr => {
    const body = framed(JSON.stringify({ version: 1, change, specificationPr }));
    expect(() => parseImplementation(body)).toThrow("specification-pr");
  });

  it.each([
    { version: 3, change },
    { version: 3, change, archive: `openspec/changes/archive/2026-09-15-${change}/`,
      acceptanceManifest: `openspec/changes/archive/2026-09-15-${change}/acceptance.md` },
    { version: 2, change },
    { version: 1, change, specificationPr: 137 },
  ])("preserves a valid version-$version link", value => {
    expect(parseImplementation(framed(JSON.stringify(value)))).toEqual(value);
  });

  it.each(invalidLegacyValues)("rejects a present version-3 legacy field valued %j", specificationPr => {
    const body = framed(JSON.stringify({ version: 3, change, specificationPr }));
    expect(() => parseImplementation(body)).toThrow("metadata-fields");
  });

  it("rejects the forbidden field after decoding its JSON-escaped name", () => {
    const json = String.raw`{"version":2,"change":"compatibility-check","specification\u0050r":0}`;
    expect(json).toContain(String.raw`\u0050`);
    expect(JSON.parse(json)).toEqual({ version: 2, change, specificationPr: 0 });
    expect(() => parseImplementation(framed(json))).toThrow("metadata-fields");
  });
});
