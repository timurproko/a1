import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
import { readPackedManifest } from "../governance/candidate-evidence.mjs";
import { entryHeaderFingerprint, replaceTarEntryContent, walkTarEntries } from "./packed-tar.mjs";
import { MAX_RELEASE_NOTES_RESOURCE_BYTES, RELEASE_NOTES_SCHEMA, parseReleaseNote, validateReleaseNotesResource } from "./release-notes.mjs";

/** The only packaged entry that carries the release note; stable publication may re-derive nothing else. */
export const RELEASE_NOTES_ENTRY = "package/dist/features/owned-ui/resources/release-notes.json";
const SHA = /^[a-f0-9]{40}$/u;
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const RERUN = "rerun candidate validation of this source and version, then publish the draft again";

/**
 * Adopts the package pair a successful candidate validation run retained. The bytes are kept
 * unchanged when the published note derives the packaged resource; otherwise only that
 * resource is replaced, and every other entry plus the installer are proven identical.
 */
export function adoptValidatedCandidate(input) {
  const { candidate, candidateIdentity, installer, installerIdentity, source, tree, version, approvedNote } = input ?? {};
  if (!SHA.test(source ?? "") || !SHA.test(tree ?? "") || typeof version !== "string" || !STABLE.test(version)) {
    throw new Error("candidate adoption source, tree, or version is invalid");
  }
  verifyIdentity(candidate, candidateIdentity, "a1-packed-candidate-v1", "candidate", { source, tree, version });
  verifyIdentity(installer, installerIdentity, "a1-packed-installer-v1", "installer", { source, tree, version });

  const note = parseReleaseNote(approvedNote, version);
  const archive = gunzipSync(candidate);
  const entries = walkTarEntries(archive);
  const matches = entries.filter(entry => entry.path === RELEASE_NOTES_ENTRY);
  if (matches.length !== 1) throw new Error(`validated candidate holds ${matches.length} release-note resources; ${RERUN}`);
  const [resourceEntry] = matches;
  const resource = deriveResource(resourceEntry.content, note);
  if (resource.equals(resourceEntry.content)) {
    assertPackagedNote(candidate, note);
    return { candidate, installer, noteChanged: false };
  }

  const swapped = replaceTarEntryContent(archive, resourceEntry, resource);
  const before = entries.map(entry => entryHeaderFingerprint(entry, archive));
  const after = walkTarEntries(swapped).map(entry => entryHeaderFingerprint(entry, swapped));
  const changed = after.filter((entry, index) => JSON.stringify(entry) !== JSON.stringify(before[index]));
  if (after.length !== before.length || after.some((entry, index) => entry.path !== before[index].path)
    || changed.length !== 1 || changed[0].path !== RELEASE_NOTES_ENTRY || changed[0].header !== before[entries.indexOf(resourceEntry)].header) {
    throw new Error(`release-note swap would change more than ${RELEASE_NOTES_ENTRY}; ${RERUN}`);
  }
  const bytes = gzipSync(swapped);
  assertPackagedNote(bytes, note);
  return { candidate: bytes, installer, noteChanged: true };
}

function verifyIdentity(bytes, identity, schema, name, expected) {
  if (!Buffer.isBuffer(bytes)) throw new Error(`validated ${name} package is missing; ${RERUN}`);
  const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  const shasum = createHash("sha1").update(bytes).digest("hex");
  const manifest = readPackedManifest(bytes);
  if (identity?.schema !== schema || identity.source?.commit !== expected.source || identity.source?.tree !== expected.tree
    || identity.package?.version !== expected.version || manifest.version !== expected.version || identity.package?.name !== manifest.name
    || identity.package?.integrity !== integrity || identity.package?.shasum !== shasum) {
    throw new Error(`validated ${name} package does not bind source ${expected.source}, its tree, version ${expected.version}, and its recorded integrity; ${RERUN}`);
  }
}

/** Serializes exactly as generate-release-notes-resource.mjs does, replacing only this version's note. */
function deriveResource(content, note) {
  const packaged = validateReleaseNotesResource(JSON.parse(content.toString("utf8")));
  if (!packaged.releases.some(release => release.version === note.version)) {
    throw new Error(`validated candidate does not contain a ${note.version} release note; ${RERUN}`);
  }
  const releases = packaged.releases.map(release => release.version === note.version ? note : release);
  const serialized = Buffer.from(`${JSON.stringify({ schema: RELEASE_NOTES_SCHEMA, releases }, null, 2)}\n`, "utf8");
  if (serialized.length > MAX_RELEASE_NOTES_RESOURCE_BYTES) throw new Error("published release note makes the packaged resource exceed its bounded format");
  return serialized;
}

/** Applies the packaged release-note validation to the bytes that will be published. */
function assertPackagedNote(tarball, note) {
  const entry = walkTarEntries(gunzipSync(tarball)).find(candidate => candidate.path === RELEASE_NOTES_ENTRY);
  const packaged = validateReleaseNotesResource(JSON.parse(entry.content.toString("utf8")))
    .releases.find(release => release.version === note.version);
  if (packaged?.markdown !== note.markdown) throw new Error(`packaged ${note.version} release note differs from the published body`);
}

async function main() {
  const { CANDIDATE_DIRECTORY: input, OUTPUT_DIRECTORY: output, SOURCE_SHA: source, RELEASE_VERSION: version, APPROVED_NOTE_PATH: notePath } = process.env;
  if (!input || !output || !notePath) throw new Error("CANDIDATE_DIRECTORY, OUTPUT_DIRECTORY, and APPROVED_NOTE_PATH are required");
  const read = async name => {
    try { return await readFile(resolve(input, name)); }
    catch (error) { throw new Error(`candidate artifact lacks ${name}; ${RERUN}`, { cause: error }); }
  };
  const [candidate, candidateIdentity, installer, installerIdentity, approvedNote] = await Promise.all([
    read("candidate.tgz"), read("candidate-identity.json"), read("installer.tgz"), read("installer-identity.json"), readFile(notePath, "utf8"),
  ]);
  const tree = execFileSync("git", ["rev-parse", `${source}^{tree}`], { encoding: "utf8" }).trim();
  const adopted = adoptValidatedCandidate({
    candidate, installer, source, tree, version, approvedNote,
    candidateIdentity: JSON.parse(candidateIdentity.toString("utf8")), installerIdentity: JSON.parse(installerIdentity.toString("utf8")),
  });
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, "candidate.tgz"), adopted.candidate);
  await writeFile(resolve(output, "installer.tgz"), adopted.installer);
  process.stdout.write(adopted.noteChanged
    ? `Adopted the validated ${version} pair; replaced only ${RELEASE_NOTES_ENTRY} with the published note.\n`
    : `Adopted the validated ${version} pair unchanged; the published note equals the validated one.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`::error::${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
