import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseImplementation } from "../governance/openspec-archive-policy.mjs";
import { readCurrentPull } from "./pr-full-regression.mjs";

const PULL_REQUEST_EVENT = "pull_request";
const SHA = /^[0-9a-f]{40}$/u;

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

/** Resolve mutable body/draft metadata at execution time while binding it to the event's immutable head. */
export async function resolveDevelopmentValidationReadiness({
  eventName,
  eventHead = "",
  repository = "",
  pullNumber = 0,
  token = "",
}, reader = readCurrentPull) {
  if (eventName !== PULL_REQUEST_EVENT) return classifyDevelopmentValidationReadiness({ eventName });
  try {
    if (!SHA.test(eventHead) || !/^[\w.-]+\/[\w.-]+$/u.test(repository) || !Number.isSafeInteger(pullNumber)
      || pullNumber < 1 || typeof token !== "string" || token.length === 0) throw new Error("incomplete pull-request readiness identity");
    const pull = await reader(repository, pullNumber, token);
    if (pull?.number !== pullNumber || pull.state !== "open" || pull.base?.ref !== "develop" || typeof pull.draft !== "boolean"
      || !SHA.test(pull.head?.sha ?? "") || pull.body !== null && typeof pull.body !== "string") throw new Error("invalid current pull-request readiness metadata");
    if (pull.head.sha !== eventHead) return { validate: false, reason: "stale-pull-request-event" };
    return classifyDevelopmentValidationReadiness({ eventName, draft: pull.draft, body: pull.body ?? "" });
  } catch {
    return { validate: false, reason: "pull-metadata-unavailable", errorCode: "pull-metadata-unavailable" };
  }
}

async function main() {
  const decision = await resolveDevelopmentValidationReadiness({
    eventName: process.env.EVENT_NAME ?? "",
    eventHead: process.env.EVENT_HEAD ?? "",
    repository: process.env.GITHUB_REPOSITORY ?? "",
    pullNumber: Number(process.env.PULL_NUMBER ?? 0),
    token: process.env.GITHUB_TOKEN ?? "",
  });
  const output = process.env.GITHUB_OUTPUT;
  if (output) {
    await appendFile(output, `validate=${decision.validate}\nreason=${decision.reason}\n`, "utf8");
  }
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    const detail = decision.errorCode ? `; policy error: \`${decision.errorCode}\`` : "";
    await appendFile(summary, `## Development validation readiness\n\nDecision: **${decision.validate ? "validate" : "defer"}**; reason: \`${decision.reason}\`${detail}.\n`, "utf8");
  }
  if (["malformed-implementation-metadata", "pull-metadata-unavailable"].includes(decision.reason)) {
    console.error(`Development validation readiness failed: ${decision.errorCode}`);
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(decision));
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();
