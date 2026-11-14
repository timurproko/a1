import { createHash } from "node:crypto";
import { archiveFailure, parseImplementation, strictJson } from "./openspec-archive-policy.mjs";
import { assertHumanAutoMergeArm } from "./openspec-acceptance-policy.mjs";
import { integrationIdentity, sameIntegrationIdentity } from "./delivery-candidate.mjs";
import { APPROVED_DELIVERY_HASHES } from "./delivery-contract.mjs";
import { deliveryMutationBlocker } from "./delivery-control.mjs";

const ENABLE = new Set(["auto_merge_enabled", "auto_squash_enabled", "auto_rebase_enabled"]);
const workflow = ".github/workflows/documentation-auto-merge.yml";
const fail = code => { throw archiveFailure(code); };
const fields = ["version", "repository", "pr", "head", "base", "bodyDigest", "acceptanceDigest", "owner", "enableEventId", "enabledAt", "workflowRun", "policySha"];
export function nativeArmBindingDigest(binding) {
  return createHash("sha256").update(JSON.stringify(fields.map(field => [field, binding[field]]))).digest("hex");
}
export function nativeArmBindingBytes(binding) {
  return `Verified maintainer-owned native arm binding; this record grants no agent or bot integration authority.\n\n\`\`\`delivery-native-arm\n${JSON.stringify(binding, null, 2)}\n\`\`\`\n`;
}
function parseBinding(text) {
  const matches = [...(text ?? "").matchAll(/^```delivery-native-arm\n([\s\S]*?)\n```$/gm)];
  if (matches.length !== 1) fail("native-arm-record");
  const value = strictJson(matches[0][1]);
  if (Object.keys(value).sort().join() !== [...fields].sort().join() || value.version !== 1
    || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value.repository ?? "")
    || ![value.pr, value.enableEventId, value.workflowRun].every(number => Number.isSafeInteger(number) && number > 0)
    || ![value.head, value.base, value.policySha].every(sha => /^[a-f0-9]{40}$/.test(sha ?? ""))
    || ![value.bodyDigest, value.acceptanceDigest].every(hash => /^[a-f0-9]{64}$/.test(hash ?? ""))
    || !/^[A-Za-z0-9-]{1,39}$/.test(value.owner ?? "") || !Number.isFinite(Date.parse(value.enabledAt))) fail("native-arm-record");
  return value;
}

/** Immutable base policy selects new binding enforcement; old accepted deliveries retain their historical reader. */
export async function nativeBindingPolicyActive(reader, base) {
  try {
    const file = await reader.get(`${reader.prefix}/contents/docs/delivery-contract.json?ref=${base}`);
    if (file?.type !== "file" || file.encoding !== "base64" || typeof file.content !== "string") fail("native-arm-policy-unverifiable");
    const hash = createHash("sha256").update(Buffer.from(file.content, "base64")).digest("hex");
    if (hash !== APPROVED_DELIVERY_HASHES["delivery-contract.json"]) fail("native-arm-policy-drift");
    return true;
  } catch (error) { if (error.archiveCode === "github-not-found" || error.archiveCode === "github-404") return false; throw error; }
}

function enableFor(pull, permission, events) {
  const mergeIndex = events.findIndex(event => event.event === "merged");
  const preMerge = mergeIndex < 0 ? events : events.slice(0, mergeIndex);
  const decision = assertHumanAutoMergeArm({ ...pull, state: "open", merged: false }, permission, preMerge);
  const enabled = preMerge.filter(event => ENABLE.has(event.event) && event.actor?.login === decision.actor && event.created_at === decision.enabledAt);
  if (enabled.length !== 1 || !Number.isSafeInteger(enabled[0].id)) fail("native-arm-event-unverifiable");
  return enabled[0];
}

/** Require independently authored, unedited controller evidence for this exact native enable, never the toggle alone. */
export async function verifyNativeArmBinding(reader, pull, { required = false, events, permission } = {}) {
  if (!pull.auto_merge) fail("native-arm-missing");
  if (!required && !await nativeBindingPolicyActive(reader, pull.base?.sha)) return null;
  const actor = pull.auto_merge.enabled_by;
  if (pull.auto_merge.merge_method !== "squash") fail("native-arm-merge-method");
  if (actor?.type !== "User" || !/^[A-Za-z0-9-]{1,39}$/.test(actor.login ?? "")) fail("native-arm-human-required");
  permission ??= (await reader.get(`${reader.prefix}/collaborators/${actor.login}/permission`)).permission;
  events ??= await reader.pages(`/issues/${pull.number}/timeline`, 1000);
  const enabled = enableFor(pull, permission, events), identity = integrationIdentity(pull);
  const comments = await reader.pages(`/issues/${pull.number}/comments`, 1000);
  const records = [];
  for (const comment of comments) {
    if (comment.user?.type !== "Bot" || comment.user.login !== "github-actions[bot]" || comment.created_at !== comment.updated_at
      || !Number.isFinite(Date.parse(comment.created_at)) || !comment.body?.includes("```delivery-native-arm")) continue;
    const value = parseBinding(comment.body);
    if (value.repository === reader.repository && value.pr === pull.number && value.enableEventId === enabled.id) records.push(value);
  }
  if (!records.length) fail("native-arm-binding-unavailable");
  if (records.some(record => !sameIntegrationIdentity(record, identity) || record.owner !== actor.login || record.enabledAt !== enabled.created_at)) fail("native-arm-candidate-changed");
  for (const record of records) {
    const run = await reader.get(`${reader.prefix}/actions/runs/${record.workflowRun}`);
    if (run.repository?.full_name !== reader.repository || run.path !== workflow || run.event !== "pull_request_target"
      || run.head_sha !== record.policySha || record.policySha !== record.base || run.actor?.login !== record.owner) continue;
    // Security: a bot comment alone is forgeable by other workflows. The dedicated trusted job name authenticates its exact digest.
    const jobs = await reader.pages(`/actions/runs/${record.workflowRun}/jobs`, 1000, "jobs");
    const proof = jobs.filter(job => job.name === `Verified native arm ${nativeArmBindingDigest(record)}`);
    if (proof.length === 1 && proof[0].status === "completed" && proof[0].conclusion === "success") return record;
  }
  fail("native-arm-record-provenance");
}

/** Capture a trusted native webhook snapshot, including an immediate merge; no arm/merge is created or exercised here. */
export async function captureNativeArmBinding({ reader, pull, event, runId, policySha, verifySnapshot, publish }) {
  const original = event?.pull_request, actor = original?.auto_merge?.enabled_by;
  try {
    if (event.action !== "auto_merge_enabled" || original?.auto_merge?.merge_method !== "squash" || original?.number !== pull.number || !Number.isSafeInteger(runId) || runId < 1
      || !/^[a-f0-9]{40}$/.test(policySha ?? "") || actor?.type !== "User" || event.sender?.type !== "User" || event.sender.login !== actor.login) fail("native-arm-webhook-unverifiable");
    if (deliveryMutationBlocker(original) || deliveryMutationBlocker(pull)) fail("native-arm-held-or-unverifiable");
    const implementation = parseImplementation(original.body ?? "");
    if (implementation?.version !== 3 || implementation.finalizedHead !== original.head?.sha) fail("native-arm-not-finalized");
    const identity = integrationIdentity(original);
    if (policySha !== identity.base || identity.repository !== reader.repository || original.head.repo?.full_name !== reader.repository
      || !sameIntegrationIdentity(identity, integrationIdentity(pull)) || pull.draft !== false
      || pull.state !== "open" && !(pull.merged === true && pull.merged_by?.type === "User" && pull.merged_by.login === actor.login)) fail("native-arm-candidate-changed");
    const permission = (await reader.get(`${reader.prefix}/collaborators/${actor.login}/permission`)).permission;
    const events = await reader.pages(`/issues/${pull.number}/timeline`, 1000), enabled = enableFor(original, permission, events);
    await verifySnapshot(original, implementation);
    const current = await reader.get(`${reader.prefix}/pulls/${pull.number}`);
    if (deliveryMutationBlocker(current) || !sameIntegrationIdentity(identity, integrationIdentity(current))) fail("native-arm-candidate-changed");
    const binding = { version: 1, ...identity, owner: actor.login, enableEventId: enabled.id, enabledAt: enabled.created_at, workflowRun: runId, policySha };
    parseBinding(nativeArmBindingBytes(binding));
    await publish(nativeArmBindingBytes(binding));
    return { recorded: true, bindingDigest: nativeArmBindingDigest(binding) };
  } catch (error) { return { recorded: false, reason: error.archiveCode ?? "native-arm-unverifiable" }; }
}
