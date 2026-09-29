import { createHash } from "node:crypto";
import semver from "semver";
import { parseReleaseNote } from "./release-notes.mjs";

const SHA = /^[a-f0-9]{40}$/u;
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

export function assertAuthorizedApprovalActor(actor, permission, expectedLogin) {
  if (!actor || actor.login !== expectedLogin || typeof actor.login !== "string" || !/^[A-Za-z0-9-]+$/u.test(actor.login)
    || actor.type !== "User" || !["admin", "maintain", "write"].includes(permission?.permission)) {
    throw new Error("stable approval actor is not an authorized human repository user");
  }
  return actor.login;
}

export function validateStableApproval(input) {
  const {
    version, source, authoritativeSource = source, recovery = false, releases,
    application, lock, installer,
    authoritativeApplication = application, authoritativeLock = lock, authoritativeInstaller = installer,
    existingApplication, existingInstaller,
  } = input ?? {};
  if (typeof version !== "string" || !STABLE.test(version) || semver.valid(version) !== version
    || !SHA.test(source ?? "") || !SHA.test(authoritativeSource ?? "") || typeof recovery !== "boolean") {
    throw new Error("stable approval version or source identity is invalid");
  }
  if ((!recovery && source !== authoritativeSource) || (recovery && semver.valid(authoritativeApplication?.version) !== authoritativeApplication.version)) {
    throw new Error("stable approval source does not match its normal or orphan-tag authority");
  }
  if (!Array.isArray(releases) || releases.length >= 100) throw new Error("GitHub release response is invalid or exceeds its bounded page");
  const matches = releases.filter(item => item?.tag_name === `v${version}`);
  if (matches.length !== 1) throw new Error(`stable approval found ${matches.length} Releases for v${version}; expected exactly one draft`);
  const release = matches[0];
  if (!Number.isSafeInteger(release.id) || release.id < 1 || release.name !== `v${version}`
    || release.target_commitish !== source || release.draft !== true || release.prerelease !== false || typeof release.body !== "string") {
    throw new Error("stable approval does not identify the expected source-bound draft Release");
  }
  const openCore = /^(\d+\.\d+\.\d+)-dev$/.exec(application?.version)?.[1];
  if (!openCore || semver.valid(application.version) !== application.version || application.version !== installer?.version
    || lock?.version !== application.version || lock?.packages?.[""]?.version !== application.version
    || typeof application.name !== "string" || typeof installer?.name !== "string" || !installer.name.endsWith("/a1-install")
    || authoritativeApplication?.name !== application.name || authoritativeApplication.version !== application.version
    || authoritativeLock?.version !== application.version || authoritativeLock?.packages?.[""]?.version !== application.version
    || authoritativeInstaller?.name !== installer.name || authoritativeInstaller.version !== application.version
    || semver.lt(version, openCore)) {
    throw new Error("tagged and authoritative sources must declare one compatible open development version before stable approval");
  }
  if (existingApplication || existingInstaller) throw new Error("stable approval refuses an existing or partial npm package pair");
  const note = parseReleaseNote(release.body, version);
  const sha256 = createHash("sha256").update(note.markdown, "utf8").digest("hex");
  return Object.freeze({ release, note, sha256 });
}
