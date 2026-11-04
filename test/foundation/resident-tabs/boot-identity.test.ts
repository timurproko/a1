import { describe, expect, it } from "vitest";
import { sameBootIdentity } from "../../../src/foundation/resident-tabs/boot-identity.js";

describe("sameBootIdentity", () => {
  it("matches current per-boot identifiers exactly on every platform", () => {
    for (const value of [
      "linux-boot:6f1d3c1e-2a4b-4c55-9d0e-0123456789ab",
      "windows-boot:01234567-89ab-cdef-0123456789abcdef",
      "macos-boot-session:8C224B16-5D02-46A2-ADA0-2D3A7C18C697",
    ]) expect(sameBootIdentity(value, value)).toBe(true);
    expect(sameBootIdentity("linux-boot:a", "linux-boot:b")).toBe(false);
  });

  it("tolerates drift between legacy clock-derived records of one boot", () => {
    expect(sameBootIdentity("macos-boot:1793386641:831874", "macos-boot:1793386642:889229")).toBe(true);
    expect(sameBootIdentity("macos-boot:1793386642:10483", "macos-boot:1793386644:0")).toBe(true);
  });

  it("rejects another boot and cannot prove a legacy record against a current identity", () => {
    expect(sameBootIdentity("macos-boot:1793380000:1", "macos-boot:1793386642:1")).toBe(false);
    expect(sameBootIdentity("macos-boot:1793386642:1", "macos-boot-session:8C224B16-5D02-46A2-ADA0-2D3A7C18C697")).toBe(false);
    expect(sameBootIdentity("macos-boot:+1:1", "macos-boot:1:1")).toBe(false);
  });
});
