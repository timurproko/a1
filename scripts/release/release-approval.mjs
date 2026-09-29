import { createHash } from "node:crypto";
import semver from "semver";
import { parseReleaseNote } from "./release-notes.mjs";

const SHA = /^[a-f0-9]{40}$/u;
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

/** Workflow that validates a prepared stable source before its draft may be published. */
export const STABLE_VALIDATION_WORKFLOW = ".github/workflows/release-candidate.yml";

/** Whether an Actions run is candidate validation of exactly this source and stable version. */
export function matchesStableValidationRun(run, source, version) {
  return run?.path === STABLE_VALIDATION_WORKFLOW && run.event === "workflow_dispatch" && run.head_branch === "develop"
    && run.head_sha === source && typeof run.display_title === "string" && run.display_title.startsWith(`Stable candidate v${version} `);
}

/** Requires one successful candidate validation of the published source; publication never substitutes a run. */
export function requireStableValidation(runs, source, version) {
  if (!Array.isArray(runs)) throw new Error("GitHub workflow run response is invalid");
  const passed = runs.filter(run => matchesStableValidationRun(run, source, version) && run.status === "completed" && run.conclusion === "success");
  if (passed.length === 0) throw new Error(`no successful candidate validation of ${source} as ${version}; wait for or rerun it, then publish the draft again`);
  return passed[0];
}

export function assertAuthorizedApprovalActor(actor, permission, expectedLogin) {
  if (!actor || actor.login !== expectedLogin || typeof actor.login !== "string" || !/^[A-Za-z0-9-]+$/u.test(actor.login)
    || actor.type !== "User" || !["admin", "maintain", "write"].includes(permission?.permission)) {
    throw new Error("stable approval actor is not an authorized human repository user");
  }
  return actor.login;
}

export function validateStableApproval(input) {
  const {
    version, source, releases, expectedReleaseId, application, lock, installer, existingApplication, existingInstaller,
    published = false, tag = null,
  } = input ?? {};
  if (typeof version !== "string" || !STABLE.test(version) || semver.valid(version) !== version || !SHA.test(source ?? "")) {
    throw new Error("stable approval version or source identity is invalid");
  }
  if (!Array.isArray(releases) || releases.length >= 100) throw new Error("GitHub release response is invalid or exceeds its bounded page");
  const matches = releases.filter(item => item?.tag_name === `v${version}`);
  if (matches.length !== 1) throw new Error(`stable approval found ${matches.length} Releases for v${version}; expected exactly one`);
  const release = matches[0];
  if (!Number.isSafeInteger(release.id) || release.id < 1
    || (expectedReleaseId !== undefined && release.id !== expectedReleaseId) || release.name !== `v${version}`
    || release.target_commitish !== source || release.draft !== !published || release.prerelease !== false || typeof release.body !== "string") {
    throw new Error(`stable approval does not identify the expected source-bound ${published ? "published" : "draft"} Release`);
  }
  // Invariant: GitHub creates the tag at the bound source when the draft is published; a draft has none yet.
  if (published ? tag?.object?.type !== "commit" || tag.object.sha !== source : tag !== null) {
    throw new Error(published ? `v${version} does not point at the published source ${source}` : `v${version} already exists; publish the draft instead of pushing a tag`);
  }
  const openCore = /^(\d+\.\d+\.\d+)-dev$/.exec(application?.version)?.[1];
  if (!openCore || semver.valid(application.version) !== application.version || application.version !== installer?.version
    || lock?.version !== application.version || lock?.packages?.[""]?.version !== application.version
    || typeof application.name !== "string" || typeof installer?.name !== "string" || !installer.name.endsWith("/a1-install")
    || semver.lt(version, openCore)) {
    throw new Error("authoritative source must declare one compatible open development version before stable approval");
  }
  if (existingApplication || existingInstaller) throw new Error("stable approval refuses an existing or partial npm package pair");
  const note = parseReleaseNote(release.body, version);
  const sha256 = createHash("sha256").update(note.markdown, "utf8").digest("hex");
  return Object.freeze({ release, note, sha256 });
}
