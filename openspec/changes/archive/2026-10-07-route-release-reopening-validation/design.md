## Context

`Development validation` currently has two generic low-cost classifications: documentation-only and version-only. The latter accepts only `package.json`, `package-lock.json`, and `packages/a1-install/package.json` when every changed line is a version field. A generated reopening necessarily also adds `docs/releases/<released>.md`; that fourth path makes `versionOnly` false. Because package manifests and the lockfile are validation invalidators, the ordinary fallback conservatively schedules every modular owner plus full rendering.

The post-publication path already has a stronger semantic classifier in `scripts/governance/release-reopening-auto-merge.mjs`. It checks the fixed App identity, same-repository branch and base, absence of lifecycle metadata, exact four-file shape, version-only manifest differences, patch succession, published stable Release, and byte-equivalent normalized note. The trusted documentation auto-merge manager invokes it again before integration.

## Goals / Non-Goals

**Goals:** make exact reopening validation proportionate; bind the exemption to trusted base policy and the exact current head; retain one protected aggregate; and fail closed when identity, content, API evidence, or lane outcomes disagree.

**Non-Goals:** broadening generic version-only or documentation-only rules; reducing validation for human-authored version changes; changing publication, reopening generation, auto-merge authority, or branch protection; or treating the reopening route as implementation acceptance.

## Decisions

### Use a distinct semantic route

The implementation will expose a `release-reopening` decision separately from `version-only`. Adding `docs/releases/**` to generic version-only classification would let an arbitrary mixed version-and-note change avoid product validation based only on paths and line shape. The dedicated route instead requires the complete existing reopening classifier and keeps every ordinary PR on its present path.

### Decide with exact-base trusted policy

The route will be computed by code checked out from the pull request's exact base, using read-only GitHub access. The decision will bind the event pull-request number, base SHA, and head SHA to current API metadata before it is emitted. It will enumerate the complete changed-file list and read the three manifests and release note at the exact base/head refs, then resolve the published Release through the same callbacks used by the existing pure classifier.

A missing policy during bootstrap, API failure, incomplete pagination, identity drift, malformed response, or classifier refusal cannot produce the exemption. A reopening-shaped PR that is not verified continues through ordinary impact validation when safe; routing uncertainty must never be interpreted as a lightweight success.

### Skip generic analysis and product lanes after verification

For a verified reopening, the change-surface job will emit bounded fixed outputs for the exact head instead of installing dependencies and executing head-controlled impact selection. Documentation, naming, modular, rendering, delivery, and acceptance jobs will be skipped. PR Full regression selection remains a small independent exact-base check and the selected complete suite remains skipped under ordinary cadence.

The protected aggregate receives the explicit route bit. It accepts the route only when change classification succeeded for the expected head, implementation/delivery routing is ordinary, and every generic lane has the expected skipped result. Generic impact artifacts and modular outcomes are neither downloaded nor required for this route.

### Preserve independent integration verification

A successful lightweight Development validation does not authorize a merge by itself. Documentation auto-merge continues to fetch current metadata and rerun `classifyReleaseReopening` before arming or executing exact-head squash integration. If the public Release or pull-request state changes after CI, that later verification refuses integration even though the historical check remains green.

## Risks / Trade-offs

- **Duplicate GitHub reads:** Development validation and documentation auto-merge both inspect the candidate. This is intentional defense in depth and avoids transferring merge authority to a PR workflow artifact.
- **External Release edits do not trigger PR CI:** the merge manager's fresh classification remains the final defense and disables integration on disagreement.
- **Bootstrap base lacks the route:** the implementation PR itself and any PR targeting an older base retain conservative ordinary validation.
- **Lookalike reopening branches may still consume ordinary CI:** refusal grants no exemption; optimizing hostile or malformed inputs is less important than failing closed.

## Planned Evidence

Focused tests will exercise exact-head acceptance, author/path/content/release refusal, stale event/API identity, incomplete changed-file enumeration, workflow lane suppression, aggregate acceptance of intentional skips, and rejection of unexpected successful, failed, or missing generic lanes. Existing release-reopening auto-merge tests remain the behavioral source for the shared semantic classifier.
