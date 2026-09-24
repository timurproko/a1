import { describe, expect, it, vi } from "vitest";
import {
  classifyDevelopmentValidationReadiness,
  resolveDevelopmentValidationReadiness,
} from "../../scripts/release/development-validation-readiness.mjs";

const EVENT_HEAD = "a".repeat(40);

function implementation(value: object): string {
  return `\`\`\`openspec-implementation\n${JSON.stringify(value)}\n\`\`\``;
}

describe("development validation readiness", () => {
  it("defers every draft without parsing pull-request metadata", () => {
    expect(classifyDevelopmentValidationReadiness({ eventName: "pull_request", draft: true, body: "```openspec-implementation\n{" }))
      .toEqual({ validate: false, reason: "draft" });
  });

  it("permits ready ordinary and legacy pull requests", () => {
    expect(classifyDevelopmentValidationReadiness({ eventName: "pull_request", body: "ordinary" }))
      .toEqual({ validate: true, reason: "ready" });
    expect(classifyDevelopmentValidationReadiness({ eventName: "pull_request", body: implementation({ version: 2, change: "legacy-change" }) }))
      .toEqual({ validate: true, reason: "legacy-implementation" });
  });

  it("defers active version-3 delivery until finalization metadata is present", () => {
    expect(classifyDevelopmentValidationReadiness({ eventName: "pull_request", body: implementation({ version: 3, change: "example-change" }) }))
      .toEqual({ validate: false, reason: "awaiting-finalization" });
  });

  it("permits a finalized version-3 exact head", () => {
    const archive = "openspec/changes/archive/2026-09-23-example-change/";
    expect(classifyDevelopmentValidationReadiness({ eventName: "pull_request", body: implementation({
      version: 3,
      change: "example-change",
      archive,
      acceptanceManifest: `${archive}acceptance.md`,
    }) })).toEqual({ validate: true, reason: "finalized-version-3" });
  });

  it("fails closed with a bounded reason for malformed lifecycle metadata", () => {
    expect(classifyDevelopmentValidationReadiness({ eventName: "pull_request", body: "```openspec-implementation\n{" }))
      .toEqual({ validate: false, reason: "malformed-implementation-metadata", errorCode: "metadata-unclosed" });
  });

  it("uses current finalized metadata when a same-head synchronize event carries the active body", async () => {
    const archive = "openspec/changes/archive/2026-09-24-example-change/";
    const reader = vi.fn(async () => ({
      number: 581,
      state: "open",
      draft: false,
      body: implementation({ version: 3, change: "example-change", archive, acceptanceManifest: `${archive}acceptance.md` }),
      head: { sha: EVENT_HEAD },
      base: { ref: "develop" },
    }));
    await expect(resolveDevelopmentValidationReadiness({
      eventName: "pull_request",
      eventHead: EVENT_HEAD,
      repository: "owner/repository",
      pullNumber: 581,
      token: "token",
    }, reader)).resolves.toEqual({ validate: true, reason: "finalized-version-3" });
    expect(reader).toHaveBeenCalledWith("owner/repository", 581, "token");
  });

  it("defers a superseded head and fails closed when current metadata is unavailable", async () => {
    const current = vi.fn(async () => ({
      number: 581,
      state: "open",
      draft: false,
      body: "ordinary",
      head: { sha: "b".repeat(40) },
      base: { ref: "develop" },
    }));
    await expect(resolveDevelopmentValidationReadiness({
      eventName: "pull_request", eventHead: EVENT_HEAD, repository: "owner/repository", pullNumber: 581, token: "token",
    }, current)).resolves.toEqual({ validate: false, reason: "stale-pull-request-event" });
    await expect(resolveDevelopmentValidationReadiness({
      eventName: "pull_request", eventHead: EVENT_HEAD, repository: "owner/repository", pullNumber: 581, token: "token",
    }, async () => { throw new Error("unavailable"); })).resolves.toEqual({
      validate: false,
      reason: "pull-metadata-unavailable",
      errorCode: "pull-metadata-unavailable",
    });
  });

  it("preserves non-pull-request dispatch", () => {
    expect(classifyDevelopmentValidationReadiness({ eventName: "workflow_dispatch", draft: true, body: "invalid" }))
      .toEqual({ validate: true, reason: "non-pull-request" });
  });
});
