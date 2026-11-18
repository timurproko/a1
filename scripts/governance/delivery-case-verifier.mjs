import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { APPROVED_DELIVERY_HASHES, inspectContractInstallation, inspectDeliveryScope, inspectCaseBindings } from "./delivery-contract.mjs";
import { deliveryAuthority, performDeliveryAction } from "./delivery-authority.mjs";
import { publishDeliveryPlan } from "./publish-delivery-plan.mjs";
import { describeImplementationProgress } from "./delivery-progress.mjs";
import { inspectDeliveryBody } from "./check-delivery-body.mjs";
import { classifyFinalizationCandidate, reconcileFinalization } from "./openspec-finalization-publication.mjs";
import { guardedDeliveryMutation } from "./delivery-control.mjs";
import { refreshReadyPullRequests } from "./ready-pull-request-refresh.mjs";
import { oneShotMaintainerMerge } from "./delivery-integration.mjs";
import { verifyNativeArmBinding, captureNativeArmBinding } from "./delivery-native-arm.mjs";
import { classifyDocumentationAutoMerge, documentationControllerActive, inspectDocumentationDiff, planDocumentationAutoMerge } from "./documentation-auto-merge.mjs";
import { inspectPublication, inspectDeliveryHandoff } from "./delivery-publication.mjs";
import { removePublishedLocalWorktree } from "./local-cleanup-remove-local.mjs";
import { inspectLocalPreservation } from "./local-cleanup-preservation.mjs";
import { selectDeliveryScratch, inspectDeliveryReconciliation } from "./delivery-workspace.mjs";

const boundaries = Object.freeze({ inspectContractInstallation, inspectDeliveryScope, inspectCaseBindings, deliveryAuthority, performDeliveryAction,
  publishDeliveryPlan, describeImplementationProgress, inspectDeliveryBody, classifyFinalizationCandidate, reconcileFinalization,
  guardedDeliveryMutation, refreshReadyPullRequests, oneShotMaintainerMerge, verifyNativeArmBinding, captureNativeArmBinding,
  classifyDocumentationAutoMerge, documentationControllerActive, inspectDocumentationDiff, planDocumentationAutoMerge,
  inspectPublication, inspectDeliveryHandoff, removePublishedLocalWorktree, inspectLocalPreservation, selectDeliveryScratch, inspectDeliveryReconciliation });
const runtimeExports = Object.freeze({ enterSessionRepositoryWorktree: "session-worktree-entry", requestSessionWorktreeLocalRemoval: "session-worktree-completion",
  requestSessionWorktreeCompletion: "session-worktree-completion", settleSessionWorktreeCompletion: "session-worktree-completion" });
const casesUrl = new URL("../../docs/delivery-cases.json", import.meta.url);

/** Fixed dispatch and private invocation receipts prevent an expected-result-returning adapter from passing as execution. */
export async function createDeliveryCaseVerifier({ emit = line => console.log(line) } = {}) {
  const bytes = await readFile(casesUrl);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), APPROVED_DELIVERY_HASHES["delivery-cases.json"], "frozen case bytes changed");
  const cases = JSON.parse(bytes).cases;
  assert.deepEqual(cases.map(item => item.id), Array.from({ length: 50 }, (_, index) => `C${String(index + 1).padStart(2, "0")}`));
  const receipts = new WeakMap(), completed = new Map();
  const reviewBinding = receipt => receipts.has(receipt);
  return Object.freeze({
    scenarios: Object.freeze(cases.map(({ expect: _expected, expectByRepository: _byRepository, ...scenario }) => Object.freeze(structuredClone(scenario)))),
    async invoke(id, name, args = []) {
      assert(cases.some(item => item.id === id), `unknown case ${id}`);
      let fn = name === "reviewBinding" ? reviewBinding : Object.hasOwn(boundaries, name) ? boundaries[name] : undefined;
      if (!fn && Object.hasOwn(runtimeExports, name)) fn = (await import(new URL(`../../src/foundation/lifecycle/${runtimeExports[name]}.ts`, import.meta.url)))[name];
      assert.equal(typeof fn, "function", `unknown implementation boundary ${name}`);
      let value, error;
      try { value = await fn(...args); } catch (failure) { error = failure; }
      const receipt = Object.freeze({ value, error });
      receipts.set(receipt, { id, name });
      return receipt;
    },
    assert(id, tokens, observed, variant = "default") {
      const calls = (Array.isArray(tokens) ? tokens : [tokens]).map(token => receipts.get(token));
      assert(calls.length > 0 && calls.every(call => call?.id === id), `${id}: no actual implementation invocation`);
      const scenario = cases.find(item => item.id === id);
      const expected = scenario.expectByRepository ? scenario.expectByRepository.a1 : scenario.expect;
      assert.deepEqual(observed, expected, `${id}${variant === "default" ? "" : `/${variant}`}: observed fields differ`);
      if (id === "C37") assert(scenario.given.preservationHazards.includes(variant), "C37 requires a named actual hazard");
      const variants = completed.get(id) ?? new Set(); variants.add(variant); completed.set(id, variants);
      emit(`A1_DELIVERY_CASE ${JSON.stringify({ id, variant, status: "passed", boundaries: calls.map(call => call.name), assertions: Object.keys(expected) })}`);
    },
    async finish() {
      assert.equal(createHash("sha256").update(await readFile(casesUrl)).digest("hex"), APPROVED_DELIVERY_HASHES["delivery-cases.json"], "case bytes changed during execution");
      const missing = cases.filter(item => !completed.has(item.id)).map(item => item.id);
      const hazards = cases.find(item => item.id === "C37").given.preservationHazards;
      assert.deepEqual(missing, [], `unexecuted cases: ${missing.join(", ")}`);
      assert.deepEqual([...completed.get("C37")].sort(), [...hazards].sort(), "C37 hazard coverage is incomplete");
      return { contract: "portable-delivery-v1", repository: "a1", cases: completed.size, hazards: hazards.length, skipped: 0, passed: true };
    },
  });
}
