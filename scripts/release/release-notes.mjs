import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import semver from "semver";

export const RELEASE_NOTES_SCHEMA = "a1-release-notes-v1";
export const MAX_RELEASE_NOTE_BYTES = 128 * 1024;
export const MAX_RELEASE_NOTES_RESOURCE_BYTES = 1024 * 1024;
const MAX_TITLE_LENGTH = 240;
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const RELEASE_HEADING = /^# A1 \d+\.\d+\.\d+$/gmu;

export function releaseNotePath(version) {
  assertStableVersion(version);
  return `docs/releases/${version}.md`;
}

export function parseReleaseNote(markdown, expectedVersion) {
  assertStableVersion(expectedVersion);
  if (typeof markdown !== "string" || Buffer.byteLength(markdown, "utf8") > MAX_RELEASE_NOTE_BYTES || markdown.includes("\0")) {
    throw new Error("release note is missing or exceeds its bounded text format");
  }
  const version = expectedVersion;
  const normalized = markdown.replaceAll("\r\n", "\n").trimEnd() + "\n";
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(normalized)) throw new Error("release note contains unsafe control characters");
  if ([...normalized.matchAll(RELEASE_HEADING)].length !== 0) throw new Error("release note body must not repeat its release identity");
  if (normalized.trim() === "") throw new Error("release note has no content");
  for (const link of normalized.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/gu)) validateLink(link[1] ?? "");
  for (const link of normalized.matchAll(/<([^>\s]+:[^>]*)>/gu)) validateLink(link[1] ?? "");
  if (/<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^>]*)?\/?>|\b(?:href|src)\s*=/iu.test(normalized)) {
    throw new Error("release note HTML is not supported");
  }
  return Object.freeze({ version, markdown: normalized });
}

export function renderReleaseNoteDraft(version, changes) {
  assertStableVersion(version);
  if (!Array.isArray(changes)) throw new TypeError("release changes must be an array");
  const groups = new Map([
    ["Breaking changes", []],
    ["New features", []],
    ["Fixes", []],
    ["Other changes", []],
  ]);
  const seen = new Set();
  for (const change of [...changes].sort((left, right) => left.number - right.number)) {
    if (!Number.isSafeInteger(change?.number) || change.number < 1 || typeof change.title !== "string" || typeof change.url !== "string") {
      throw new TypeError("release change identity is invalid");
    }
    if (seen.has(change.number)) throw new Error(`duplicate release pull request #${change.number}`);
    seen.add(change.number);
    if (isHousekeeping(change.title)) continue;
    const title = cleanTitle(change.title);
    if (!title) continue;
    if (title.length > MAX_TITLE_LENGTH) throw new Error(`release pull request #${change.number} title is too long`);
    validateLink(change.url);
    const group = /BREAKING CHANGE|^[a-z]+(?:\([^)]*\))?!:/iu.test(change.title) ? "Breaking changes"
      : /^feat(?:\([^)]*\))?:/iu.test(change.title) ? "New features"
      : /^fix(?:\([^)]*\))?:/iu.test(change.title) ? "Fixes"
      : "Other changes";
    groups.get(group).push(`- ${escapeMarkdown(title)} ([#${change.number}](${change.url}))`);
  }
  const sections = [];
  for (const [heading, entries] of groups) if (entries.length > 0) sections.push(`## ${heading}\n\n${entries.join("\n")}`);
  if (sections.length === 0) sections.push("## Other changes\n\n- Maintenance and release readiness updates.");
  return `${sections.join("\n\n")}\n`;
}

export async function buildReleaseNotesResource(directory) {
  let names;
  try { names = await readdir(directory); }
  catch (error) {
    if (error?.code === "ENOENT") return Object.freeze({ schema: RELEASE_NOTES_SCHEMA, releases: Object.freeze([]) });
    throw error;
  }
  const releases = [];
  for (const name of names.sort()) {
    if (!name.endsWith(".md")) continue;
    const expected = basename(name, ".md");
    assertStableVersion(expected);
    releases.push(parseReleaseNote(await readFile(join(directory, name), "utf8"), expected));
  }
  releases.sort((left, right) => semver.rcompare(left.version, right.version));
  return Object.freeze({ schema: RELEASE_NOTES_SCHEMA, releases: Object.freeze(releases) });
}

export function validateReleaseNotesResource(value) {
  if (!value || typeof value !== "object" || value.schema !== RELEASE_NOTES_SCHEMA || !Array.isArray(value.releases)) {
    throw new Error("invalid A1 release notes resource");
  }
  const seen = new Set();
  let previous = null;
  const releases = value.releases.map(item => {
    const parsed = parseReleaseNote(item?.markdown, item?.version);
    if (seen.has(parsed.version)) throw new Error(`duplicate release note ${parsed.version}`);
    if (previous !== null && semver.gte(parsed.version, previous)) throw new Error("release notes are not newest first");
    seen.add(parsed.version); previous = parsed.version;
    return parsed;
  });
  return Object.freeze({ schema: RELEASE_NOTES_SCHEMA, releases: Object.freeze(releases) });
}

function assertStableVersion(version) {
  if (typeof version !== "string" || !STABLE.test(version) || semver.valid(version) !== version) throw new Error(`invalid stable release-note version: ${String(version)}`);
}

function isHousekeeping(title) {
  return /^chore\(release\):/iu.test(title) || /^docs\(openspec\):/iu.test(title);
}

function cleanTitle(title) {
  return title.replace(/^[a-z]+(?:\([^)]*\))?!?:\s*/iu, "").replace(/\s+/gu, " ").trim();
}

function validateLink(target) {
  if (target.startsWith("https://")) {
    const url = new URL(target);
    if (!url.hostname || url.username || url.password) throw new Error(`release note contains unsafe link: ${target}`);
    return;
  }
  if (!target || target.startsWith("/") || target.includes("\\") || target.split(/[/?#]/u).includes("..")
    || /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(target)) throw new Error(`release note contains unsafe link: ${target}`);
}

function escapeMarkdown(value) {
  return value.replaceAll("\\", "\\\\").replace(/([\[\]*_`])/gu, "\\$1");
}
