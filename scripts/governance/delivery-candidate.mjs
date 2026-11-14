import { createHash } from "node:crypto";
import { parseImplementationAcceptanceScenarios } from "./openspec-acceptance-checklist.mjs";

export const integrationDigest = value => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
export function integrationIdentity(pull) {
  return { repository: pull.base?.repo?.full_name, pr: pull.number, head: pull.head?.sha, base: pull.base?.sha,
    bodyDigest: integrationDigest(pull.body ?? ""), acceptanceDigest: integrationDigest(parseImplementationAcceptanceScenarios(pull.body ?? "", 3)) };
}
export function sameIntegrationIdentity(left, right) {
  return ["repository", "pr", "head", "base", "bodyDigest", "acceptanceDigest"].every(key => left?.[key] === right?.[key]);
}
