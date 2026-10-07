## 1. Trusted reopening route

- [x] 1.1 Extend exact-base Development validation policy to classify the current pull request with the existing release-reopening verifier and emit an exact-head `release-reopening` decision.
- [x] 1.2 Fail closed on stale event/API identity, incomplete file enumeration, unavailable content or Release evidence, lifecycle metadata, foreign authors, and any path or byte mismatch.
- [x] 1.3 Add focused route tests for the accepted generated shape and every routing failure that could otherwise grant the exemption.

## 2. Lightweight workflow and aggregate

- [x] 2.1 Propagate the verified route through `ci.yml`; avoid dependency installation and generic impact selection, and skip naming, documentation, modular, rendering, acceptance, and delivery lanes for that route.
- [x] 2.2 Extend the protected aggregate to recognize only the exact verified reopening mode, require the expected head, and reject missing, failed, or unexpectedly executed generic lanes.
- [x] 2.3 Keep PR Full regression selection and `Development validation required` current-head checks intact without downloading generic impact or modular evidence for a reopening.

## 3. Regression evidence

- [x] 3.1 Update workflow-structure and aggregate tests to prove the dedicated route is bounded and ordinary version, documentation, implementation-bound, and code routes are unchanged.
- [x] 3.2 Run focused release-reopening, readiness, impact-workflow, aggregate, and governance validation and record any known gap before finalization.
