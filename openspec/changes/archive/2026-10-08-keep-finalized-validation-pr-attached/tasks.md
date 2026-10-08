## 1. Exact-head metadata contract

- [x] 1.1 Extend version-3 implementation metadata policy and declarations with a finalized-head SHA that is required only for finalized records; retain bounded recognition of existing unbound finalized records for trusted normalization.
- [x] 1.2 Update parser, compatibility, documentation example, cleanup, lifecycle, and GitHub-reader tests for valid matching records plus missing, partial, malformed, stale, and unknown-field cases.

## 2. Trusted finalization publication

- [x] 2.1 Build the post-push implementation fence from the exact final commit and update the body even when archive and manifest paths are unchanged.
- [x] 2.2 Add fresh expected-body and expected-head guards before mutation; return bounded retry outcomes for either race without overwriting a newer body or head.
- [x] 2.3 Preserve terminating idempotence so a matching finalized tree/body/head produces no commit, body update, dispatch, or repeated event.
- [x] 2.4 Add publication tests for first finalization, same-path re-finalization, normalization of an existing unbound finalized PR, body race, head race, lease race, and already-finalized no-op.

## 3. PR-associated validation policy

- [x] 3.1 Make readiness defer finalized version-3 pull-request events when the body binding is absent or stale, while preserving draft, legacy, ordinary code, documentation, and release-reopening routes.
- [x] 3.2 Require finalized delivery, acceptance, impact selection, and the protected aggregate to consume native PR-event identity for the matching head; keep manual dispatch diagnostic-only.
- [x] 3.3 Add workflow/governance tests proving an intermediate pre-binding run emits no protected success and the body-update event exposes selected lane progress plus `Development validation required` on the PR.

## 4. Documentation and operational evidence

- [x] 4.1 Update the delivery runbook and repository policy to describe the exact-head fence transition, PR-visible validation trigger, race behavior, and prohibition on dispatch as replacement evidence.
- [x] 4.2 Validate the final workflow policy, strict OpenSpec change, metadata examples, and repository-governance test owners.
- [x] 4.3 Exercise deterministic publication fixtures through first finalization, same-path re-finalization, and the terminating no-op; verify the exact pushed SHA is published in the PR body for the native edited-event route.
