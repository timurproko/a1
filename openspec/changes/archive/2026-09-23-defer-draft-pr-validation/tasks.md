## 1. Readiness policy

- [x] 1.1 Add a base-controlled classifier for draft, ordinary ready, active version-3, finalized version-3, legacy, manual, and malformed metadata states.
- [x] 1.2 Make the classifier dependency-free, bounded, explicit about its decision reason, and fail closed for malformed implementation metadata.

## 2. Development workflow

- [x] 2.1 Gate ordinary impact selection and PR Full regression selection on one positive readiness result.
- [x] 2.2 Ensure draft and pre-finalization events schedule no Development tests or protected aggregate while ready ordinary and finalized heads retain all existing selected jobs.
- [x] 2.3 Preserve PR-level stale-run cancellation, converted-to-draft cancellation, protected-check identity only for eligible heads, permissions, exact-head evidence, and manual dispatch behavior.

## 3. Contracts and guidance

- [x] 3.1 Add classifier and workflow regression tests for all readiness states and downstream gates.
- [x] 3.2 Update continuous-integration policy and delivery guidance to prohibit draft acceptance loops and require finalized-head execution for version-3 changes.
- [x] 3.3 Run focused workflow/governance tests, typecheck, architecture and documentation governance, strict OpenSpec validation, and record evidence and known-gap disposition.
- [x] 3.4 Verify the event sequence through classifier/workflow contracts and retain conservative exact-head validation for this one-time base-policy rollout; record the first subsequent ready PR as the live deployment observation.
