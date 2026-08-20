import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { inspectProductIdentifiers, inspectTypeScript } from "../../scripts/product-identifier-policy.mjs";

describe("repository-global semantic identifier inventory", () => {
  it("reproduces the checked inventory and preserves the cleanup baseline", async () => {
    const evidence = JSON.parse(await readFile("evidence/pi-api-boundary/product-identifier-inventory.json", "utf8"));
    const current = await inspectProductIdentifiers(".");
    expect(current).toEqual({
      schema: evidence.schema,
      roots: evidence.roots,
      internalIdentifiers: evidence.internalIdentifiers,
      externalIdentityIdentifiers: evidence.externalIdentityIdentifiers,
    });
    expect(evidence.baselineInternalIdentifiers.length).toBeGreaterThan(0);
  });

  it("classifies external identity keys separately from internal ownership names", () => {
    const result = inspectTypeScript("fixture.ts", `
      const A1OwnedThing = 1;
      const a1Client = A1OwnedThing;
      const value = environment.A1_RUNTIME_DIR;
      const env = { A1_DATA_DIR: "path" };
    `);
    expect(result.internal.map(value => value.identifier)).toEqual(["A1OwnedThing", "a1Client", "A1OwnedThing"]);
    expect(result.external.map(value => value.identifier)).toEqual(["A1_RUNTIME_DIR", "A1_DATA_DIR"]);
  });
});
