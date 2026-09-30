import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { readPackedEntries } from "../../scripts/governance/candidate-evidence.mjs";
import { adoptValidatedCandidate, RELEASE_NOTES_ENTRY } from "../../scripts/release/adopt-validated-candidate.mjs";

const version = "0.2.2";
const source = "a".repeat(40);
const tree = "b".repeat(40);
const validatedNote = "## [0.2.2] - 2026-09-29\n\n### Fixed\n\n- Validated draft entry.\n";
const olderNote = { version: "0.2.1", markdown: "## [0.2.1] - 2026-09-01\n\n### Fixed\n\n- Earlier release.\n" };

describe("adoptValidatedCandidate", () => {
  it("publishes the validated bytes unchanged when the published note is the validated one", () => {
    const pair = candidatePair();
    const adopted = adoptValidatedCandidate({ ...pair, approvedNote: `${validatedNote}\n\n` });
    expect(adopted.noteChanged).toBe(false);
    expect(adopted.candidate).toBe(pair.candidate);
    expect(adopted.installer).toBe(pair.installer);
  });

  it("replaces only the release-note resource when the maintainer edited the note", () => {
    const pair = candidatePair();
    const edited = `## [0.2.2] - 2026-09-30\n\n### Fixed\n\n${"- Reviewed and expanded entry.\n".repeat(40)}`;
    const adopted = adoptValidatedCandidate({ ...pair, approvedNote: edited });
    expect(adopted.noteChanged).toBe(true);
    expect(adopted.installer).toBe(pair.installer);
    const before = readPackedEntries(pair.candidate);
    const after = readPackedEntries(adopted.candidate);
    expect(after.map(entry => [entry.path, entry.mode, entry.type])).toEqual(before.map(entry => [entry.path, entry.mode, entry.type]));
    for (const [index, entry] of after.entries()) {
      if (entry.path === RELEASE_NOTES_ENTRY) continue;
      expect(entry.content.equals(before[index]!.content), entry.path).toBe(true);
    }
    const resource = JSON.parse(after.find(entry => entry.path === RELEASE_NOTES_ENTRY)!.content.toString("utf8"));
    expect(resource).toEqual({ schema: "a1-release-notes-v1", releases: [{ version, markdown: edited }, olderNote] });
    const headers = (tarball: Buffer) => {
      const archive = gunzipSync(tarball);
      const offset = archive.indexOf(Buffer.from(RELEASE_NOTES_ENTRY.slice(0, 100)));
      return archive.subarray(offset + 136, offset + 148).toString("ascii");
    };
    expect(headers(adopted.candidate)).toBe(headers(pair.candidate));
  });

  it.each([
    ["source", { source: "c".repeat(40) }],
    ["tree", { tree: "d".repeat(40) }],
    ["version", { version: "0.2.3" }],
  ])("refuses a candidate bound to another %s", (_name, override) => {
    const pair = candidatePair();
    expect(() => adoptValidatedCandidate({ ...pair, ...override, approvedNote: validatedNote })).toThrow(/rerun candidate validation/u);
  });

  it("refuses a candidate whose bytes differ from its recorded integrity", () => {
    const pair = candidatePair();
    const extra = packTarball([...applicationEntries(validatedNote), entry("package/dist/extra.js", "injected")]);
    expect(() => adoptValidatedCandidate({ ...pair, candidate: extra, approvedNote: validatedNote })).toThrow(/recorded integrity/u);
    const installer = packTarball(installerEntries("0.2.2", "#!/usr/bin/env node\nchanged\n"));
    expect(() => adoptValidatedCandidate({ ...pair, installer, approvedNote: validatedNote })).toThrow(/validated installer package/u);
  });

  it("refuses a published note that would exceed the bounded resource format", () => {
    const large = Array.from({ length: 8 }, (_, index) => ({ version: `0.1.${7 - index}`, markdown: `${"a".repeat(120_000)}\n` }));
    const pair = candidatePair(validatedNote, [olderNote, ...large]);
    expect(() => adoptValidatedCandidate({ ...pair, approvedNote: `${"b".repeat(100_000)}\n` })).toThrow(/exceed its bounded format/u);
  });

  it("refuses a candidate that does not package this version's note", () => {
    const pair = candidatePair(null);
    expect(() => adoptValidatedCandidate({ ...pair, approvedNote: validatedNote })).toThrow(/does not contain a 0\.2\.2 release note/u);
  });
});

function candidatePair(note: string | null = validatedNote, older = [olderNote]) {
  const candidate = packTarball(applicationEntries(note, older));
  const installer = packTarball(installerEntries(version));
  return {
    candidate, installer, source, tree, version,
    candidateIdentity: identity("a1-packed-candidate-v1", "@timurproko/a1", candidate),
    installerIdentity: identity("a1-packed-installer-v1", "@timurproko/a1-install", installer),
  };
}

function identity(schema: string, name: string, bytes: Buffer) {
  return {
    schema, source: { commit: source, tree, pullRequest: null },
    package: { name, version, integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`, shasum: createHash("sha1").update(bytes).digest("hex") },
  };
}

function applicationEntries(note: string | null, older = [olderNote]) {
  const releases = [...(note === null ? [] : [{ version, markdown: note }]), ...older];
  return [
    entry("package/package.json", JSON.stringify({ name: "@timurproko/a1", version, bin: { fixture: "dist/cli.js" } })),
    entry("package/dist/cli.js", "#!/usr/bin/env node\n", 0o755),
    entry(RELEASE_NOTES_ENTRY, `${JSON.stringify({ schema: "a1-release-notes-v1", releases }, null, 2)}\n`),
    entry("package/dist/native/linux-x64/process-guardian", Buffer.alloc(1300, 7), 0o755),
  ];
}

function installerEntries(installerVersion: string, script = "#!/usr/bin/env node\n") {
  return [
    entry("package/package.json", JSON.stringify({ name: "@timurproko/a1-install", version: installerVersion, bin: { install: "bin/install.js" } })),
    entry("package/bin/install.js", script, 0o755),
  ];
}

function entry(path: string, content: string | Buffer, mode = 0o644) {
  return { path, content: Buffer.isBuffer(content) ? content : Buffer.from(content), mode };
}

function packTarball(entries: ReturnType<typeof entry>[]): Buffer {
  return gzipSync(Buffer.concat([...entries.map(item => tarEntry(item.path, item.content, item.mode)), Buffer.alloc(1024)]));
}

function tarEntry(path: string, content: Buffer, mode: number): Buffer {
  if (path.length > 100) throw new Error("fixture path exceeds the ustar name field");
  const header = Buffer.alloc(512);
  header.write(path, 0, "utf8");
  header.write(`${mode.toString(8).padStart(7, "0")}\0`, 100, "ascii");
  header.write(`${content.length.toString(8).padStart(11, "0")}\0`, 124, "ascii");
  header.write(`${(1_700_000_000).toString(8).padStart(11, "0")}\0`, 136, "ascii");
  header[156] = "0".charCodeAt(0);
  header.write("ustar\0", 257, "ascii");
  header.fill(0x20, 148, 156);
  let sum = 0;
  for (const byte of header) sum += byte;
  header.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148, "ascii");
  const padding = Buffer.alloc(Math.ceil(content.length / 512) * 512 - content.length);
  return Buffer.concat([header, content, padding]);
}
