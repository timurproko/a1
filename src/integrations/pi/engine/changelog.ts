import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { posix } from "node:path";
import type ChangelogResource from "./resources/changelog.json";

type Release = { readonly version: readonly number[]; readonly markdown: string };
const REPOSITORY = "https://github.com/earendil-works/pi";

export async function readPinnedCommandChangelog(sinceVersion?: string): Promise<string> {
  const path = new URL("./resources/changelog.json", import.meta.url);
  if (!existsSync(path)) return sinceVersion === undefined ? "No changelog entries found." : "";
  try {
    const resource: unknown = JSON.parse(await readFile(path, "utf8"));
    if (!resource || typeof resource !== "object" || !("data" in resource) || typeof resource.data !== "string") throw new TypeError("Invalid owned changelog resource");
    const markdown: (typeof ChangelogResource)["data"] = resource.data;
    return formatPinnedCommandChangelog(markdown, sinceVersion);
  } catch (error) {
    // Compatibility: Pi's data-file parser reports a warning and supplies an empty changelog.
    console.error(`Warning: Could not parse changelog: ${error}`);
    return sinceVersion === undefined ? "No changelog entries found." : "";
  }
}

export function formatPinnedCommandChangelog(content: string, sinceVersion?: string): string {
  // Provenance: behavior follows Pi 0.84.2 utils/changelog.ts at 914cf1472e715297caa30db4b9535d534a9eb718.
  // Runtime reads only the owned data resource; maintenance tooling verifies its pinned provenance.
  let releases = content.split(/(?=^## )/m).flatMap((section): Release[] => {
    const version = /^##\s+\[?(\d+)\.(\d+)\.(\d+)\]?/.exec(section);
    return version ? [{ version: version.slice(1).map(Number), markdown: section.trim() }] : [];
  });
  if (sinceVersion !== undefined) {
    const previous = sinceVersion.split(".").map(value => Number(value) || 0);
    releases = releases.filter(release => {
      for (let index = 0; index < 3; index++) {
        const difference = release.version[index]! - (previous[index] ?? 0);
        if (difference !== 0) return difference > 0;
      }
      return false;
    });
  } else releases.reverse();
  if (releases.length === 0) return sinceVersion === undefined ? "No changelog entries found." : "";
  return releases.map(release => release.markdown.replace(
    /(!?\[[^\]\n]+\]\()([^\s)]+)((?:\s+[^)]*)?\))/g,
    (_match, prefix: string, target: string, suffix: string) => `${prefix}${releaseLink(target, `v${release.version.join(".")}`)}${suffix}`,
  )).join("\n\n");
}

function releaseLink(target: string, tag: string): string {
  const canonical = target
    .replace(/^https:\/\/github\.com\/(?:badlogic|earendil-works)\/pi-mono(?=\/|$)/, REPOSITORY)
    .replace(/^(https:\/\/github\.com\/earendil-works\/pi\/(?:blob|tree)\/)(?:main|master)\//, `$1${tag}/`);
  if (/^(?:#|\/\/|[a-z][a-z0-9+.-]*:)/i.test(canonical)) return canonical;
  const boundary = canonical.search(/[?#]/);
  const path = boundary === -1 ? canonical : canonical.slice(0, boundary);
  const suffix = boundary === -1 ? "" : canonical.slice(boundary);
  if (!path) return canonical;
  const normalized = path.replaceAll("\\", "/");
  const repositoryPath = posix.normalize(normalized.startsWith("/") ? normalized.replace(/^\/+/, "") : posix.join("packages/coding-agent", normalized));
  if (repositoryPath === "." || repositoryPath === ".." || repositoryPath.startsWith("../")) return canonical;
  const route = path.endsWith("/") || !posix.basename(repositoryPath).includes(".") ? "tree" : "blob";
  return `${REPOSITORY}/${route}/${tag}/${encodeURI(repositoryPath)}${suffix}`;
}
