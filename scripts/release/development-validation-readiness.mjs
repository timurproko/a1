import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { inspectUnassociatedPull } from "../governance/openspec-association-policy.mjs";
import { createArchiveReader } from "../governance/openspec-archive-github.mjs";
import { archiveFailure, parseImplementation, SHA } from "../governance/openspec-archive-policy.mjs";
import { classifyReleaseReopening } from "../governance/release-reopening-auto-merge.mjs";

const PULL_REQUEST_EVENT = "pull_request";
const REOPENING_BRANCH = /^chore\/release-(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)-dev$/u;
const MAX_REOPENING_FILE_BYTES = 1024 * 1024;

/**
 * Decide whether Development validation may execute for the current event.
 * Pull-request lifecycle metadata is parsed by the exact-base copy of this file in CI.
 */
export function classifyDevelopmentValidationReadiness({ eventName, draft = false, body = "", headSha = "" }) {
  if (eventName !== PULL_REQUEST_EVENT) return { validate: true, reason: "non-pull-request" };
  if (draft) return { validate: false, reason: "draft" };

  let implementation;
  try {
    implementation = parseImplementation(body);
  } catch (error) {
    return {
      validate: false,
      reason: "malformed-implementation-metadata",
      errorCode: typeof error?.archiveCode === "string" ? error.archiveCode : "metadata-invalid",
    };
  }

  if (implementation?.version === 3
    && (!implementation.archive || implementation.finalizedHead !== headSha || !SHA.test(headSha))) {
    return { validate: false, reason: "awaiting-finalization" };
  }
  return {
    validate: true,
    reason: implementation?.version === 3 ? "finalized-version-3" : implementation ? "legacy-implementation" : "ready",
  };
}

/** Apply immutable path/tree policy to an otherwise ordinary unassociated ready pull request. */
export async function classifyDevelopmentValidationReadinessFromRepository({ eventName, pull, reader }) {
  const decision = classifyDevelopmentValidationReadiness({
    eventName,
    draft: pull?.draft,
    body: pull?.body ?? "",
    headSha: pull?.head?.sha ?? "",
  });
  if (!decision.validate || decision.reason !== "ready") return decision;
  const association = await inspectUnassociatedPull(reader, pull);
  if (!association.blocked) return decision;
  return { validate: false, reason: association.reason, errorCode: association.reason, changes: association.changes };
}

/** Bind current mutable readiness metadata to the immutable pull-request event identity. */
export async function classifyCurrentDevelopmentValidationReadiness({
  eventName,
  pull,
  reader,
  expectedNumber,
  expectedHead,
  expectedBase,
}) {
  assertCurrentPull(pull, expectedNumber, expectedHead, expectedBase);
  return classifyDevelopmentValidationReadinessFromRepository({ eventName, pull, reader });
}

/** Reuse exact release-reopening semantics without granting a path-only version exemption. */
export async function classifyReleaseReopeningValidationRoute({ eventName, pull, reader }) {
  if (eventName !== PULL_REQUEST_EVENT || !REOPENING_BRANCH.test(pull?.head?.ref ?? "")) {
    return { selected: false, reason: "not-release-reopening" };
  }
  try {
    if (pull.changed_files !== 4) return { selected: false, reason: "reopening PR must change exactly four files" };
    const files = await reader.pages(`/pulls/${pull.number}/files`, 100);
    if (files.length !== pull.changed_files) return { selected: false, reason: "incomplete reopening changed-file response" };
    const decision = await classifyReleaseReopening({
      pull,
      files,
      repository: reader.repository,
      read: async (path, ref) => readRepositoryFile(reader, path, ref),
      release: async tag => reader.get(`${reader.prefix}/releases/tags/${encodeURIComponent(tag)}`),
    });
    return { selected: decision.eligible, reason: decision.reason };
  } catch {
    return { selected: false, reason: "release-reopening verification unavailable" };
  }
}

/** Bind the reopening decision to the same immutable event identity as readiness. */
export async function classifyCurrentReleaseReopeningValidationRoute({
  eventName,
  pull,
  reader,
  expectedNumber,
  expectedHead,
  expectedBase,
}) {
  assertCurrentPull(pull, expectedNumber, expectedHead, expectedBase);
  return classifyReleaseReopeningValidationRoute({ eventName, pull, reader });
}

function assertCurrentPull(pull, expectedNumber, expectedHead, expectedBase) {
  if (!Number.isSafeInteger(expectedNumber) || expectedNumber < 1 || !SHA.test(expectedHead ?? "") || !SHA.test(expectedBase ?? "")) {
    throw archiveFailure("association-event-identity");
  }
  if (pull?.number !== expectedNumber || pull.head?.sha !== expectedHead || pull.base?.sha !== expectedBase) {
    throw archiveFailure("association-event-drift");
  }
}

async function readRepositoryFile(reader, path, ref) {
  if (!SHA.test(ref ?? "") || typeof path !== "string" || !path || path.startsWith("/") || path.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error("invalid reopening content identity");
  }
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const file = await reader.get(`${reader.prefix}/contents/${encoded}?ref=${ref}`);
  if (file?.type !== "file" || file.encoding !== "base64" || typeof file.content !== "string") throw new Error(`unreadable reopening file: ${path}`);
  const content = Buffer.from(file.content, "base64");
  if (content.byteLength > MAX_REOPENING_FILE_BYTES) throw new Error(`oversized reopening file: ${path}`);
  return content.toString("utf8");
}

async function main() {
  const eventName = process.env.EVENT_NAME ?? "";
  let decision = classifyDevelopmentValidationReadiness({
    eventName,
    draft: process.env.PULL_DRAFT === "true",
    body: process.env.PULL_BODY ?? "",
    headSha: process.env.EXPECTED_HEAD ?? "",
  });
  let reopening = { selected: false, reason: "not-evaluated" };
  if (eventName === PULL_REQUEST_EVENT && decision.reason !== "draft") {
    const number = Number(process.env.PULL_NUMBER);
    const expectedHead = process.env.EXPECTED_HEAD;
    const expectedBase = process.env.EXPECTED_BASE;
    if (!Number.isSafeInteger(number) || number < 1 || !SHA.test(expectedHead ?? "") || !SHA.test(expectedBase ?? "")) {
      throw archiveFailure("association-event-identity");
    }
    const repository = process.env.GITHUB_REPOSITORY ?? "";
    const reader = createArchiveReader({ repository, token: process.env.GITHUB_TOKEN });
    const pull = await reader.get(`${reader.prefix}/pulls/${number}`);
    decision = await classifyCurrentDevelopmentValidationReadiness({
      eventName,
      pull,
      reader,
      expectedNumber: number,
      expectedHead,
      expectedBase,
    });
    if (decision.validate && decision.reason === "ready") {
      reopening = await classifyCurrentReleaseReopeningValidationRoute({
        eventName,
        pull,
        reader,
        expectedNumber: number,
        expectedHead,
        expectedBase,
      });
    }
  }
  const output = process.env.GITHUB_OUTPUT;
  if (output) {
    await appendFile(output, `validate=${decision.validate}\nreason=${decision.reason}\nrelease_reopening=${reopening.selected}\n`, "utf8");
  }
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    const detail = decision.errorCode ? `; policy error: \`${decision.errorCode}\`` : "";
    await appendFile(summary, `## Development validation readiness\n\nDecision: **${decision.validate ? "validate" : "defer"}**; reason: \`${decision.reason}\`${detail}.\n\nRelease reopening route: **${reopening.selected ? "selected" : "not selected"}**; reason: ${JSON.stringify(reopening.reason)}.\n`, "utf8");
  }
  if (["malformed-implementation-metadata", "missing-implementation-association"].includes(decision.reason)) {
    console.error(`Development validation readiness failed: ${decision.errorCode}`);
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(decision));
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();
