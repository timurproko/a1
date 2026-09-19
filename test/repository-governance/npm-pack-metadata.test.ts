import { describe, expect, it } from "vitest";
import { MINIMUM_PACK_NPM_MAJOR, assertPackingNpm, normalizeNpmPackMetadata } from "../../scripts/release/npm-pack-metadata.mjs";

const value = { filename: "fixture-1.0.0.tgz", integrity: "sha512-fixture", shasum: "a".repeat(40), files: [] };
describe("npm pack metadata compatibility", () => {
  it("accepts exactly one npm 11 result", () => {
    expect(normalizeNpmPackMetadata([value])).toEqual(value);
  });
  it("accepts exactly one npm 12 package-keyed result", () => {
    expect(normalizeNpmPackMetadata({ "@fixture/package": value })).toEqual(value);
  });
  it("accepts the transitional bare object without weakening required identity", () => {
    expect(normalizeNpmPackMetadata(value)).toEqual(value);
  });
  it.each([null, [], [value, value], {}, { first: value, second: value }, { filename: "fixture.tgz" }, { ...value, filename: "not-tar" }, { ...value, integrity: "sha1-wrong" }, { ...value, shasum: "short" }])("rejects malformed or ambiguous metadata: %#", candidate => {
    expect(() => normalizeNpmPackMetadata(candidate)).toThrow(/npm pack returned/);
  });

  it("refuses to pack with an npm whose pack runs prepare despite --ignore-scripts", () => {
    expect(MINIMUM_PACK_NPM_MAJOR).toBe(11);
    expect(assertPackingNpm("11.13.0\n")).toBe(11);
    expect(assertPackingNpm("12.0.2")).toBe(12);
    expect(() => assertPackingNpm("10.9.9")).toThrow(/npm 10\.9\.9 runs the prepare script during pack/);
    expect(() => assertPackingNpm("")).toThrow(/readable npm version/);
  });
});
