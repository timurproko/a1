# Acceptance — fix-home-end-shortcuts

## Verdict

**Accepted with known gaps for manual archival on 2026-09-14. Not complete or automatically archive-eligible.**

The maintainer accepted the recent merged implementations, was informed that unchecked tasks include substantive validation and implementation evidence gaps, and explicitly replied: “yes archive all merged with known gaps keep unfinished plans”. This post-merge authorization accepts the integrated work and this manual disposition; it does not assert that missing tests or detailed physical/spec review happened before integration. No machine-readable complete `openspec-acceptance` record is fabricated.

## Verified merge and required-CI provenance

- [PR #320](https://github.com/timurproko/a1/pull/320): confirmed `MERGED` at 2026-09-12T11:12:16Z; head `79747868722e05901a9c47d0d569873a663cb358`; merge `26bcb352ef992783a80c18fe74121220b593ecbb`.
  - [Successful required Development validation](https://github.com/timurproko/a1/actions/runs/34689490746/job/103543819278). This is not proof that separate Full regression, release, or physical gates passed.

## Known gaps retained

`tasks.md` is preserved byte-for-byte with **2 unchecked tasks** (3.1, 3.2). Their complete original descriptions, existing evidence, and any historical pending or contradictory findings remain authoritative evidence gaps. No checkbox was automatically completed, including mixed legacy acceptance/archive tasks or the optional mechanical tasks.

Only the new Ctrl+Home/Ctrl+End navigation and label changes are carried into shared requirements. The older snapshot's docked steering language is not restored over #266.

## Specification disposition

Synchronized implemented requirements into: `custom-session-viewport`. Shared requirements preserve unrelated scenarios and later merged behavior.

See [the batch reconciliation report](../../../reports/2026-09-14-merged-backlog.md) for shared-spec resolutions and retained plans. All selected requirement results were compared against canonical specs before the archive move; withheld/superseded requirements are explicitly excluded from a full-sync claim.

## Integration status

This record stages an OpenSpec-only archive follow-up. Archive integration and retained-worktree cleanup are complete only when the follow-up PR is confirmed merged; this file does not claim that future result.
