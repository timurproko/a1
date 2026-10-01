import { nextStablePatchVersion, parseReleaseNote, releaseNotePath } from "../release/release-notes.mjs";
import { parseImplementation, metadataBlock } from "./openspec-archive-policy.mjs";

// Provenance: the App identity `release.yml` mints to open the reopening PR.
export const REOPENING_AUTHOR = Object.freeze({ login: "openspec-ci[bot]", id: 329165293, type: "Bot" });
export const REOPENING_VERSION_FILES = Object.freeze(["package-lock.json", "package.json", "packages/a1-install/package.json"]);
const BRANCH = /^chore\/release-((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))-dev$/u;
const NOTE = /^docs\/releases\/((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))\.md$/u;
const SHA = /^[a-f0-9]{40}$/u;

/**
 * Re-verify, at the PR's current head, exactly what `prepare-reopening.mjs` asserts before it
 * proposes the PR. `read(path, ref)` returns file text; `release(tag)` returns the GitHub Release.
 * Any unexpected shape is ineligible, never an error the caller must interpret.
 */
export async function classifyReleaseReopening({ pull, files, repository, read, release }) {
  const refuse = reason => ({ eligible: false, reason });
  const opening = BRANCH.exec(pull?.head?.ref ?? "")?.[1];
  if (!opening) return refuse("head branch is not chore/release-X.Y.Z-dev");
  if (pull.head?.repo?.full_name !== repository || pull.base?.ref !== "develop" || pull.draft !== false) {
    return refuse("reopening PR must be a ready same-repository PR into develop");
  }
  if (pull.user?.login !== REOPENING_AUTHOR.login || pull.user?.id !== REOPENING_AUTHOR.id || pull.user?.type !== REOPENING_AUTHOR.type) {
    return refuse(`reopening PR was not opened by ${REOPENING_AUTHOR.login}`);
  }
  if (!SHA.test(pull.base?.sha ?? "") || !SHA.test(pull.head?.sha ?? "")) return refuse("reopening PR has no exact base and head");
  try {
    if (metadataBlock(pull.body ?? "", "openspec-acceptance-request") || parseImplementation(pull.body ?? "")) {
      return refuse("reopening PR carries lifecycle metadata");
    }
  } catch { return refuse("reopening PR carries invalid lifecycle metadata"); }

  if (!Array.isArray(files) || files.length !== REOPENING_VERSION_FILES.length + 1) return refuse("reopening PR must change exactly four files");
  const notes = files.filter(file => NOTE.test(file?.filename ?? ""));
  const versions = files.filter(file => REOPENING_VERSION_FILES.includes(file?.filename)).map(file => file.filename).sort();
  if (notes.length !== 1 || notes[0].status !== "added" || JSON.stringify(versions) !== JSON.stringify(REOPENING_VERSION_FILES)
    || files.some(file => file.previous_filename !== undefined || (REOPENING_VERSION_FILES.includes(file.filename) && file.status !== "modified"))) {
    return refuse("reopening PR must modify only the three version files and add one release note");
  }
  const released = NOTE.exec(notes[0].filename)[1];
  if (notes[0].filename !== releaseNotePath(released) || nextStablePatchVersion(released) !== opening) {
    return refuse(`release note ${released} does not precede ${opening}-dev`);
  }

  try {
    for (const path of REOPENING_VERSION_FILES) {
      const base = JSON.parse(await read(path, pull.base.sha));
      const head = JSON.parse(await read(path, pull.head.sha));
      if (!declares(base, path, `${released}-dev`) || !declares(head, path, `${opening}-dev`)) {
        return refuse(`${path} must move from ${released}-dev to ${opening}-dev`);
      }
      if (JSON.stringify(withoutVersion(base, path)) !== JSON.stringify(withoutVersion(head, path))) {
        return refuse(`${path} changes more than its version`);
      }
    }
    const published = await release(`v${released}`);
    if (published?.tag_name !== `v${released}` || published.draft !== false || published.prerelease !== false || typeof published.body !== "string") {
      return refuse(`Release v${released} is not published as stable`);
    }
    // Invariant: the same derivation `release-approval.mjs` used for the approved snapshot.
    if (parseReleaseNote(published.body, released).markdown !== await read(notes[0].filename, pull.head.sha)) {
      return refuse(`release note differs from published Release v${released}`);
    }
  } catch (error) {
    return refuse(`reopening content could not be verified: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { eligible: true, reason: `verified release reopening ${released} -> ${opening}-dev`, released, opening };
}

function declares(value, path, version) {
  if (value?.version !== version) return false;
  return path !== "package-lock.json" || value.packages?.[""]?.version === version;
}

function withoutVersion(value, path) {
  const copy = structuredClone(value);
  delete copy.version;
  if (path === "package-lock.json") delete copy.packages[""].version;
  return copy;
}
