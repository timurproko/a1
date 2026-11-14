import assert from "node:assert/strict";
import { test } from "node:test";
import { captureNativeArmBinding, verifyNativeArmBinding } from "../../scripts/governance/delivery-native-arm.mjs";
import { integrationIdentity } from "../../scripts/governance/delivery-candidate.mjs";
import { oneShotMaintainerMerge } from "../../scripts/governance/delivery-integration.mjs";
import { main as mergeCli } from "../../scripts/governance/merge-delivery.mjs";
import { inspectVersion3DeliverySnapshot, validateVersion3Candidate, loadArchiveEvidence } from "../../scripts/governance/openspec-archive-github.mjs";
import { finalizedRemote, repository } from "./delivery-case-fixtures.mjs";

async function nativeFixture() {
  const f = await finalizedRemote(), actor = f.state.principal;
  f.pull.auto_merge = { merge_method: "squash", enabled_by: actor };
  f.events.push({ id: 5, event: "committed", sha: f.head }, { id: 6, event: "auto_merge_enabled", actor, performed_via_github_app: null, created_at: "2026-09-15T11:00:00Z" });
  const event = { action: "auto_merge_enabled", sender: actor, pull_request: structuredClone(f.pull) };
  const capture = () => captureNativeArmBinding({ reader: f.reader, pull: f.pull, event, runId: 123, policySha: f.base,
    verifySnapshot: (pull, implementation) => inspectVersion3DeliverySnapshot(f.reader, pull, implementation, pull.head.sha),
    publish: async body => f.comments.push({ user: { login: "github-actions[bot]", type: "Bot" }, created_at: "2026-09-15T11:00:01Z", updated_at: "2026-09-15T11:00:01Z", body }) });
  return { ...f, event, capture };
}

test("a controller comment alone is insufficient; trusted exact-digest job metadata proves the verified human binding", async () => {
  const f = await nativeFixture(), capture = await f.capture(); assert.equal(capture.recorded, true, JSON.stringify(capture));
  await assert.rejects(verifyNativeArmBinding(f.reader, f.pull), /native-arm-record-provenance/);
  f.state.proofJobs.push({ name: `Verified native arm ${capture.bindingDigest}`, status: "completed", conclusion: "success" });
  const proof = await verifyNativeArmBinding(f.reader, f.pull); assert.equal(proof.owner, "maintainer"); assert.equal(proof.head, f.head);
  assert.equal((await validateVersion3Candidate(f.reader, 42)).disposition, "ready-for-maintainer-integration");
  assert.equal(f.merges.length, 0);
});

for (const changed of ["head", "base", "body", "acceptance", "owner", "method", "comment-edit", "job-digest"]) {
  test(`verified native arm does not carry authority across ${changed}`, async () => {
    const f = await nativeFixture(), capture = await f.capture(); assert.equal(capture.recorded, true);
    f.state.proofJobs.push({ name: `Verified native arm ${capture.bindingDigest}`, status: "completed", conclusion: "success" });
    if (changed === "head") f.pull.head.sha = "c".repeat(40);
    if (changed === "base") f.pull.base.sha = "c".repeat(40);
    if (changed === "body") f.pull.body = f.pull.body.replace("focused verification", "different verification");
    if (changed === "acceptance") f.pull.body = f.pull.body.replace("The implemented behavior", "Different behavior");
    if (changed === "owner") f.pull.auto_merge.enabled_by = { login: "other", type: "User" };
    if (changed === "method") f.pull.auto_merge.merge_method = "rebase";
    if (changed === "comment-edit") f.comments[0].updated_at = "2026-09-15T12:00:00Z";
    if (changed === "job-digest") f.state.proofJobs[0].name = `Verified native arm ${"0".repeat(64)}`;
    await assert.rejects(verifyNativeArmBinding(f.reader, f.pull, { required: true }));
    assert.equal(f.merges.length, 0); assert(!f.calls.some(path => /disablePullRequest|auto_merge.*POST/.test(path)));
  });
}

test("the exact native webhook can be recorded after an immediate maintainer integration, without manufacturing acceptance or arming anything", async () => {
  const f = await nativeFixture(); f.state.mergedSha = "d".repeat(40); f.state.target = f.state.mergedSha;
  Object.assign(f.pull, { state: "closed", merged: true, merged_by: f.state.principal, merge_commit_sha: f.state.mergedSha, merged_at: "2026-09-15T11:00:02Z" });
  f.events.push({ id: 7, event: "merged", actor: f.state.principal, performed_via_github_app: null, commit_id: f.state.mergedSha, created_at: f.pull.merged_at });
  const capture = await f.capture(); assert.equal(capture.recorded, true, JSON.stringify(capture));
  f.state.proofJobs.push({ name: `Verified native arm ${capture.bindingDigest}`, status: "completed", conclusion: "success" });
  const evidence = await loadArchiveEvidence(f.reader, 42);
  assert.equal(evidence.disposition, "eligible"); assert.equal(evidence.integration.kind, "human-auto-merge"); assert.equal(f.merges.length, 0);
});

for (const reason of ["missing-event", "held", "body-race", "invalid-manifest", "bot-owner"]) {
  test(`native capture reports ${reason} without a receipt or controller integration`, async () => {
    const f = await nativeFixture();
    if (reason === "missing-event") delete f.event.pull_request.head;
    if (reason === "held") f.pull.labels = [{ name: "delivery-hold" }];
    if (reason === "body-race") f.pull.body += "\nChanged body.\n";
    if (reason === "invalid-manifest") f.files[`${f.archive}tasks.md`] += "- [ ] unfinished task\n";
    if (reason === "bot-owner") f.event.sender = { login: "github-actions[bot]", type: "Bot" };
    const capture = await f.capture(); assert.equal(capture.recorded, false); assert.equal(f.comments.length, 0); assert.equal(f.merges.length, 0);
  });
}

for (const problem of ["workflow", "bot", "read-only", "held", "draft", "conflict", "existing-arm", "credential-change", "body-race", "last-hold", "permission-refusal"]) {
  test(`one-shot integration blocks ${problem} with no future authority`, async () => {
    const f = await finalizedRemote(), candidate = integrationIdentity(f.pull), options = { ...f.request, requested: true, candidate };
    if (problem === "workflow") options.environment = { GITHUB_ACTIONS: "true" };
    if (problem === "bot") f.state.principal.type = "Bot";
    if (problem === "read-only") f.state.permission = "read";
    if (problem === "held") f.pull.labels = [{ name: "delivery-hold" }];
    if (problem === "draft") f.pull.draft = true;
    if (problem === "conflict") f.pull.mergeable = false;
    if (problem === "existing-arm") f.pull.auto_merge = { enabled_by: f.state.principal, merge_method: "squash" };
    if (problem === "credential-change") { let reads = 0; options.principal = async () => ({ ...f.state.principal, id: ++reads === 1 ? 101 : 102 }); }
    if (problem === "body-race") f.state.onPull = () => { if (f.state.pullReads === 3) f.pull.body += "\nChanged during validation.\n"; };
    if (problem === "last-hold") f.state.onPull = () => { if (f.state.pullReads === 4) f.pull.labels = [{ name: "delivery-hold" }]; };
    if (problem === "permission-refusal") options.merge = async () => { f.merges.push("refused"); throw new Error("protected endpoint refused"); };
    const result = await oneShotMaintainerMerge(options); assert.equal(result.disposition, "blocked"); assert.equal(result.authorityRetained, false);
    assert.equal(f.merges.length, problem === "permission-refusal" ? 1 : 0); assert(!f.calls.some(path => /queue|enablePullRequestAutoMerge/.test(path)));
  });
}

test("merge CLI without an explicit current request stops before credentials, readers or hosting effects", async () => {
  assert.equal((await mergeCli(["--repository", repository, "--pr", "42"], {})).reason, "integration-current-request-required");
});
