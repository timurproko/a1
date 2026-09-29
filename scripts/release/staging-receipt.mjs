import { createHash } from "node:crypto";
import { parseReleaseNote } from "./release-notes.mjs";

const SHA = /^[a-f0-9]{40}$/u;
const DIGEST = /^[a-f0-9]{64}$/u;
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const RECEIPT_ASSET = "a1-stable-staging-v1.json";

export function validateStableStagingReceipt(input) {
  const { repository, receipt, release, workflowRun, tag, master, application, installer, applicationLatest, installerLatest, assetSha256 } = input ?? {};
  if (!receipt || receipt.schema !== "a1-stable-staging-v1" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository ?? "")
    || receipt.repository !== repository || receipt.workflowPath !== ".github/workflows/approve-release.yml" || !Number.isSafeInteger(receipt.runId) || receipt.runId < 1
    || !Number.isSafeInteger(receipt.runAttempt) || receipt.runAttempt < 1 || typeof receipt.actor !== "string"
    || !/^[A-Za-z0-9-]+$/u.test(receipt.actor) || typeof receipt.requestId !== "string"
    || !/^[0-9a-f-]{36}$/u.test(receipt.requestId) || !Number.isSafeInteger(receipt.releaseId) || receipt.releaseId < 1
    || !STABLE.test(receipt.version ?? "") || !SHA.test(receipt.source ?? "") || !DIGEST.test(receipt.releaseNotesSha256 ?? "")
    || receipt.master !== receipt.source || typeof receipt.application?.name !== "string" || typeof receipt.application?.integrity !== "string"
    || typeof receipt.installer?.name !== "string" || typeof receipt.installer?.integrity !== "string"
    || typeof receipt.asset?.name !== "string" || !receipt.asset.name.endsWith(".tgz") || !DIGEST.test(receipt.asset?.sha256 ?? "")) {
    throw new Error("stable staging receipt identity is invalid");
  }
  if (!workflowRun || workflowRun.id !== receipt.runId || workflowRun.run_attempt !== receipt.runAttempt
    || workflowRun.path !== receipt.workflowPath || workflowRun.event !== "repository_dispatch"
    || workflowRun.head_branch !== "develop" || workflowRun.head_sha !== receipt.source
    || workflowRun.conclusion !== "success" || workflowRun.actor?.login !== receipt.actor) {
    throw new Error("stable staging Actions run does not match the receipt");
  }
  if (!release || release.id !== receipt.releaseId || release.tag_name !== `v${receipt.version}`
    || release.name !== `v${receipt.version}` || release.target_commitish !== receipt.source
    || release.draft !== false || release.prerelease !== false || typeof release.body !== "string") {
    throw new Error("published GitHub Release does not match stable staging");
  }
  const note = parseReleaseNote(release.body, receipt.version);
  const releaseNotesSha256 = createHash("sha256").update(note.markdown, "utf8").digest("hex");
  if (releaseNotesSha256 !== receipt.releaseNotesSha256) throw new Error("published Release body differs from the staged package note");
  if (tag?.object?.type !== "commit" || tag.object.sha !== receipt.source || master?.object?.sha !== receipt.master) {
    throw new Error("published tag or master differs from the staged source");
  }
  const assets = Array.isArray(release.assets) ? release.assets : [];
  if (assets.filter(asset => asset?.name === RECEIPT_ASSET).length !== 1
    || assets.filter(asset => asset?.name === receipt.asset.name).length !== 1 || assetSha256 !== receipt.asset.sha256) {
    throw new Error("published Release assets differ from stable staging");
  }
  if (application?.version !== receipt.version || application?.dist?.integrity !== receipt.application.integrity
    || installer?.version !== receipt.version || installer?.dist?.integrity !== receipt.installer.integrity
    || applicationLatest?.version !== receipt.version || installerLatest?.version !== receipt.version) {
    throw new Error("published npm pair differs from stable staging or latest tags");
  }
  return Object.freeze({ version: receipt.version, source: receipt.source, releaseId: receipt.releaseId,
    releaseNotesSha256, note: note.markdown, assetName: receipt.asset.name });
}

export { RECEIPT_ASSET };
