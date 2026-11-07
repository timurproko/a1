## 1. Channel-independent version reporting

- [x] 1.1 Always render Current, Develop, and Release and resolve the development head's recorded pull request independently of the installed channel; retain stable Current attribution rules.
- [x] 1.2 Update focused version tests for stable and development success, preview record presence/absence/failure, absent next, discovery failure, and stable registry fallback.
- [x] 1.3 Reconcile the version-output implementation comment and any directly affected command documentation with the approved behavior.

## 2. Delivery checks

- [x] 2.1 Run TypeScript checking, the focused CLI version tests, and strict OpenSpec change validation; disposition any discovered gaps before finalization.

## 3. Finalized-spec CI repair

- [x] 3.1 Regenerate and review the identity inventory and exact approvals for the four existing canonical-spec references shifted by finalization, preserving occurrence counts, values, contexts, and approval reasons.
- [x] 3.2 Reproduce the failed architecture gate and run TypeScript checking plus focused version, identity-governance, and inventory tests; retain every policy assertion.
