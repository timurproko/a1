import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildReleaseNotesResource,
  MAX_RELEASE_NOTE_BYTES,
  parseReleaseNote,
  releaseNotePath,
  renderReleaseNoteDraft,
  validateReleaseNotesResource,
} from "../../scripts/release/release-notes.mjs";
import { collectReleaseChanges } from "../../scripts/release/release-workflow.mjs";

const temporary: string[] = [];
afterEach(async () => Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true }))));

async function notesDirectory(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "a1-release-notes-"));
  temporary.push(path);
  return path;
}

describe("reviewed release-note documents", () => {
  it("parses one exact stable identity and normalizes bounded Markdown", () => {
    expect(parseReleaseNote("## [1.2.3] - 2026-09-28\r\n\r\n### Fixed\r\n\r\n- Fixed it\r\n", "1.2.3")).toEqual({
      version: "1.2.3",
      markdown: "## [1.2.3] - 2026-09-28\n\n### Fixed\n\n- Fixed it\n",
    });
    expect(releaseNotePath("1.2.3")).toBe("docs/releases/1.2.3.md");
  });

  it.each([
    ["redundant identity", "# A1 1.2.3\n\n- note\n"],
    ["empty body", "\n"],
    ["unsafe scheme", "- [run](javascript:alert)\n"],
    ["absolute path", "- [file](/etc/passwd)\n"],
    ["path escape", "- [file](../secret)\n"],
    ["HTML", "<script>alert(1)</script>\n"],
    ["control byte", "- bad\u0007value\n"],
    ["wrong changelog identity", "## [1.2.4] - 2026-09-28\n\n### Fixed\n\n- bad\n"],
    ["invalid changelog date", "## [1.2.3] - 2026-02-30\n\n### Fixed\n\n- bad\n"],
  ])("rejects %s", (_name, markdown) => {
    expect(() => parseReleaseNote(markdown, "1.2.3")).toThrow();
  });

  it("rejects an oversized note and invalid path versions", () => {
    expect(() => parseReleaseNote(`${"x".repeat(MAX_RELEASE_NOTE_BYTES + 1)}`, "1.2.3")).toThrow(/bounded|size/i);
    for (const version of ["1.2.3-dev", "01.2.3", "../1.2.3", "v1.2.3"]) {
      expect(() => releaseNotePath(version)).toThrow(/stable release-note version/i);
    }
  });

  it("generates deterministic grouped, escaped, linked draft text", () => {
    const markdown = renderReleaseNoteDraft("2.0.0", [
      { number: 14, title: "docs: explain *advanced* [mode]", url: "https://github.com/acme/a1/pull/14" },
      { number: 11, title: "fix(parser): avoid a crash", url: "https://github.com/acme/a1/pull/11" },
      { number: 10, title: "feat!: replace old mode", url: "https://github.com/acme/a1/pull/10" },
      { number: 12, title: "feat(ui): add the route", url: "https://github.com/acme/a1/pull/12" },
      { number: 15, title: "add(cli): support aliases", url: "https://github.com/acme/a1/pull/15" },
      { number: 13, title: "chore(release): open 2.0.1-dev", url: "https://github.com/acme/a1/pull/13" },
    ], "2026-09-28");
    expect(markdown).toBe(`## [2.0.0] - 2026-09-28

### Breaking Changes

- replace old mode ([#10](https://github.com/acme/a1/pull/10))

### New Features

- add the route ([#12](https://github.com/acme/a1/pull/12))

### Added

- support aliases ([#15](https://github.com/acme/a1/pull/15))

### Changed

- explain \\*advanced\\* \\[mode\\] ([#14](https://github.com/acme/a1/pull/14))

### Fixed

- avoid a crash ([#11](https://github.com/acme/a1/pull/11))
`);
    expect(() => renderReleaseNoteDraft("2.0.0", [
      { number: 1, title: "feat: one", url: "https://github.com/acme/a1/pull/1" },
      { number: 1, title: "fix: duplicate", url: "https://github.com/acme/a1/pull/1" },
    ])).toThrow(/duplicate/i);
  });

  it("requires an exact stable package to contain its reviewed note", async () => {
    const directory = await notesDirectory();
    await mkdir(join(directory, "dist", "features", "owned-ui", "resources"), { recursive: true });
    await writeFile(join(directory, "package.json"), JSON.stringify({ version: "1.2.3" }));
    const resourcePath = join(directory, "dist", "features", "owned-ui", "resources", "release-notes.json");
    await writeFile(resourcePath, JSON.stringify({ schema: "a1-release-notes-v1", releases: [] }));
    const script = resolve("scripts/release/validate-packaged-release-note.mjs");
    expect(spawnSync(process.execPath, [script], { cwd: directory, encoding: "utf8" }).status).toBe(1);
    await writeFile(resourcePath, JSON.stringify({
      schema: "a1-release-notes-v1",
      releases: [{ version: "1.2.3", markdown: "## Fixes\n\n- reviewed\n" }],
    }));
    await mkdir(join(directory, "docs", "releases"), { recursive: true });
    await writeFile(join(directory, "docs", "releases", "1.2.3.md"), "## Fixes\n\n- different\n");
    expect(spawnSync(process.execPath, [script], { cwd: directory, encoding: "utf8" }).status).toBe(1);
    await writeFile(join(directory, "docs", "releases", "1.2.3.md"), "## Fixes\n\n- reviewed\n");
    expect(spawnSync(process.execPath, [script], { cwd: directory, encoding: "utf8" }).status).toBe(0);
  });

  it("builds newest-first resources and rejects malformed file identities", async () => {
    const directory = await notesDirectory();
    await writeFile(join(directory, "1.2.3.md"), "## Fixes\n\n- older\n");
    await writeFile(join(directory, "2.0.0.md"), "## Features\n\n- newer\n");
    const resource = await buildReleaseNotesResource(directory);
    expect(resource.releases.map(release => release.version)).toEqual(["2.0.0", "1.2.3"]);
    expect(validateReleaseNotesResource(resource)).toEqual(resource);
    await writeFile(join(directory, "3.0.0.md"), "# A1 3.0.0\n\n- redundant identity\n");
    await expect(buildReleaseNotesResource(directory)).rejects.toThrow(/redundant A1 release heading/i);
  });
});

describe("merged pull-request release evidence", () => {
  const base = "a".repeat(40);
  const first = "b".repeat(40);
  const second = "c".repeat(40);

  it("collects unique merged PRs in first-parent order", async () => {
    const git = (args: readonly string[]) => args[0] === "log" ? `${first}\n${second}` : "";
    const records = new Map([
      [first, { number: 8, title: "feat: one", html_url: "https://github.com/acme/a1/pull/8", merged_at: "now", base: { ref: "develop" }, merge_commit_sha: first }],
      [second, { number: 9, title: "fix: two", html_url: "https://github.com/acme/a1/pull/9", merged_at: "now", base: { ref: "develop" }, merge_commit_sha: second }],
    ]);
    const gh = (args: readonly string[]) => args[0] === "repo" ? "acme/a1" : JSON.stringify([records.get(args.at(-1)!.split("/").at(-2)!)!]);
    await expect(collectReleaseChanges(git, gh, base, second)).resolves.toEqual([
      { number: 8, title: "feat: one", url: "https://github.com/acme/a1/pull/8" },
      { number: 9, title: "fix: two", url: "https://github.com/acme/a1/pull/9" },
    ]);
  });

  it("accepts an empty range and rejects missing, ambiguous, and duplicate evidence", async () => {
    const repository = (args: readonly string[]) => args[0] === "repo" ? "acme/a1" : "[]";
    await expect(collectReleaseChanges(() => "", repository, base, second)).resolves.toEqual([]);
    await expect(collectReleaseChanges(() => first, repository, base, second)).rejects.toThrow(/0 unique merged/i);

    const record = { number: 8, title: "feat: one", html_url: "https://github.com/acme/a1/pull/8", merged_at: "now", base: { ref: "develop" }, merge_commit_sha: first };
    const ambiguous = (args: readonly string[]) => args[0] === "repo" ? "acme/a1" : JSON.stringify([record, record]);
    await expect(collectReleaseChanges(() => first, ambiguous, base, second)).rejects.toThrow(/2 unique merged/i);

    const duplicate = (args: readonly string[]) => args[0] === "repo" ? "acme/a1" : JSON.stringify([{ ...record, merge_commit_sha: args.at(-1)!.split("/").at(-2) }]);
    await expect(collectReleaseChanges(() => `${first}\n${second}`, duplicate, base, second)).rejects.toThrow(/more than once/i);
  });
});
