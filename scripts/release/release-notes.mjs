import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

export const RELEASE_NOTES_SCHEMA = "a1-release-notes-v1";
export const MAX_RELEASE_NOTE_BYTES = 128 * 1024;
export const MAX_RELEASE_NOTES_RESOURCE_BYTES = 1024 * 1024;
const MAX_TITLE_LENGTH = 240;
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const RELEASE_HEADING = /^# A1 \d+\.\d+\.\d+$/gmu;
const CHANGELOG_HEADING = /^## \[((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))\] - (\d{4}-\d{2}-\d{2})$/gmu;

export function releaseNotePath(version) {
  assertStableVersion(version);
  return `docs/releases/${version}.md`;
}

export function nextStablePatchVersion(version) {
  const [major, minor, patch] = stableVersionComponents(version);
  return `${major}.${minor}.${BigInt(patch) + 1n}`;
}

export function parseReleaseNote(markdown, expectedVersion) {
  assertStableVersion(expectedVersion);
  if (typeof markdown !== "string" || Buffer.byteLength(markdown, "utf8") > MAX_RELEASE_NOTE_BYTES || markdown.includes("\0")) {
    throw new Error("release note is missing or exceeds its bounded text format");
  }
  const version = expectedVersion;
  const normalized = markdown.replaceAll("\r\n", "\n").trimEnd() + "\n";
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(normalized)) throw new Error("release note contains unsafe control characters");
  if ([...normalized.matchAll(RELEASE_HEADING)].length !== 0) throw new Error("release note body must not use the redundant A1 release heading");
  const headings = [...normalized.matchAll(CHANGELOG_HEADING)];
  if (headings.length > 1 || (headings.length === 1 && (headings[0][1] !== expectedVersion || !isCalendarDate(headings[0][2])))) {
    throw new Error(`release note changelog heading must identify ${expectedVersion} with a valid date`);
  }
  if (normalized.trim() === "") throw new Error("release note has no content");
  for (const link of normalized.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/gu)) validateLink(link[1] ?? "");
  for (const link of normalized.matchAll(/<([^>\s]+:[^>]*)>/gu)) validateLink(link[1] ?? "");
  if (/<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^>]*)?\/?>|\b(?:href|src)\s*=/iu.test(normalized)) {
    throw new Error("release note HTML is not supported");
  }
  return Object.freeze({ version, markdown: normalized });
}

export function renderReleaseNoteDraft(version, changes, date = new Date().toISOString().slice(0, 10)) {
  assertStableVersion(version);
  if (!Array.isArray(changes)) throw new TypeError("release changes must be an array");
  if (!isCalendarDate(date)) throw new TypeError("release-note date must be an exact UTC calendar date");
  const groups = new Map([
    ["Breaking Changes", []],
    ["New Features", []],
    ["Added", []],
    ["Changed", []],
    ["Fixed", []],
  ]);
  const seen = new Set();
  for (const change of [...changes].sort((left, right) => left.number - right.number)) {
    if (!Number.isSafeInteger(change?.number) || change.number < 1 || typeof change.title !== "string" || typeof change.url !== "string") {
      throw new TypeError("release change identity is invalid");
    }
    if (seen.has(change.number)) throw new Error(`duplicate release pull request #${change.number}`);
    seen.add(change.number);
    const breaking = isBreaking(change.title);
    if (!breaking && isHousekeeping(change.title)) continue;
    const title = cleanTitle(change.title);
    if (!title) continue;
    if (title.length > MAX_TITLE_LENGTH) throw new Error(`release pull request #${change.number} title is too long`);
    validateLink(change.url);
    const group = breaking ? "Breaking Changes"
      : /^feat(?:\([^)]*\))?:/iu.test(change.title) ? "New Features"
      : /^add(?:\([^)]*\))?:/iu.test(change.title) ? "Added"
      : /^fix(?:\([^)]*\))?:/iu.test(change.title) ? "Fixed"
      : "Changed";
    groups.get(group).push(`- ${escapeMarkdown(title)} ([#${change.number}](${change.url}))`);
  }
  const sections = [];
  for (const [heading, entries] of groups) if (entries.length > 0) sections.push(`### ${heading}\n\n${entries.join("\n")}`);
  if (sections.length === 0) sections.push("### Changed\n\n- No user-facing changes.");
  return `## [${version}] - ${date}\n\n${sections.join("\n\n")}\n`;
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
  releases.sort((left, right) => compareStableVersions(right.version, left.version));
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
    if (previous !== null && compareStableVersions(parsed.version, previous) >= 0) throw new Error("release notes are not newest first");
    seen.add(parsed.version); previous = parsed.version;
    return parsed;
  });
  return Object.freeze({ schema: RELEASE_NOTES_SCHEMA, releases: Object.freeze(releases) });
}

function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function assertStableVersion(version) {
  stableVersionComponents(version);
}

function stableVersionComponents(version) {
  const match = typeof version === "string" ? STABLE.exec(version) : null;
  const components = match?.slice(1).map(Number);
  if (!components?.every(Number.isSafeInteger)) throw new Error(`invalid stable release-note version: ${String(version)}`);
  return components;
}

function compareStableVersions(left, right) {
  const leftComponents = stableVersionComponents(left);
  const rightComponents = stableVersionComponents(right);
  for (let index = 0; index < leftComponents.length; index += 1) {
    if (leftComponents[index] !== rightComponents[index]) return leftComponents[index] < rightComponents[index] ? -1 : 1;
  }
  return 0;
}

function isBreaking(title) {
  return /BREAKING CHANGE|^[a-z]+(?:\([^)]*\))?!:/iu.test(title);
}

function isHousekeeping(title) {
  if (/^chore\(pi\):\s*upgrade pinned Pi to\s+/iu.test(title)) return false;
  return /^chore(?:\([^)]*\))?:/iu.test(title)
    || /^docs\(openspec\):/iu.test(title)
    || /^fix\(regression\):\s*repair the \d{4}-\d{2}-\d{2}(?:-\d+)* (?:full regression|publish|release) failure\s*$/iu.test(title);
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
