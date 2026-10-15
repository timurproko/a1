/**
 * Expands requested tiers and scopes into their atomic scopes in first-reached order. Dependency
 * free, so a validation job can plan its native prerequisites before installing packages.
 */
export function expandValidationScopes(suites, requested) {
  const atomic = [];
  const visiting = new Set();
  function expand(name) {
    const definition = suites.tiers[name] ?? suites.scopes[name];
    if (!definition) throw new Error(`unknown validation tier or scope: ${name}`);
    if (definition.kind !== "composition") {
      if (!atomic.includes(name)) atomic.push(name);
      return;
    }
    if (visiting.has(name)) throw new Error(`cyclic validation composition: ${name}`);
    visiting.add(name);
    for (const child of definition.includes ?? []) expand(child);
    visiting.delete(name);
  }
  for (const name of requested) expand(name);
  return atomic;
}

/** Whether any atomic scope of the request validates a packed candidate. */
export function consumesCandidatePackage(suites, requested) {
  return expandValidationScopes(suites, requested).some(name => (suites.tiers[name] ?? suites.scopes[name]).consumesPackage === true);
}
