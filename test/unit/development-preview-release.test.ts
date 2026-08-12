import { describe, expect, it } from "vitest";
import {
  developmentPreviewTarballName,
  publishDevelopmentPreviewWithRecovery,
  selectDevelopmentPreviewCandidate,
  verifyDevelopmentPreviewRegistry,
} from "../../src/development-preview-release.js";

describe("development preview release planning", () => {
  it("resumes a leading unpublished dev candidate without another version bump", () => {
    expect(selectDevelopmentPreviewCandidate("0.1.5-dev.0", ["0.1.4"]))
      .toEqual({ version: "0.1.5-dev.0", requiresVersionCommit: false });
  });

  it("increments an already published dev candidate", () => {
    expect(selectDevelopmentPreviewCandidate("0.1.5-dev.0", ["0.1.4", "0.1.5-dev.0"]))
      .toEqual({ version: "0.1.5-dev.1", requiresVersionCommit: true });
  });

  it("continues after the highest published dev candidate rather than filling a gap", () => {
    expect(selectDevelopmentPreviewCandidate("0.1.5-dev.0", ["0.1.4", "0.1.5-dev.0", "0.1.5-dev.3"]))
      .toEqual({ version: "0.1.5-dev.4", requiresVersionCommit: true });
  });

  it("starts the next patch prerelease after a stable version", () => {
    expect(selectDevelopmentPreviewCandidate("0.2.0", ["0.1.5-dev.4", "0.2.0"]))
      .toEqual({ version: "0.2.1-dev.0", requiresVersionCommit: true });
  });

  it("advances from a newer registry version without moving next backward", () => {
    expect(selectDevelopmentPreviewCandidate("0.1.5-dev.0", ["0.1.5", "0.1.6-dev.2"]))
      .toEqual({ version: "0.1.6-dev.3", requiresVersionCommit: true });
  });

  it("accepts exact registry verification when browser auth reports failure after upload", async () => {
    const publishError = new Error("403 Forbidden - GET /-/v1/done?authId=redacted");
    let verified = 0;
    await expect(publishDevelopmentPreviewWithRecovery(
      async () => { throw publishError; },
      async () => { verified += 1; },
    )).resolves.toEqual({ published: true, recoveredPublishError: publishError });
    expect(verified).toBe(1);
  });

  it("preserves publish and verification failures when no immutable upload appears", async () => {
    await expect(publishDevelopmentPreviewWithRecovery(
      async () => { throw new Error("web auth failed"); },
      async () => { throw new Error("version absent from registry"); },
    )).rejects.toMatchObject({
      name: "AggregateError",
      message: "npm publish failed and the exact version could not be verified in the registry",
      errors: [expect.objectContaining({ message: "web auth failed" }), expect.objectContaining({ message: "version absent from registry" })],
    });
  });

  it("retries stale npm reads after a successful upload until next propagates", async () => {
    const states = [
      { published: false, nextVersion: "0.1.5-dev.0" },
      { published: true, nextVersion: "0.1.5-dev.0" },
      { published: true, nextVersion: "0.1.5-dev.1" },
    ];
    const delays: number[] = [];
    let repairs = 0;

    await expect(verifyDevelopmentPreviewRegistry(
      "0.1.5-dev.1",
      async () => states.shift() ?? { published: true, nextVersion: "0.1.5-dev.1" },
      async () => { repairs += 1; },
      { attempts: 4, delayMs: 25, delay: async milliseconds => { delays.push(milliseconds); } },
    )).resolves.toBeUndefined();

    expect(repairs).toBe(1);
    expect(delays).toEqual([25, 25]);
  });

  it("reports propagation failure only after exhausting bounded retries", async () => {
    const delays: number[] = [];
    await expect(verifyDevelopmentPreviewRegistry(
      "0.1.5-dev.1",
      async () => ({ published: false, nextVersion: "0.1.5-dev.0" }),
      async () => { throw new Error("repair must not run before publication appears"); },
      { attempts: 3, delayMs: 10, delay: async milliseconds => { delays.push(milliseconds); } },
    )).rejects.toThrow(/did not expose published version.*3 attempts/);
    expect(delays).toEqual([10, 10]);
  });

  it("derives npm's scoped-package tarball filename", () => {
    expect(developmentPreviewTarballName("@timurproko/addone", "0.1.5-dev.1"))
      .toBe("timurproko-addone-0.1.5-dev.1.tgz");
  });

  it("rejects malformed local or registry versions", () => {
    expect(() => selectDevelopmentPreviewCandidate("broken", [])).toThrow(/invalid current/);
    expect(() => selectDevelopmentPreviewCandidate("1.0.0", ["broken"])).toThrow(/invalid published/);
  });
});
