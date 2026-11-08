import { join, parse, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { errorMessage, isDirectChild, samePath } from "../../../src/foundation/release/managed-path.js";

const root = resolve("managed-root");

describe("release managed-path containment", () => {
  it("accepts exactly one non-empty segment below the managed root", () => {
    expect(isDirectChild(root, join(root, "release-1"))).toBe(true);
    expect(isDirectChild(root, join(root, "..release"))).toBe(true);
    expect(isDirectChild(`${root}/`, join(root, "release-1"))).toBe(true);
  });

  it("rejects the root, nested descendants, parent traversal, siblings, and other roots", () => {
    expect(isDirectChild(root, root)).toBe(false);
    expect(isDirectChild(root, join(root, "release-1", "nested"))).toBe(false);
    expect(isDirectChild(root, join(root, ".."))).toBe(false);
    expect(isDirectChild(root, join(root, "..", "sibling"))).toBe(false);
    expect(isDirectChild(root, resolve(parse(root).root, "elsewhere"))).toBe(false);
  });

  it.runIf(process.platform === "win32")("ignores letter case and rejects another drive on Windows", () => {
    expect(isDirectChild(root.toUpperCase(), join(root.toLowerCase(), "release-1"))).toBe(true);
    const otherDrive = root.startsWith("Z:") ? "Y:\\managed-root" : "Z:\\managed-root";
    expect(isDirectChild(root, join(otherDrive, "release-1"))).toBe(false);
    expect(samePath(root.toUpperCase(), root.toLowerCase())).toBe(true);
  });

  it("compares resolved paths and reports any thrown value", () => {
    expect(samePath(join(root, "a", ".."), root)).toBe(true);
    expect(samePath(join(root, "a"), join(root, "b"))).toBe(false);
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("plain")).toBe("plain");
  });
});
