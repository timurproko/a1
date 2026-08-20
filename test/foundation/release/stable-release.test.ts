import { describe, expect, it } from "vitest";
import { createStableReleaseEvidence, verifyStableRegistry } from "../../../src/foundation/release/index.js";

const accepted = createStableReleaseEvidence({
  packageName: "@timurproko/a1",
  version: "0.1.0",
  commit: "a".repeat(40),
  tag: "v0.1.0",
  tarball: "timurproko-a1-0.1.0.tgz",
  integrity: `sha512-${Buffer.from("accepted").toString("base64")}`,
  shasum: "b".repeat(40),
  recordedAt: "2026-08-20T00:00:00.000Z",
});

describe("stable npm release verification", () => {
  it("records only the authoritative stable package and matching tag", () => {
    expect(accepted).toMatchObject({
      schema: "addone-stable-release-v1",
      channel: "latest",
      packageName: "@timurproko/a1",
      version: "0.1.0",
      tag: "v0.1.0",
    });
    expect(() => createStableReleaseEvidence({ ...accepted, packageName: "@timurproko/addone" })).toThrow(/unexpected stable package/);
    expect(() => createStableReleaseEvidence({ ...accepted, version: "0.1.0-dev.1", tag: "v0.1.0-dev.1" })).toThrow(/exact stable version/);
    expect(() => createStableReleaseEvidence({ ...accepted, tag: "v0.1.1" })).toThrow(/does not match/);
  });

  it("accepts controlled registry metadata only when every exact field matches", async () => {
    await expect(verifyStableRegistry(accepted, async () => ({
      packageName: "@timurproko/a1",
      version: "0.1.0",
      latest: "0.1.0",
      integrity: accepted.integrity,
      shasum: accepted.shasum,
      bins: ["a1"],
    }), { attempts: 1 })).resolves.toBeUndefined();
  });

  it("retries stale responses and rejects wrong bytes or extra bins", async () => {
    const states = [
      { packageName: null, version: null, latest: null, integrity: null, shasum: null, bins: [] },
      { packageName: "@timurproko/a1", version: "0.1.0", latest: "0.1.0", integrity: "sha512-wrong", shasum: accepted.shasum, bins: ["a1", "addone"] },
    ];
    const delays: number[] = [];
    await expect(verifyStableRegistry(
      accepted,
      async () => states.shift() ?? states[states.length - 1]!,
      { attempts: 2, delayMs: 5, delay: async milliseconds => { delays.push(milliseconds); } },
    )).rejects.toThrow(/did not match accepted/);
    expect(delays).toEqual([5]);
  });
});
