import { describe, expect, it } from "vitest";
import { normalizeNpmPackMetadata } from "../../scripts/release/npm-pack-metadata.mjs";

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
});
