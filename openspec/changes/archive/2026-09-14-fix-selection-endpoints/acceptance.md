# Acceptance — fix-selection-endpoints

## Verdict

**Accepted with known gaps for manual archival on 2026-09-14. Not complete or automatically archive-eligible.**

The maintainer accepted the recent merged implementations, was informed that unchecked tasks include substantive validation and implementation evidence gaps, and explicitly replied: “yes archive all merged with known gaps keep unfinished plans”. This post-merge authorization accepts the integrated work and this manual disposition; it does not assert that missing tests or detailed physical/spec review happened before integration. No machine-readable complete `openspec-acceptance` record is fabricated.

## Verified merge and required-CI provenance

- [PR #235](https://github.com/timurproko/a1/pull/235): confirmed `MERGED` at 2026-09-05T07:57:24Z; head `4e3dbdc9f9c721a4241950dc35f1a64eff036cc6`; merge `2c1d3f666e0277b28a502c5ab72788e8b94f08a9`.
  - [Successful required Development validation](https://github.com/timurproko/a1/actions/runs/33953454236/job/101272841346). This is not proof that separate Full regression, release, or physical gates passed.

## Known gaps retained

`tasks.md` is preserved byte-for-byte with **4 unchecked tasks** (3.2, 3.3, 4.2, 4.3). Their complete original descriptions, existing evidence, and any historical pending or contradictory findings remain authoritative evidence gaps. No checkbox was automatically completed, including mixed legacy acceptance/archive tasks or the optional mechanical tasks.

Outstanding CI-evidence reconciliation, exact-artifact manual review, platform/publication checks, and closeout obligations remain as specified in the unchecked tasks. Broad acceptance does not supply missing terminal versions, timings, screenshots, run identities, or cross-platform attestations.

## Specification disposition

Synchronized implemented requirements into: `custom-session-viewport`, `ui-components`. Shared requirements preserve unrelated scenarios and later merged behavior.

See [the batch reconciliation report](../../../reports/2026-09-14-merged-backlog.md) for shared-spec resolutions and retained plans. All selected requirement results were compared against canonical specs before the archive move; withheld/superseded requirements are explicitly excluded from a full-sync claim.

## Integration status

This record stages an OpenSpec-only archive follow-up. Archive integration and retained-worktree cleanup are complete only when the follow-up PR is confirmed merged; this file does not claim that future result.
