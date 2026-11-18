import { validateVersion3Candidate, findImplementationValidation } from "./openspec-archive-github.mjs";
import { integrationDigest, integrationIdentity, sameIntegrationIdentity } from "./delivery-candidate.mjs";
export { integrationIdentity, integrationDigest } from "./delivery-candidate.mjs";
import { deliveryMutationBlocker, sameDeliverySnapshot, DELIVERY_ADAPTER } from "./delivery-control.mjs";

const refuse = code => { throw Object.assign(new Error(code), { deliveryCode: code }); };

function requireRequestedCandidate(pull, expected) {
  const blocker = deliveryMutationBlocker(pull);
  if (blocker) refuse(blocker);
  if (pull.state !== "open" || pull.draft !== false || pull.base?.ref !== DELIVERY_ADAPTER.baseBranch
    || pull.base.repo?.full_name !== expected.repository || pull.head?.repo?.full_name !== expected.repository
    || pull.number !== expected.pr) refuse("integration-candidate-identity");
  if (pull.auto_merge !== null) refuse("integration-existing-arm-unresolved");
  if (pull.head.sha !== expected.head || pull.base.sha !== expected.base || integrationDigest(pull.body ?? "") !== expected.bodyDigest
    || !sameIntegrationIdentity(integrationIdentity(pull), expected)) refuse("integration-fresh-decision-required");
  if (pull.mergeable !== true || pull.mergeable_state !== "clean") refuse("integration-not-mergeable");
}

/** One current request, one ordinary sha-guarded squash attempt. No waiting, queue, auto-arm or retained authority. */
export async function oneShotMaintainerMerge({ requested = false, candidate, reader, principal, merge, environment = process.env }) {
  let attempted = false;
  try {
    if (requested !== true) refuse("integration-current-request-required");
    if (environment.GITHUB_ACTIONS === "true") refuse("integration-workflow-forbidden");
    const fields = ["repository", "pr", "head", "base", "bodyDigest", "acceptanceDigest"];
    if (!candidate || Object.keys(candidate).sort().join() !== [...fields].sort().join()
      || candidate.repository !== DELIVERY_ADAPTER.repository || !Number.isSafeInteger(candidate.pr) || candidate.pr < 1
      || ![candidate.head, candidate.base].every(value => /^[a-f0-9]{40}$/.test(value ?? ""))
      || ![candidate.bodyDigest, candidate.acceptanceDigest].every(value => /^[a-f0-9]{64}$/.test(value ?? ""))) refuse("integration-request-identity");
    const expected = structuredClone(candidate);
    if (reader.repository !== expected.repository) refuse("integration-repository");
    const prefix = reader.prefix;
    const initial = await reader.get(`${prefix}/pulls/${expected.pr}`);
    requireRequestedCandidate(initial, expected);
    const validated = await validateVersion3Candidate(reader, expected.pr);
    requireRequestedCandidate(validated.pull, expected);
    await findImplementationValidation(reader, validated.pull);
    const actor = await principal();
    if (actor?.type !== "User" || !/^[a-zA-Z0-9-]{1,39}$/.test(actor.login ?? "") || (!Number.isSafeInteger(actor.id) || actor.id < 1)) refuse("integration-human-credential-required");
    const permission = await reader.get(`${prefix}/collaborators/${actor.login}/permission`);
    if (!["write", "maintain", "admin"].includes(permission.permission)) refuse("integration-human-permission");
    const current = await reader.get(`${prefix}/pulls/${expected.pr}`);
    requireRequestedCandidate(current, expected);
    if (!sameDeliverySnapshot(current, validated.pull, expected.repository)) refuse("integration-fresh-decision-required");
    const target = await reader.get(`${prefix}/git/ref/heads/${DELIVERY_ADAPTER.baseBranch}`);
    if (DELIVERY_ADAPTER.baseCurrency !== "strict-current-target" || target.object?.sha !== expected.base) refuse("integration-base-changed");
    await reader.ancestor(expected.base, expected.head);
    const finalActor = await principal();
    if (finalActor.id !== actor.id || finalActor.login !== actor.login || finalActor.type !== "User") refuse("integration-credential-changed");
    const last = await reader.get(`${prefix}/pulls/${expected.pr}`);
    requireRequestedCandidate(last, expected);
    if (!sameDeliverySnapshot(last, current, expected.repository)) refuse("integration-fresh-decision-required");
    attempted = true;
    // Security: the REST protected merge endpoint has no queue/auto-merge fallback, unlike CLI queue convenience behavior.
    const result = await merge(expected.pr, { sha: expected.head, merge_method: "squash" });
    if (result?.merged !== true || !/^[a-f0-9]{40}$/.test(result.sha ?? "")) refuse("integration-protected-merge-refused");
    return { disposition: "merged", head: expected.head, merge: result.sha, attempted, authorityRetained: false };
  } catch (error) {
    return { disposition: "blocked", reason: error.deliveryCode ?? error.archiveCode ?? "integration-unverifiable", attempted, authorityRetained: false };
  }
}
