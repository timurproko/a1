import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { inspectUnassociatedPull } from "../governance/openspec-association-policy.mjs";
import { createArchiveReader } from "../governance/openspec-archive-github.mjs";
import { archiveFailure, parseImplementation, SHA } from "../governance/openspec-archive-policy.mjs";

const PULL_REQUEST_EVENT = "pull_request";

/**
 * Decide whether Development validation may execute for the current event.
 * Pull-request lifecycle metadata is parsed by the exact-base copy of this file in CI.
 */
export function classifyDevelopmentValidationReadiness({ eventName, draft = false, body = "" }) {
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

  if (implementation?.version === 3 && !implementation.archive) {
    return { validate: false, reason: "awaiting-finalization" };
  }
  return {
    validate: true,
    reason: implementation?.version === 3 ? "finalized-version-3" : implementation ? "legacy-implementation" : "ready",
  };
}

/** Apply immutable path/tree policy to an otherwise ordinary unassociated ready pull request. */
export async function classifyDevelopmentValidationReadinessFromRepository({ eventName, pull, reader }) {
  const decision = classifyDevelopmentValidationReadiness({ eventName, draft: pull?.draft, body: pull?.body ?? "" });
  if (!decision.validate || decision.reason !== "ready") return decision;
  const association = await inspectUnassociatedPull(reader, pull);
  if (!association.blocked) return decision;
  return { validate: false, reason: association.reason, errorCode: association.reason, changes: association.changes };
}

async function main() {
  const eventName = process.env.EVENT_NAME ?? "";
  let decision = classifyDevelopmentValidationReadiness({
    eventName,
    draft: process.env.PULL_DRAFT === "true",
    body: process.env.PULL_BODY ?? "",
  });
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
    if (pull.number !== number || pull.head?.sha !== expectedHead || pull.base?.sha !== expectedBase) throw archiveFailure("association-event-drift");
    decision = await classifyDevelopmentValidationReadinessFromRepository({ eventName, pull, reader });
  }
  const output = process.env.GITHUB_OUTPUT;
  if (output) {
    await appendFile(output, `validate=${decision.validate}\nreason=${decision.reason}\n`, "utf8");
  }
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    const detail = decision.errorCode ? `; policy error: \`${decision.errorCode}\`` : "";
    await appendFile(summary, `## Development validation readiness\n\nDecision: **${decision.validate ? "validate" : "defer"}**; reason: \`${decision.reason}\`${detail}.\n`, "utf8");
  }
  if (["malformed-implementation-metadata", "missing-implementation-association"].includes(decision.reason)) {
    console.error(`Development validation readiness failed: ${decision.errorCode}`);
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(decision));
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();
