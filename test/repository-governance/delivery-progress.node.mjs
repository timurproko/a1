import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, test } from "node:test";
import { deliveryAuthority, performDeliveryAction } from "../../scripts/governance/delivery-authority.mjs";
import { describeImplementationProgress } from "../../scripts/governance/delivery-progress.mjs";
import { inspectDeliveryBody } from "../../scripts/governance/check-delivery-body.mjs";
import { parseImplementationProgress } from "../../scripts/governance/openspec-acceptance-checklist.mjs";

const execute = promisify(execFile), roots = [];
const cases = JSON.parse(await readFile(new URL("../../docs/delivery-cases.json", import.meta.url), "utf8")).cases;
const expected = id => cases.find(item => item.id === id).expect;
const approved = { scopeApproved: true, implementationRequested: true, publicationRequested: true, frameworkRequirementsSatisfied: true };
afterEach(async () => { for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true, maxRetries: 5 }); });
function body(outcomes, { complete = false, proposal = "Deliver focused behavior" } = {}) {
  return `## Proposal\n\n${proposal}\n\n## Implementation\n\n${outcomes.map(item => `- [${complete ? "x" : " "}] ${item}`).join("\n")}\n\n${complete ? "## Acceptance\n\n- Local behavior remains observable without claiming CI or device acceptance.\n\n" : ""}## Automation\n\n<details>\n<summary>Delivery association</summary>\n\n\`\`\`openspec-implementation\n{"version":3,"change":"example"}\n\`\`\`\n\n</details>\n`;
}
async function checkout() {
  const root = await mkdtemp(join(tmpdir(), "a1-delivery-progress-")); roots.push(root);
  const calls = [], primary = join(root, "primary"), path = join(root, "task");
  const git = async args => { calls.push(["git", ...args]); return (await execute("git", args, { timeout: 15_000 })).stdout.trim(); };
  await git(["init", "-b", "develop", primary]); await writeFile(join(primary, "README.md"), "base\n");
  await git(["-C", primary, "add", "."]); await git(["-C", primary, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "base"]);
  await git(["-C", primary, "worktree", "add", "-b", "test/progress", path]);
  return { root, primary, path, calls, git };
}

test("C04/C13: edit-only work in an external owned Git checkout neither publishes nor needs A1", async () => {
  const f = await checkout(), effects = [], before = JSON.stringify([process.env.PI_SESSION_ID, process.env.PI_SESSION_FILE]);
  const facts = { ...approved, editOnly: true };
  const local = await performDeliveryAction(facts, "implementation-edit", () => writeFile(join(f.path, "local.md"), "owned edit\n"));
  assert.equal(local.performed, true); assert.equal(await readFile(join(f.path, "local.md"), "utf8"), "owned edit\n");
  await performDeliveryAction(facts, "publication", async () => { effects.push("push", "pr-mutation"); });
  await performDeliveryAction(facts, "merge", async () => { effects.push("merge"); });
  assert.deepEqual({ pushCalls: effects.filter(value => value === "push").length, prMutationCalls: effects.filter(value => value === "pr-mutation").length,
    mergeCalls: effects.filter(value => value === "merge").length }, expected("C04"));
  assert.deepEqual({ a1InstallationRequired: f.calls.some(call => call[0] === "a1"),
    runtimeIdentityForged: JSON.stringify([process.env.PI_SESSION_ID, process.env.PI_SESSION_FILE]) !== before }, expected("C13"));
});

test("C05: one approval plus implementation/publication request grants scoped work, never integration or abandonment", async () => {
  const authority = deliveryAuthority(approved); let pushes = 0;
  const publication = await performDeliveryAction(approved, "publication", async () => { pushes++; });
  assert.deepEqual({ duplicateApprovalRequired: authority.blockers.includes("scope-approval-required"),
    scopedPublicationAllowed: publication.performed && pushes === 1, mergeAuthorized: authority.allowed.has("merge"),
    remoteDeletionAuthorized: authority.allowed.has("remote-delete") }, expected("C05"));
});

test("C06/C50: material scope ambiguity refuses affected edits while preserving existing work", async () => {
  const f = await checkout(); let edits = 0;
  for (const [id, flag, blocker] of [["C06", "materialChangeUnapproved", "material-scope-approval-required"], ["C50", "materialAmbiguity", "material-decision-missing"]]) {
    const result = await performDeliveryAction({ ...approved, [flag]: true }, "implementation-edit", async () => { edits++; await writeFile(join(f.path, "README.md"), "incorrect override\n"); });
    assert.equal(await readFile(join(f.path, "README.md"), "utf8").then(value => value.trim()), "base");
    if (id === "C06") assert.deepEqual({ blocked: !result.performed, approvalRequired: result.blockers.includes(blocker), affectedImplementationEdits: edits }, expected(id));
    else assert.deepEqual({ affectedActionBlocked: !result.performed, agentInventedException: edits > 0, clarificationRequested: result.blockers.includes(blocker) }, expected(id));
  }
});

test("C14: local completion and the next outcome need no push or network round trip", async () => {
  const f = await checkout(), remoteBody = body(["Deliver first behavior", "Deliver second behavior", "Deliver third behavior"]);
  const localBody = remoteBody.replace("- [ ] Deliver first", "- [x] Deliver first");
  const first = await performDeliveryAction(approved, "implementation-edit", async () => {
    await writeFile(join(f.path, "tasks.md"), "## Shared task group\n\n- [x] 1.1 Deliver first behavior\n- [ ] 1.2 Deliver second behavior\n");
  });
  assert.equal(first.performed, true); assert.equal(inspectDeliveryBody(localBody).ok, true);
  const next = await performDeliveryAction(approved, "implementation-edit", () => writeFile(join(f.path, "second.md"), "in progress\n"));
  assert.deepEqual({ nextOutcomeBlockedByPush: !next.performed,
    localProgressRecorded: (await readFile(join(f.path, "tasks.md"), "utf8")).includes("- [x] 1.1"),
    unpublishedPrCheckboxChecked: parseImplementationProgress(remoteBody).items[0].checked }, expected("C14"));
  assert.equal((await f.git(["-C", f.primary, "log", "--oneline"])).split("\n").length, 1);
});

test("C15: a single meaningful test-only outcome passes unchanged structural gates", () => {
  const text = body(["Test the viewport's test-only regression coverage"]), inspected = inspectDeliveryBody(text);
  assert.deepEqual({ accepted: inspected.ok, inventedOutcomeRequired: parseImplementationProgress(text).items.length !== 1,
    testingVocabularyRejected: !inspected.ok && inspected.reason === "draft-implementation-progress-validation" }, expected("C15"));
});

test("C16: twelve meaningful linked coverage outcomes and a long proposal do not trigger style rejection", () => {
  const outcomes = Array.from({ length: cases.find(item => item.id === "C16").given.meaningfulOutcomes }, (_, index) => `Test coverage ${index} for <row> at https://example.test/${index}, preserving ${"viewport context ".repeat(30)}`);
  const text = body(outcomes, { complete: true, proposal: "Explain the scoped coverage change. ".repeat(30) }), inspected = inspectDeliveryBody(text);
  assert.equal(inspected.ok, true);
  assert.deepEqual({ styleOnlyRejection: !inspected.ok, outcomeCountRejection: !inspected.ok && inspected.reason?.includes("count") === true }, expected("C16"));
});

test("C18: an actually failing targeted check blocks publication; repairing code keeps assertions unchanged", async () => {
  const f = await checkout(), code = join(f.path, "behavior.cjs"), check = join(f.path, "check.cjs");
  const assertions = "require('node:assert/strict').equal(require('./behavior.cjs'), 2);\n";
  await writeFile(code, "module.exports = 1;\n"); await writeFile(check, assertions);
  let failed = false, pushes = 0;
  try { await execute(process.execPath, [check], { timeout: 15_000 }); } catch { failed = true; }
  assert.equal(failed, true);
  const refused = await performDeliveryAction({ ...approved, targetedCheckFailed: failed, affectedImplementationChanged: true }, "publication", async () => { pushes++; });
  assert.deepEqual({ pushAllowed: refused.performed, failureDisclosed: refused.blockers.includes("targeted-check-failed"),
    assertionsWeakened: await readFile(check, "utf8") !== assertions }, expected("C18"));
  assert.equal(pushes, 0);
  await writeFile(code, "module.exports = 2;\n"); await execute(process.execPath, [check], { timeout: 15_000 });
  assert.equal(await readFile(check, "utf8"), assertions);
  assert.equal((await performDeliveryAction({ ...approved, targetedCheckFailed: false, affectedImplementationChanged: true }, "publication", async () => { pushes++; })).performed, true);
  assert.equal(pushes, 1);
});

test("C19: published implementation completion remains distinct from pending CI and absent human observation", async () => {
  const report = describeImplementationProgress(body(["Deliver observable fixture behavior"], { complete: true }), { published: true, ci: "pending" });
  let ready = 0; await performDeliveryAction(approved, "ready", async () => { ready++; });
  assert.deepEqual({ implementationMayBeChecked: report.publishedComplete, ciSuccessClaimed: report.ci === "success",
    deviceAcceptanceClaimed: report.humanObservation !== "not-observed", agentReadyMutation: ready !== 0 }, expected("C19"));
});
