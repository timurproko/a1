/** Explicit request facts, not CI state or inferred conversational approval, select repository-owned actions. */
export function deliveryAuthority(facts) {
  const allowed = new Set(), blockers = [];
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) throw new Error("delivery-authority-facts");
  const names = new Set(["planningRequested", "planningPublicationRequested", "scopeApproved", "implementationRequested", "publicationRequested",
    "editOnly", "planningOnly", "materialAmbiguity", "materialChangeUnapproved", "frameworkRequirementsSatisfied", "targetedCheckFailed", "affectedImplementationChanged"]);
  if (Object.entries(facts).some(([name, value]) => !names.has(name) || typeof value !== "boolean")) throw new Error("delivery-authority-facts");
  if (facts.materialAmbiguity) blockers.push("material-decision-missing");
  if (facts.materialChangeUnapproved) blockers.push("material-scope-approval-required");
  if (facts.implementationRequested && facts.frameworkRequirementsSatisfied !== true) blockers.push("framework-requirements-unsatisfied");
  if (facts.planningRequested) {
    allowed.add("planning-edit");
    if (facts.planningPublicationRequested && !facts.editOnly) allowed.add("planning-publication");
  }
  if (!facts.planningOnly && facts.scopeApproved && facts.implementationRequested && blockers.length === 0) {
    allowed.add("implementation-edit");
    if (facts.publicationRequested && !facts.editOnly) {
      if (facts.targetedCheckFailed && facts.affectedImplementationChanged) blockers.push("targeted-check-failed");
      else allowed.add("publication");
    }
  }
  if (facts.implementationRequested && !facts.planningOnly) {
    if (!facts.scopeApproved) blockers.push("scope-approval-required");
  }
  if (allowed.has("publication")) allowed.add("planning-publication");
  // Security: merge, remote abandonment, readiness, hosting and private export have distinct boundaries, never an inferred grant here.
  return { allowed, blockers };
}

/** Perform one explicit scoped action only; refusal never queues work or carries authority into another candidate. */
export async function performDeliveryAction(facts, operation, action) {
  const authority = deliveryAuthority(facts);
  if (!authority.allowed.has(operation)) return { performed: false, blockers: authority.blockers.length ? authority.blockers : ["operation-not-authorized"] };
  return { performed: true, value: await action() };
}
