import { describe, expect, it } from "vitest";
import {
  developmentPreviewTarballName,
  selectDevelopmentPreviewCandidate,
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

  it("derives npm's scoped-package tarball filename", () => {
    expect(developmentPreviewTarballName("@timurproko/addone", "0.1.5-dev.1"))
      .toBe("timurproko-addone-0.1.5-dev.1.tgz");
  });

  it("rejects malformed local or registry versions", () => {
    expect(() => selectDevelopmentPreviewCandidate("broken", [])).toThrow(/invalid current/);
    expect(() => selectDevelopmentPreviewCandidate("1.0.0", ["broken"])).toThrow(/invalid published/);
  });
});
