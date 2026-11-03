import { describe, expect, it, vi } from "vitest";
import {
  isDuplicateTransparencyLogFailure,
  npmPublishArguments,
  publishExactPackage,
} from "../../scripts/release/npm-publish-exact.mjs";

const identity = {
  tarball: ".artifacts/release/installer.tgz",
  name: "@timurproko/a1-install",
  version: "0.2.7-dev.1237",
  channel: "next",
  integrity: "sha512-validated",
  shasum: "1d7fc40ffff10e8c7a8b895c1e8c19ac4bd85a2c",
} as const;

const duplicate = [
  "npm error code TLOG_CREATE_ENTRY_ERROR",
  "npm error error creating tlog entry - (409) an equivalent entry already exists in the transparency log",
].join("\n");

function registryResponse(status: number, body?: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  };
}

describe("exact npm publication recovery", () => {
  it("retains provenance and the trusted public registry on every attempt", () => {
    expect(npmPublishArguments(identity.tarball, identity.channel)).toEqual([
      identity.tarball,
      "--tag", "next",
      "--access", "public",
      "--ignore-scripts",
      "--provenance",
      "--registry", "https://registry.npmjs.org/",
    ]);
  });

  it("retries the same validated tarball after an exact duplicate tlog failure", async () => {
    const publish = vi.fn()
      .mockResolvedValueOnce({ code: 1, output: duplicate })
      .mockResolvedValueOnce({ code: 0, output: "published" });
    const fetch = vi.fn().mockResolvedValue(registryResponse(404));
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await publishExactPackage({ ...identity, publish, fetch, sleep, attempts: 2, retryDelayMs: 25, now: () => 7 });

    expect(result).toMatchObject({ status: "published", attempts: 2, name: identity.name, version: identity.version });
    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish).toHaveBeenNthCalledWith(1, { tarball: identity.tarball, channel: "next" });
    expect(publish).toHaveBeenNthCalledWith(2, { tarball: identity.tarball, channel: "next" });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("publish-recovery=7-1"), expect.objectContaining({ headers: expect.objectContaining({ "cache-control": "no-cache" }) }));
    expect(sleep).toHaveBeenCalledWith(25);
  });

  it("accepts exact registry bytes after the duplicate tlog command failure", async () => {
    const publish = vi.fn().mockResolvedValue({ code: 1, output: duplicate });
    const fetch = vi.fn().mockResolvedValue(registryResponse(200, {
      name: identity.name,
      version: identity.version,
      dist: { integrity: identity.integrity, shasum: identity.shasum },
    }));

    const result = await publishExactPackage({ ...identity, publish, fetch, sleep: vi.fn(), attempts: 2 });

    expect(result).toMatchObject({ status: "existing", attempts: 1 });
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it("does not retry when the validated bytes become visible during the delay", async () => {
    const publish = vi.fn().mockResolvedValue({ code: 1, output: duplicate });
    const fetch = vi.fn()
      .mockResolvedValueOnce(registryResponse(404))
      .mockResolvedValueOnce(registryResponse(200, {
        name: identity.name,
        version: identity.version,
        dist: { integrity: identity.integrity, shasum: identity.shasum },
      }));

    const result = await publishExactPackage({ ...identity, publish, fetch, sleep: vi.fn(), attempts: 2, retryDelayMs: 0 });

    expect(result).toMatchObject({ status: "existing", attempts: 1 });
    expect(publish).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("fails when registry reconciliation finds different bytes", async () => {
    const publish = vi.fn().mockResolvedValue({ code: 1, output: duplicate });
    const fetch = vi.fn().mockResolvedValue(registryResponse(200, {
      name: identity.name,
      version: identity.version,
      dist: { integrity: "sha512-other", shasum: identity.shasum },
    }));

    await expect(publishExactPackage({ ...identity, publish, fetch, sleep: vi.fn(), attempts: 2 }))
      .rejects.toThrow("registry bytes differ from the validated package");
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it("does not retry unrelated npm failures", async () => {
    const publish = vi.fn().mockResolvedValue({ code: 1, output: "npm error code E401" });
    const fetch = vi.fn();
    const sleep = vi.fn();

    await expect(publishExactPackage({ ...identity, publish, fetch, sleep, attempts: 2 }))
      .rejects.toThrow(`npm publish failed for ${identity.name}@${identity.version} with exit 1`);
    expect(fetch).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("fails after the bounded duplicate-entry attempts are exhausted", async () => {
    const publish = vi.fn().mockResolvedValue({ code: 1, output: duplicate });
    const fetch = vi.fn().mockResolvedValue(registryResponse(404));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(publishExactPackage({ ...identity, publish, fetch, sleep, attempts: 2, retryDelayMs: 0 }))
      .rejects.toThrow(`recovery exhausted for ${identity.name}@${identity.version} after 2 attempts`);
    expect(publish).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("recognizes only the duplicate transparency-log identity", () => {
    expect(isDuplicateTransparencyLogFailure(duplicate)).toBe(true);
    expect(isDuplicateTransparencyLogFailure("TLOG_CREATE_ENTRY_ERROR: timeout")).toBe(false);
    expect(isDuplicateTransparencyLogFailure("equivalent entry already exists")).toBe(false);
  });
});
