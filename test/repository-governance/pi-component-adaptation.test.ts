import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

interface AdaptationRecord {
  readonly schema: string;
  readonly package: { readonly name: string; readonly version: string; readonly license: string };
  readonly publicComponentAdaptations: readonly {
    readonly surface: string;
    readonly publicExport: string;
    readonly ownedInput: string;
    readonly ownedOutput: string;
  }[];
  readonly ports: readonly unknown[];
  readonly portPolicy: string;
}

describe("Pi component adaptation policy", () => {
  it("records public surfaces and proves no unrecorded source ports were introduced", async () => {
    const value = JSON.parse(await readFile(
      "openspec/changes/build-owned-pi-ui-foundation/evidence/pi-component-adaptation.json",
      "utf8",
    )) as AdaptationRecord;

    expect(value.schema).toBe("addone-pi-component-adaptation-v1");
    expect(value.package).toMatchObject({
      name: "@earendil-works/pi-coding-agent",
      license: "MIT",
    });
    expect(value.package.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(value.publicComponentAdaptations.map(surface => surface.publicExport)).toEqual([
      "UserMessageComponent",
      "AssistantMessageComponent",
      "ToolExecutionComponent",
    ]);
    for (const surface of value.publicComponentAdaptations) {
      expect(surface.ownedInput).toContain("OwnedUiTranscriptBlock");
      expect(surface.ownedOutput).toBe("readonly string[]");
    }
    expect(value.ports).toEqual([]);
    expect(value.portPolicy).toContain("exact source");
    expect(value.portPolicy).toContain("conformance coverage");
  });
});
