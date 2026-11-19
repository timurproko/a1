# Acceptance — restore-v2-transient-tail-layout

## Verdict

**Accepted with known gaps for manual archival on 2026-09-14. Not complete or automatically archive-eligible.**

The maintainer accepted the recent merged implementations, was informed that unchecked tasks include substantive validation and implementation evidence gaps, and explicitly replied: “yes archive all merged with known gaps keep unfinished plans”. This post-merge authorization accepts the integrated work and this manual disposition; it does not assert that missing tests or detailed physical/spec review happened before integration. No machine-readable complete `openspec-acceptance` record is fabricated.

## Verified merge and required-CI provenance

- [PR #266](https://github.com/timurproko/a1/pull/266): confirmed `MERGED` at 2026-09-06T13:46:16Z; head `1e5b620918dafa46902047a092a227b628a2f3e9`; merge `101c4ecf8524ed8d970b756b1945ade5e199a7bb`.
  - [Successful required Development validation](https://github.com/timurproko/a1/actions/runs/34036544338/job/101496972803). This is not proof that separate Full regression, release, or physical gates passed.

## Known gaps retained

`tasks.md` is preserved byte-for-byte with **3 unchecked tasks** (4.4, 5.1, 5.2). Their complete original descriptions, existing evidence, and any historical pending or contradictory findings remain authoritative evidence gaps. No checkbox was automatically completed, including mixed legacy acceptance/archive tasks or the optional mechanical tasks.

Transient steering, fitting-status alignment, and viewport reuse are synchronized together with #308's later stale-frame safeguards and #320's Ctrl+End navigation. Historical End ownership is not restored.

## Specification disposition

Synchronized implemented requirements into: `custom-session-viewport`. Shared requirements preserve unrelated scenarios and later merged behavior.

See [the batch reconciliation report](../../../reports/2026-09-14-merged-backlog.md) for shared-spec resolutions and retained plans. All selected requirement results were compared against canonical specs before the archive move; withheld/superseded requirements are explicitly excluded from a full-sync claim.

## Integration status

This record stages an OpenSpec-only archive follow-up. Archive integration and retained-worktree cleanup are complete only when the follow-up PR is confirmed merged; this file does not claim that future result.
