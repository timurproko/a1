import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getPackageDir } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import { formatPinnedCommandChangelog, readPinnedCommandChangelog } from "../../../../src/integrations/pi/engine/changelog.js";

interface Entry { readonly major: number; readonly minor: number; readonly patch: number; readonly content: string }
interface PinnedChangelog {
  parseChangelog(path: string): Entry[];
  getNewEntries(entries: Entry[], version: string): Entry[];
  normalizeChangelogLinks(markdown: string, version: Entry): string;
}
const pinned = await import(pathToFileURL(resolve("node_modules/@earendil-works/pi-coding-agent/dist/utils/changelog.js")).href) as PinnedChangelog;
function expected(entries: Entry[], since?: string): string {
  const selected = since === undefined ? [...entries].reverse() : pinned.getNewEntries(entries, since);
  return selected.length === 0 ? since === undefined ? "No changelog entries found." : "" : selected.map(entry => pinned.normalizeChangelogLinks(entry.content, entry)).join("\n\n");
}

describe("published changelog command data", () => {
  it("matches pinned parsing, ordering and release-specific links independently", async () => {
    const directory = await mkdtemp(join(tmpdir(), "a1-changelog-fixture-"));
    const text = [
      "# Changelog", "preamble is not a release", "", "## [3.2.1] - synthetic release", "",
      '[relative](docs/readme.md) [directory](examples/) [root](/README.md "title")',
      "[old](https://github.com/badlogic/pi-mono/blob/main/README.md#usage)",
      "[branch](https://github.com/earendil-works/pi/tree/master/packages/coding-agent)",
      "[query](docs/readme.md?mode=test#part) [fragment](#part) [external](https://example.test/a)",
      "[parent](../../../outside.md) [backslash](docs\\readme.md) [protocol](//example.test/a)",
      "", "## Unreleased", "not included", "", "## 3.1.0", "older release", "", "## [2.9.0]", "oldest release", "",
    ].join("\n");
    try {
      const path = join(directory, "CHANGELOG.md");
      await writeFile(path, text);
      const entries = pinned.parseChangelog(path);
      for (const since of [undefined, "3.1.0", "3.2.1", "2.0.0", "", "invalid"]) {
        expect(formatPinnedCommandChangelog(text, since), String(since)).toBe(expected(entries, since));
      }
      expect(formatPinnedCommandChangelog("# No releases")).toBe("No changelog entries found.");
      expect(formatPinnedCommandChangelog("# No releases", "1.0.0")).toBe("");
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it("reads the owned changelog resource verified against the pinned package instead of a placeholder", async () => {
    const entries = pinned.parseChangelog(join(getPackageDir(), "CHANGELOG.md"));
    expect(entries.length).toBeGreaterThan(0);
    await expect(readPinnedCommandChangelog()).resolves.toBe(expected(entries));
    await expect(readPinnedCommandChangelog("0.84.1")).resolves.toBe(expected(entries, "0.84.1"));
  });
});
