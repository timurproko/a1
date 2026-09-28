import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { readPackagedReleaseNotes } from "../../../src/features/owned-ui/release-notes.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true }))));

async function resource(releases: unknown[]): Promise<URL> {
  const root = await mkdtemp(join(tmpdir(), "a1-release-notes-resource-"));
  roots.push(root);
  const file = join(root, "release-notes.json");
  await writeFile(file, JSON.stringify({ schema: "a1-release-notes-v1", releases }));
  return pathToFileURL(file);
}

describe("packaged A1 release notes", () => {
  it("loads newest-first history and matches only an exact stable package version", async () => {
    const notes = await readPackagedReleaseNotes(await resource([
      { version: "2.0.0", markdown: "# A1 2.0.0\n\n- newest\n" },
      { version: "1.0.0", markdown: "# A1 1.0.0\n\n- oldest\n" },
    ]));
    expect(notes.releases.map(note => note.version)).toEqual(["2.0.0", "1.0.0"]);
    expect(notes.completeMarkdown.indexOf("2.0.0")).toBeLessThan(notes.completeMarkdown.indexOf("1.0.0"));
    expect(notes.current("2.0.0")?.markdown).toContain("newest");
    expect(notes.current("2.0.0-dev")).toBeNull();
    expect(notes.current("3.0.0")).toBeNull();
  });

  it.each([
    [{ version: "1.0.0", markdown: "# A1 1.0.1\n\n- mismatch\n" }],
    [{ version: "1.0.0", markdown: "# A1 1.0.0\n\n- [bad](javascript:run)\n" }],
    [{ version: "1.0.0", markdown: "# A1 1.0.0\n\n<div>bad</div>\n" }],
    [{ version: "1.0.0", markdown: "# A1 1.0.0\n\n# A1 1.0.0\n" }],
  ])("rejects a malformed packaged entry", async entry => {
    await expect(readPackagedReleaseNotes(await resource([entry]))).rejects.toThrow(/invalid/i);
  });

  it("rejects duplicate or non-descending versions", async () => {
    const markdown = (version: string) => `# A1 ${version}\n\n- note\n`;
    await expect(readPackagedReleaseNotes(await resource([
      { version: "1.0.0", markdown: markdown("1.0.0") },
      { version: "2.0.0", markdown: markdown("2.0.0") },
    ]))).rejects.toThrow(/order/i);
    await expect(readPackagedReleaseNotes(await resource([
      { version: "1.0.0", markdown: markdown("1.0.0") },
      { version: "1.0.0", markdown: markdown("1.0.0") },
    ]))).rejects.toThrow(/order/i);
  });
});
