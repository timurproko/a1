import { describe, expect, it } from "vitest";
import {
  classifyCurrentDevelopmentValidationReadiness,
  classifyDevelopmentValidationReadiness,
  classifyDevelopmentValidationReadinessFromRepository,
} from "../../scripts/release/development-validation-readiness.mjs";

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

  it("uses the current finalized body when a same-head event carries active metadata", async () => {
    const head = "a".repeat(40), base = "b".repeat(40);
    const archive = "openspec/changes/archive/2026-09-24-example-change/";
    expect(classifyDevelopmentValidationReadiness({
      eventName: "pull_request",
      body: implementation({ version: 3, change: "example-change" }),
    })).toEqual({ validate: false, reason: "awaiting-finalization" });
    const pull = {
      number: 581,
      draft: false,
      body: implementation({ version: 3, change: "example-change", archive, acceptanceManifest: `${archive}acceptance.md` }),
      head: { sha: head },
      base: { sha: base },
    };
    await expect(classifyCurrentDevelopmentValidationReadiness({
      eventName: "pull_request", pull, reader: {}, expectedNumber: 581, expectedHead: head, expectedBase: base,
    })).resolves.toEqual({ validate: true, reason: "finalized-version-3" });
    await expect(classifyCurrentDevelopmentValidationReadiness({
      eventName: "pull_request", pull, reader: {}, expectedNumber: 581, expectedHead: "c".repeat(40), expectedBase: base,
    })).rejects.toMatchObject({ archiveCode: "association-event-drift" });
  });

  it("fails closed when immutable evidence shows mixed code and active-change edits without association", async () => {
    const baseSha = "a".repeat(40), headSha = "b".repeat(40), blobSha = "c".repeat(40);
    const active = "openspec/changes/example-change/proposal.md";
    const pull = { number: 7, changed_files: 2, draft: false, body: "ordinary", base: { sha: baseSha }, head: { sha: headSha } };
    const reader = {
      repository: "owner/repo", prefix: "/repos/owner/repo",
      async pages() { return [{ filename: active, status: "modified" }, { filename: "src/app.ts", status: "modified" }]; },
      async get(path: string) {
        if (path.includes(`/git/trees/${baseSha}`) || path.includes(`/git/trees/${headSha}`)) {
          return { truncated: false, tree: [{ path: active, sha: blobSha, type: "blob", mode: "100644" }] };
        }
        throw new Error(path);
      },
    };
    await expect(classifyDevelopmentValidationReadinessFromRepository({ eventName: "pull_request", pull, reader }))
      .resolves.toEqual({ validate: false, reason: "missing-implementation-association", errorCode: "missing-implementation-association", changes: ["example-change"] });
  });

  it("preserves non-pull-request dispatch", () => {
    expect(classifyDevelopmentValidationReadiness({ eventName: "workflow_dispatch", draft: true, body: "invalid" }))
      .toEqual({ validate: true, reason: "non-pull-request" });
  });
});
