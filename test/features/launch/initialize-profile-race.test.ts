import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initializeProductProfile } from "../../../src/features/launch/index.js";

/**
 * Two A1 instances can start at the same moment, and both will find the profile
 * directories missing. Creating them has to be safe to race — the loser of the
 * race is not an error — while still refusing anything that is not an owned
 * directory.
 */
let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "a1-profile-race-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("preparing a profile", () => {
  it("survives two launches preparing it at once", async () => {
    const target = path.join(root, "nested", "profile");
    const results = await Promise.all(Array.from({ length: 8 }, () => initializeProductProfile(target)));
    for (const result of results) {
      expect(result.root).toBe(path.resolve(target));
      expect(result.directories.length).toBeGreaterThan(0);
    }
  });

  it("is unchanged by preparing it again", async () => {
    const target = path.join(root, "profile");
    const first = await initializeProductProfile(target);
    const second = await initializeProductProfile(target);
    expect(second).toEqual(first);
  });

  it("still refuses a resource path that is not a directory", async () => {
    const target = path.join(root, "profile");
    await initializeProductProfile(target);
    rmSync(path.join(target, "skills"), { recursive: true, force: true });
    writeFileSync(path.join(target, "skills"), "not a directory");
    await expect(initializeProductProfile(target)).rejects.toThrow(/not an owned directory/);
  });

  it("still refuses a symbolic link where a directory belongs", async () => {
    const target = path.join(root, "profile");
    await initializeProductProfile(target);
    const link = path.join(target, "themes");
    rmSync(link, { recursive: true, force: true });
    try {
      symlinkSync(root, link, "junction");
    } catch {
      return; // the platform refuses to make one without privileges; nothing to assert
    }
    await expect(initializeProductProfile(target)).rejects.toThrow(/not an owned directory/);
  });
});
