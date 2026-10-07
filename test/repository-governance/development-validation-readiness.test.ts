import { describe, expect, it } from "vitest";
import {
  classifyCurrentDevelopmentValidationReadiness,
  classifyCurrentReleaseReopeningValidationRoute,
  classifyDevelopmentValidationReadiness,
  classifyDevelopmentValidationReadinessFromRepository,
  classifyReleaseReopeningValidationRoute,
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

  it("selects an exact current-head post-publication reopening", async () => {
    const base = "b".repeat(40), head = "a".repeat(40);
    const installerManifest = ["packages", "a1-install", "package.json"].join("/");
    const note = "## [0.2.5] - 2026-10-07\n\n### Fixed\n\n- Example.\n";
    const manifests = (version: string) => ({
      "package.json": JSON.stringify({ name: "@timurproko/a1", version }),
      "package-lock.json": JSON.stringify({ name: "@timurproko/a1", version, packages: { "": { name: "@timurproko/a1", version } } }),
      [installerManifest]: JSON.stringify({ name: "@timurproko/a1-install", version }),
    });
    const content = { [base]: manifests("0.2.5-dev"), [head]: { ...manifests("0.2.6-dev"), "docs/releases/0.2.5.md": note } };
    const pull = {
      number: 706, changed_files: 4, draft: false, body: "Reopens development.",
      user: { login: "openspec-ci[bot]", id: 329165293, type: "Bot" },
      base: { ref: "develop", sha: base },
      head: { ref: "chore/release-0.2.6-dev", sha: head, repo: { full_name: "owner/repo" } },
    };
    const reader = {
      repository: "owner/repo", prefix: "/repos/owner/repo",
      async pages() {
        return [
          { filename: "docs/releases/0.2.5.md", status: "added" },
          { filename: "package-lock.json", status: "modified" },
          { filename: "package.json", status: "modified" },
          { filename: installerManifest, status: "modified" },
        ];
      },
      async get(path: string) {
        if (path.endsWith("/releases/tags/v0.2.5")) return { tag_name: "v0.2.5", draft: false, prerelease: false, body: note };
        const match = /\/contents\/(.+)\?ref=([a-f0-9]{40})$/u.exec(path);
        if (!match) throw new Error(path);
        const value = (content as Record<string, Record<string, string>>)[match[2]!]?.[decodeURIComponent(match[1]!)];
        if (value === undefined) throw new Error(path);
        return { type: "file", encoding: "base64", content: Buffer.from(value).toString("base64") };
      },
    };
    await expect(classifyCurrentReleaseReopeningValidationRoute({
      eventName: "pull_request", pull, reader, expectedNumber: 706, expectedHead: head, expectedBase: base,
    })).resolves.toMatchObject({ selected: true, reason: "verified release reopening 0.2.5 -> 0.2.6-dev" });
    await expect(classifyCurrentReleaseReopeningValidationRoute({
      eventName: "pull_request", pull, reader, expectedNumber: 706, expectedHead: "c".repeat(40), expectedBase: base,
    })).rejects.toMatchObject({ archiveCode: "association-event-drift" });
  });

  it("grants no reopening route to lookalikes or unavailable evidence", async () => {
    const branch = { head: { ref: "feature/ordinary" } };
    await expect(classifyReleaseReopeningValidationRoute({ eventName: "pull_request", pull: branch, reader: {} }))
      .resolves.toEqual({ selected: false, reason: "not-release-reopening" });
    const lookalike = { number: 8, changed_files: 5, head: { ref: "chore/release-0.2.6-dev" } };
    await expect(classifyReleaseReopeningValidationRoute({ eventName: "pull_request", pull: lookalike, reader: {} }))
      .resolves.toEqual({ selected: false, reason: "reopening PR must change exactly four files" });
    const unavailable = { ...lookalike, changed_files: 4 };
    await expect(classifyReleaseReopeningValidationRoute({
      eventName: "pull_request", pull: unavailable, reader: { async pages() { throw new Error("unavailable"); } },
    })).resolves.toEqual({ selected: false, reason: "release-reopening verification unavailable" });
  });

  it("preserves non-pull-request dispatch", () => {
    expect(classifyDevelopmentValidationReadiness({ eventName: "workflow_dispatch", draft: true, body: "invalid" }))
      .toEqual({ validate: true, reason: "non-pull-request" });
  });
});
