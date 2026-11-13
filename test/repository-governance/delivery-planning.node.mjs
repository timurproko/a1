import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { DELIVERY_ROUTE, inspectContractInstallation, inspectDeliveryScope, inspectCaseBindings } from "../../scripts/governance/delivery-contract.mjs";
import { githubPlanningRemote, publishDeliveryPlan } from "../../scripts/governance/publish-delivery-plan.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const cases = JSON.parse(await readFile(new URL("../../docs/delivery-cases.json", import.meta.url), "utf8")).cases;
const expected = id => cases.find(item => item.id === id).expect;
const baseHead = "1".repeat(40), planHead = "2".repeat(40);
const input = () => ({ repository: "timurproko/a1", base: "develop", baseHead, branch: "chore/example", expectedHead: null,
  change: "example", title: "docs: plan example", body: '## Proposal\n\nPlan a useful change.\n\n## Implementation\n\n- [ ] Deliver the approved feature.\n\n## Automation\n\n<details>\n<summary>Planning linkage</summary>\n\n```openspec-implementation\n{"version": 3, "change": "example"}\n```\n\n</details>',
  files: [{ path: "openspec/changes/example/proposal.md", contents: "# A real proposal\n" }] });
function fixture() {
  const calls = [];
  const state = { head: null, files: [], pr: null, failPrResponse: false };
  const effect = (name, callback) => async (...args) => { calls.push({ name, args }); return callback(...args); };
  const remote = {
    baseHead: effect("read-base", () => baseHead), head: effect("read-head", () => state.head),
    matches: effect("read-files", (_repo, head, files) => head === state.head && JSON.stringify(files) === JSON.stringify(state.files)),
    createRef: effect("create-ref", (_repo, _branch, sha) => { assert.equal(state.head, null); state.head = sha; }),
    commit: effect("commit", (_repo, _branch, observed, files) => { assert.equal(observed, state.head); state.head = planHead; state.files = files; return planHead; }),
    findPr: effect("find-pr", () => state.pr),
    createPr: effect("create-pr", (_repo, _base, _branch, _title, body) => {
      state.pr = { number: 123, draft: true, body };
      if (state.failPrResponse) throw new Error("response lost");
      return state.pr;
    }),
  };
  return { state, calls, remote };
}

test("C03/C42: planning publishes real selected artifacts without checkout/setup/sweep", async () => {
  const f = fixture();
  const result = await publishDeliveryPlan(input(), f.remote);
  assert.equal(result.status, "published");
  assert.deepEqual(f.state.files, input().files);
  assert.notEqual(f.state.head, baseHead);
  assert.deepEqual({ draft: f.state.pr.draft, implementationEdits: f.state.files.filter(file => !file.path.startsWith("openspec/changes/example/")).length,
    setupCalls: f.calls.filter(call => call.name === "setup").length, sweepCalls: f.calls.filter(call => call.name === "sweep").length,
    implementationOutcomesChecked: (f.state.pr.body.match(/^- \[x\] /gmu) ?? []).length }, expected("C03"));
});

test("edit-only authority blocks planning publication before remote effects", async () => {
  const f = fixture();
  const result = await publishDeliveryPlan({ ...input(), authority: { scopeApproved: true, implementationRequested: true, publicationRequested: true,
    editOnly: true, frameworkRequirementsSatisfied: true } }, f.remote);
  assert.equal(result.status, "blocked"); assert.equal(result.stage, "authorize"); assert.equal(f.calls.length, 0);
});

test("C07: stale observed head leaves existing work and remote refs unchanged", async () => {
  const f = fixture(); f.state.head = "3".repeat(40);
  const result = await publishDeliveryPlan({ ...input(), expectedHead: planHead }, f.remote);
  assert.equal(result.reason, "planning-head-changed");
  assert.deepEqual({ existingHeadReplaced: f.state.head !== "3".repeat(40), forceUpdates: f.calls.filter(call => call.name === "force").length,
    remoteDeletionCalls: f.calls.filter(call => call.name === "delete").length, concurrencyConflictReported: result.reason === "planning-head-changed" }, expected("C07"));
  assert.ok(f.calls.every(call => call.name.startsWith("read")));
});

test("C08: response loss discovers the published PR without duplicate or rollback", async () => {
  const f = fixture(); f.state.failPrResponse = true;
  const first = await publishDeliveryPlan(input(), f.remote);
  assert.equal(first.partial, true); assert.equal(first.stage, "pull-request");
  const result = await publishDeliveryPlan(input(), f.remote);
  assert.equal(result.status, "published");
  assert.deepEqual({ matchingPrReused: result.pr === f.state.pr.number,
    duplicatePrCreated: f.calls.filter(call => call.name === "create-pr").length !== 1,
    branchDeleted: f.state.head === null }, expected("C08"));
  assert.equal(f.calls.filter(call => call.name === "commit").length, 1);
});

test("planning boundaries reject escapes, fake linkage, checked drafts and authentication failure", async () => {
  for (const change of [ { files: [{ path: "src/escape.ts", contents: "x" }] }, { files: [{ path: "openspec/changes/example/../other/tasks.md", contents: "x" }] },
    { body: input().body.replace("[ ]", "[x]") }, { expectedHead: "not-a-sha" } ]) {
    const f = fixture();
    await assert.rejects(publishDeliveryPlan({ ...input(), ...change }, f.remote));
    assert.equal(f.calls.length, 0);
  }
  const f = fixture(); f.remote.baseHead = async () => { throw new Error("authentication failed"); };
  const result = await publishDeliveryPlan(input(), f.remote);
  assert.equal(result.status, "blocked"); assert.equal(result.partial, false); assert.equal(f.calls.length, 0);
});

test("GitHub writes use create-only refs and expectedHeadOid commits; no checkout or force API", async () => {
  const calls = [];
  const remote = githubPlanningRemote(async (args, payload) => { calls.push({ args, payload }); return { data: { createCommitOnBranch: { commit: { oid: planHead } } } }; });
  await remote.createRef("timurproko/a1", "chore/example", baseHead);
  await remote.commit("timurproko/a1", "chore/example", baseHead, input().files, "docs: plan example");
  assert.equal(calls[0].args[1], "repos/timurproko/a1/git/refs");
  assert.deepEqual(calls[0].payload, { ref: "refs/heads/chore/example", sha: baseHead });
  assert.equal(calls[1].payload.variables.input.expectedHeadOid, baseHead);
  assert.equal(calls[1].payload.variables.input.fileChanges.additions[0].path, input().files[0].path);
  assert.ok(!JSON.stringify(calls).includes('"force"'));
});

test("C01/C02: protected skill paths and declared indirect framework overrides block scope", () => {
  const result = inspectDeliveryScope([{ path: ".agents/skills/openspec-apply-change/SKILL.md" }]);
  assert.deepEqual({ blocked: result.blocked, frameworkEdits: 0, requiresSeparateScope: result.requiresSeparateScope }, expected("C01"));
  const indirect = inspectDeliveryScope([{ path: "docs/instructions.md" }], { overridesOpenSpec: true });
  assert.deepEqual({ blocked: indirect.blocked, indirectOverrideAllowed: !indirect.blocked }, expected("C02"));
  assert.ok(inspectDeliveryScope([{ path: "docs/routine.md", previousPath: ".claude/skills/openspec-apply-change/SKILL.md" }]).blocked);
  assert.equal(inspectDeliveryScope([{ path: "openspec/changes/example/tasks.md" }]).blocked, false);
});

test("C44/C45/C49: exact deployed bytes, not editable digests, establish installation", async () => {
  const read = path => readFile(new URL(`../../${path}`, import.meta.url));
  assert.deepEqual(await inspectContractInstallation(root), { passed: true, errors: [] });
  for (const path of ["docs/delivery-rules.md", "docs/delivery-adapters.json", "docs/delivery-contract.json"]) {
    const result = await inspectContractInstallation(root, { read: async name => name === path ? Buffer.concat([await read(name), Buffer.from(" ")]) : read(name) });
    assert.equal(result.passed, false); assert.ok(result.errors.includes(`contract-bytes:${path.slice(5)}`));
  }
  const adapterBytes = Buffer.from(String(await read("docs/delivery-adapters.json")).replace('"documentationAutoMerge": "active"', '"documentationAutoMerge": "disabled_manually"'));
  const manifest = JSON.parse(await read("docs/delivery-contract.json"));
  manifest.files["delivery-adapters.json"].sha256 = createHash("sha256").update(adapterBytes).digest("hex");
  const selfRehashed = await inspectContractInstallation(root, { read: async path => path === "docs/delivery-adapters.json" ? adapterBytes
    : path === "docs/delivery-contract.json" ? Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`) : read(path) });
  assert.equal(selfRehashed.passed, false);
  assert.ok(selfRehashed.errors.includes("contract-bytes:delivery-adapters.json"));
  assert.ok(selfRehashed.errors.includes("contract-bytes:delivery-contract.json"));
  const result = await inspectContractInstallation(root, { read: async path => path === "AGENTS.md" ? `${DELIVERY_ROUTE}\n${DELIVERY_ROUTE}\n` : read(path) });
  assert.ok(result.errors.includes("routing-count"));
});

test("C46/C47: dropped/skipped cases and bindings without real invocation fail completeness", () => {
  const observed = new Map(cases.map(item => [item.id, { invokedBoundary: true }]));
  assert.equal(inspectCaseBindings(cases, observed).passed, true);
  observed.delete("C12");
  assert.deepEqual(inspectCaseBindings(cases, observed).missing, ["C12"]);
  observed.set("C12", { invokedBoundary: false });
  assert.ok(inspectCaseBindings(cases, observed).invalid.includes("C12"));
  observed.set("C12", { invokedBoundary: true, skipped: true });
  assert.ok(inspectCaseBindings(cases, observed).invalid.includes("C12"));
});
