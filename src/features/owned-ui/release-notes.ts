import { readFile } from "node:fs/promises";
import semver from "semver";

const RESOURCE_SCHEMA = "a1-release-notes-v1";
const MAX_RESOURCE_BYTES = 1024 * 1024;
const MAX_NOTE_BYTES = 128 * 1024;
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

export interface PackagedReleaseNote {
  readonly version: string;
  readonly markdown: string;
}

export interface ReleaseNoteCatalog {
  readonly releases: readonly PackagedReleaseNote[];
  readonly completeMarkdown: string;
  current(version: string): PackagedReleaseNote | null;
}

export async function readPackagedReleaseNotes(
  path: URL = new URL("./resources/release-notes.json", import.meta.url),
): Promise<ReleaseNoteCatalog> {
  const bytes = await readFile(path);
  if (bytes.length > MAX_RESOURCE_BYTES) throw new Error("A1 release notes resource is too large");
  const value: unknown = JSON.parse(bytes.toString("utf8"));
  if (!value || typeof value !== "object" || (value as { schema?: unknown }).schema !== RESOURCE_SCHEMA
    || !Array.isArray((value as { releases?: unknown }).releases)) throw new Error("A1 release notes resource is invalid");
  const seen = new Set<string>();
  let previous: string | null = null;
  const releases = (value as { releases: unknown[] }).releases.map((item): PackagedReleaseNote => {
    const release = item as { version?: unknown; markdown?: unknown };
    if (typeof release.version !== "string" || !STABLE.test(release.version) || semver.valid(release.version) !== release.version
      || typeof release.markdown !== "string" || !validMarkdown(release.markdown, release.version)) {
      throw new Error("A1 release note entry is invalid");
    }
    if (seen.has(release.version) || (previous !== null && semver.gte(release.version, previous))) {
      throw new Error("A1 release note order is invalid");
    }
    seen.add(release.version); previous = release.version;
    return Object.freeze({ version: release.version, markdown: release.markdown.replaceAll("\r\n", "\n").trimEnd() });
  });
  const frozen = Object.freeze(releases);
  return Object.freeze({
    releases: frozen,
    completeMarkdown: frozen.length === 0 ? "No A1 release notes found." : frozen.map(release => release.markdown).join("\n\n"),
    current: (version: string) => STABLE.test(version) ? frozen.find(release => release.version === version) ?? null : null,
  });
}

function validMarkdown(markdown: string, version: string): boolean {
  if (Buffer.byteLength(markdown, "utf8") > MAX_NOTE_BYTES || !markdown.startsWith(`# A1 ${version}\n`)
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(markdown)
    || [...markdown.matchAll(/^# A1 \d+\.\d+\.\d+$/gmu)].length !== 1
    || markdown.split("\n").slice(1).every(line => line.trim() === "")
    || /<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^>]*)?\/?>|\b(?:href|src)\s*=/iu.test(markdown)) return false;
  const links = [
    ...[...markdown.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/gu)].map(match => match[1] ?? ""),
    ...[...markdown.matchAll(/<([^>\s]+:[^>]*)>/gu)].map(match => match[1] ?? ""),
  ];
  return links.every(safeLink);
}

function safeLink(target: string): boolean {
  if (target.startsWith("https://")) {
    try {
      const url = new URL(target);
      return Boolean(url.hostname) && !url.username && !url.password;
    } catch { return false; }
  }
  return Boolean(target) && !target.startsWith("/") && !target.includes("\\")
    && !target.split(/[/?#]/u).includes("..") && !/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(target);
}
