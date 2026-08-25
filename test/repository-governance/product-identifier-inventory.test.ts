import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { inspectProductIdentifiers, inspectTypeScript } from "../../scripts/governance/product-identifier-policy.mjs";

describe("repository-global semantic identifier inventory", () => {
  it("reproduces the checked inventory and preserves the cleanup baseline", async () => {
    const evidence = JSON.parse(await readFile("config/baselines/product-identifier-inventory.json", "utf8"));
    const current = await inspectProductIdentifiers(".");
    expect(current).toEqual({
      schema: evidence.schema,
      roots: evidence.roots,
      internalIdentifiers: evidence.internalIdentifiers,
      externalIdentityIdentifiers: evidence.externalIdentityIdentifiers,
    });
    expect(evidence.baselineInternalIdentifiers.length).toBeGreaterThan(0);
  });

  it("rejects product-prefixed class, variable, field, and constant mutations", () => {
    const result = inspectTypeScript("mutation.ts", `
      class A1Runtime {}
      const a1Client = new A1Runtime();
      const A1_INTERNAL_CACHE = {};
      const record = { a1Manifest: a1Client };
    `);
    expect(result.internal.map(value => value.identifier)).toEqual([
      "A1Runtime", "a1Client", "A1Runtime", "A1_INTERNAL_CACHE", "a1Manifest", "a1Client",
    ]);
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
