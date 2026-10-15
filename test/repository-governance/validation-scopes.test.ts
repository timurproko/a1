import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { consumesCandidatePackage, expandValidationScopes } from "../../scripts/release/validation-scopes.mjs";

const suites = JSON.parse(await readFile("config/validation-suites.json", "utf8"));

describe("validation scope expansion", () => {
  it("decides from the suite config which lanes pack a candidate", () => {
    expect(consumesCandidatePackage(suites, ["package-smoke", "pi-engine-conformance", "release-update"])).toBe(true);
    expect(consumesCandidatePackage(suites, ["unix-containment", "package-smoke"])).toBe(true);
    expect(consumesCandidatePackage(suites, ["package-startup"])).toBe(true);
    expect(consumesCandidatePackage(suites, ["terminal-host"])).toBe(false);
    expect(consumesCandidatePackage(suites, ["resident-chaos"])).toBe(false);
    expect(consumesCandidatePackage(suites, [])).toBe(false);
  });

  it("expands compositions once in first-reached order and rejects unknown or cyclic names", () => {
    const fixture = {
      tiers: { outer: { kind: "composition", includes: ["a", "inner", "a"] } },
      scopes: { inner: { kind: "composition", includes: ["b", "a"] }, a: { kind: "commands" }, b: { kind: "commands", consumesPackage: true } },
    };
    expect(expandValidationScopes(fixture, ["outer"])).toEqual(["a", "b"]);
    expect(consumesCandidatePackage(fixture, ["outer"])).toBe(true);
    expect(() => expandValidationScopes(fixture, ["missing"])).toThrow("unknown validation tier or scope: missing");
    const cyclic = { tiers: {}, scopes: { x: { kind: "composition", includes: ["y"] }, y: { kind: "composition", includes: ["x"] } } };
    expect(() => expandValidationScopes(cyclic, ["x"])).toThrow("cyclic validation composition: x");
  });
});
