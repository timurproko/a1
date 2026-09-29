## 1. Trusted branch-refresh policy

- [x] 1.1 Implement a pure candidate classifier for open pull requests targeting `develop`; verify drafts, forks, closed/changed identities, other bases, current heads, and stale same-repository heads receive explicit outcomes.
- [x] 1.2 Implement paginated reconciliation against fresh target and pull-request state, using GitHub's update-branch operation with the observed expected head; verify successful, already-current, racing, conflicting, malformed, and operational-failure responses are bounded and reported.
- [x] 1.3 Ensure one conflicting or concurrently changed candidate does not prevent independent eligible candidates from being considered, while authentication, permission, transport, and malformed-response failures remain visible as workflow failures.

## 2. Trusted workflow integration

- [x] 2.1 Add a default-branch-trusted workflow for merged pull-request close events and completed documentation-auto-merge runs, with global non-cancelling concurrency and no pull-request-head execution.
- [x] 2.2 Mint a short-lived event-producing repository App token with only required contents/pull-request permissions; verify no `GITHUB_TOKEN` branch update, direct push, check synthesis, auto-merge, or merge authority is introduced.
- [x] 2.3 Update the declarative workflow inventory and its source inspection so the workflow's triggers, permissions, trusted source, concurrency, and branch-refresh authority are exact and drift-detectable.

## 3. Regression and delivery evidence

- [x] 3.1 Add focused policy and workflow tests covering ordinary merged-close refresh, documentation-workflow recovery, duplicate triggers, stale/current branches, pagination, expected-head races, drafts, forks, conflicts, and App-token event requirements.
- [x] 3.2 Run applicable typechecking, governance, focused tests, strict OpenSpec validation, and diff hygiene; record passing evidence without weakening required checks or unrelated lifecycle policies.
- [ ] 3.3 Record live evidence after deployment that a `develop` merge refreshes multiple non-conflicting ready pull requests and starts ordinary current-head CI, while a draft and a conflicting control remain unchanged and implementation merges remain manual.
