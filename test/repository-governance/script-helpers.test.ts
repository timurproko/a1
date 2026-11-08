import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalDigest, canonicalJson } from "../../scripts/canonical-digest.mjs";
import { optionValue } from "../../scripts/cli-options.mjs";

describe("shared script helpers", () => {
  it("reads an option value and treats a flag without a value as a usage error", () => {
    const argv = ["node", "script.mjs", "--job", "fast", "--impact", "--platform"];
    expect(optionValue("--job", { argv })).toBe("fast");
    expect(optionValue("--missing", { argv })).toBeUndefined();
    expect(() => optionValue("--impact", { argv })).toThrow("--impact requires a value");
    expect(() => optionValue("--platform", { argv })).toThrow("--platform requires a value");
    expect(() => optionValue("--missing", { required: true, argv })).toThrow("--missing is required");
    expect(optionValue("--job", { required: true, argv })).toBe("fast");
  });

  it("serializes keys in sorted order at every depth and digests those exact bytes", () => {
    const text = canonicalJson({ b: 1, a: [{ d: 2, c: null }], e: "x" });
    expect(text).toBe('{"a":[{"c":null,"d":2}],"b":1,"e":"x"}');
    expect(canonicalJson({ a: [{ c: null, d: 2 }], e: "x", b: 1 })).toBe(text);
    expect(canonicalDigest({ e: "x", b: 1, a: [{ d: 2, c: null }] })).toBe(createHash("sha256").update(text).digest("hex"));
  });
});
