## 1. Readiness policy

- [ ] 1.1 Add a base-controlled classifier for draft, ordinary ready, active version-3, finalized version-3, legacy, manual, and malformed metadata states.
- [ ] 1.2 Make the classifier dependency-free, bounded, explicit about its decision reason, and fail closed for malformed implementation metadata.

## 2. Development workflow

- [ ] 2.1 Gate ordinary impact selection and PR Full regression selection on one positive readiness result.
- [ ] 2.2 Ensure draft and pre-finalization events schedule no Development tests or protected aggregate while ready ordinary and finalized heads retain all existing selected jobs.
- [ ] 2.3 Preserve PR-level stale-run cancellation, converted-to-draft cancellation, static protected-check identity, permissions, exact-head evidence, and manual dispatch behavior.

## 3. Contracts and guidance

- [ ] 3.1 Add classifier and workflow regression tests for all readiness states and downstream gates.
- [ ] 3.2 Update continuous-integration policy and delivery guidance to prohibit draft acceptance loops and require finalized-head execution for version-3 changes.
- [ ] 3.3 Run focused workflow/governance tests, typecheck, architecture and documentation governance, strict OpenSpec validation, and record evidence and known-gap disposition.
- [ ] 3.4 Reconcile current `origin/develop`, finalize once, and confirm the exact finalized head receives the selected validation without a duplicate pre-finalization test run.
