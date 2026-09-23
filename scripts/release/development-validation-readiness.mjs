import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseImplementation } from "../governance/openspec-archive-policy.mjs";

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

async function main() {
  const decision = classifyDevelopmentValidationReadiness({
    eventName: process.env.EVENT_NAME ?? "",
    draft: process.env.PULL_DRAFT === "true",
    body: process.env.PULL_BODY ?? "",
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
  if (decision.reason === "malformed-implementation-metadata") {
    console.error(`Development validation readiness failed: ${decision.errorCode}`);
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(decision));
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();
