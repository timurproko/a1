import { describe, expect, it } from "vitest";
import { classifyReleaseReopening } from "../../scripts/governance/release-reopening-auto-merge.mjs";

const baseSha = "b".repeat(40);
const headSha = "a".repeat(40);
const installerManifest = ["packages", "a1-install", "package.json"].join("/");
const note = "## [0.2.2] - 2026-09-30\n\n### Fixed\n\n- Example fix.\n";

function reopeningManifests(version: string, dependency = "^1.0.0"): Record<string, string> {
  return {
    "package.json": `${JSON.stringify({ name: "@timurproko/a1", version, dependencies: { semver: dependency } }, null, 2)}\n`,
    "package-lock.json": `${JSON.stringify({ name: "@timurproko/a1", version, lockfileVersion: 3,
      packages: { "": { name: "@timurproko/a1", version, dependencies: { semver: dependency } } } }, null, 2)}\n`,
    [installerManifest]: `${JSON.stringify({ name: "@timurproko/a1-install", version }, null, 2)}\n`,
  };
}

function reopeningPull(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    number: 42, draft: false, body: "Reopens development at 0.2.3-dev.",
    user: { login: "openspec-ci[bot]", id: 329165293, type: "Bot" },
    base: { ref: "develop", sha: baseSha },
    head: { ref: "chore/release-0.2.3-dev", sha: headSha, repo: { full_name: "owner/repository" } },
    ...overrides,
  };
}

const reopeningFiles = [
  { filename: "docs/releases/0.2.2.md", status: "added" },
  { filename: "package-lock.json", status: "modified" },
  { filename: "package.json", status: "modified" },
  { filename: "packages/a1-install/package.json", status: "modified" },
];

function classify(options: {
  pull?: Record<string, unknown>;
  files?: readonly { filename: string; status: string; previous_filename?: string }[];
  base?: Record<string, string>;
  head?: Record<string, string>;
  release?: unknown;
  headNote?: string;
} = {}) {
  const base = options.base ?? reopeningManifests("0.2.2-dev");
  const head: Record<string, string> = { ...(options.head ?? reopeningManifests("0.2.3-dev")), "docs/releases/0.2.2.md": options.headNote ?? note };
  return classifyReleaseReopening({
    pull: options.pull ?? reopeningPull(),
    files: options.files ?? reopeningFiles,
    repository: "owner/repository",
    read: async (path, ref) => {
      const value = (ref === baseSha ? base : ref === headSha ? head : {} as Record<string, string>)[path];
      if (value === undefined) throw new Error(`missing ${path}@${ref}`);
      return value;
    },
    release: async () => options.release === undefined
      ? { tag_name: "v0.2.2", draft: false, prerelease: false, body: note.replace(/\n$/u, "\r\n") }
      : options.release,
  });
}

describe("release reopening auto-merge classification", () => {
  it("accepts the exact post-publication reopening shape", async () => {
    await expect(classify()).resolves.toMatchObject({ eligible: true, released: "0.2.2", opening: "0.2.3" });
  });

  it.each([
    ["another author", { user: { login: "someone", id: 1, type: "User" } }],
    ["a forged bot login", { user: { login: "openspec-ci[bot]", id: 1, type: "Bot" } }],
    ["a draft", { draft: true }],
    ["a fork", { head: { ref: "chore/release-0.2.3-dev", sha: headSha, repo: { full_name: "fork/repository" } } }],
    ["another base", { base: { ref: "master", sha: baseSha } }],
    ["another branch", { head: { ref: "chore/release-0.2.3", sha: headSha, repo: { full_name: "owner/repository" } } }],
    ["a branch naming another version", { head: { ref: "chore/release-0.2.4-dev", sha: headSha, repo: { full_name: "owner/repository" } } }],
    ["implementation metadata", { body: '```openspec-implementation\n{"version":3,"change":"example"}\n```' }],
    ["malformed lifecycle metadata", { body: "```openspec-implementation\n{" }],
  ])("rejects %s", async (_label, overrides) => {
    await expect(classify({ pull: reopeningPull(overrides) })).resolves.toMatchObject({ eligible: false });
  });

  it.each([
    ["an extra path", [...reopeningFiles, { filename: "src/index.ts", status: "modified" }]],
    ["a missing version file", reopeningFiles.filter(file => file.filename !== "package-lock.json")],
    ["a modified note", reopeningFiles.map(file => file.filename.endsWith(".md") ? { ...file, status: "modified" } : file)],
    ["a renamed note", reopeningFiles.map(file => file.filename.endsWith(".md") ? { ...file, status: "renamed", previous_filename: "docs/x.md" } : file)],
    ["a substituted path", reopeningFiles.map(file => file.filename === "package.json" ? { ...file, filename: "src/package.json" } : file)],
  ])("rejects %s", async (_label, files) => {
    await expect(classify({ files })).resolves.toMatchObject({ eligible: false });
  });

  it("rejects dependency changes and inconsistent versions", async () => {
    await expect(classify({ head: reopeningManifests("0.2.3-dev", "^2.0.0") })).resolves.toMatchObject({ eligible: false, reason: expect.stringContaining("more than its version") });
    await expect(classify({ base: reopeningManifests("0.2.1-dev") })).resolves.toMatchObject({ eligible: false });
    const lockOnly = { ...reopeningManifests("0.2.3-dev"), "package-lock.json": reopeningManifests("0.2.2-dev")["package-lock.json"]! };
    await expect(classify({ head: lockOnly })).resolves.toMatchObject({ eligible: false });
  });

  it.each([
    ["missing", null],
    ["draft", { tag_name: "v0.2.2", draft: true, prerelease: false, body: note }],
    ["prerelease", { tag_name: "v0.2.2", draft: false, prerelease: true, body: note }],
    ["another tag", { tag_name: "v0.2.1", draft: false, prerelease: false, body: note }],
    ["edited", { tag_name: "v0.2.2", draft: false, prerelease: false, body: `${note}\n- Added later.\n` }],
  ])("rejects a %s Release", async (_label, release) => {
    await expect(classify({ release })).resolves.toMatchObject({ eligible: false });
  });

  it("rejects a note that differs from the Release and unreadable content without throwing", async () => {
    await expect(classify({ headNote: note.replace("Example", "Other") })).resolves.toMatchObject({ eligible: false });
    await expect(classify({ head: {} })).resolves.toMatchObject({ eligible: false, reason: expect.stringContaining("could not be verified") });
    await expect(classify({ head: { ...reopeningManifests("0.2.3-dev"), "package.json": "{" } })).resolves.toMatchObject({ eligible: false });
  });
});
