# Acceptance — fix-streaming-bottom-control-hover

## Verdict

**Accepted with known gaps for manual archival on 2026-09-14. Not complete or automatically archive-eligible.**

The maintainer accepted the recent merged implementations, was informed that unchecked tasks include substantive validation and implementation evidence gaps, and explicitly replied: “yes archive all merged with known gaps keep unfinished plans”. This post-merge authorization accepts the integrated work and this manual disposition; it does not assert that missing tests or detailed physical/spec review happened before integration. No machine-readable complete `openspec-acceptance` record is fabricated.

## Verified merge and required-CI provenance

- [PR #308](https://github.com/timurproko/a1/pull/308): confirmed `MERGED` at 2026-09-12T07:51:37Z; head `cc0cf680d90740cb3bdd3bed4193b126b5c57f72`; merge `1824347e400eca569f9c9c54c4f8a4a0f7cabb41`.
  - [Successful required Development validation](https://github.com/timurproko/a1/actions/runs/34680991638/job/103520727322). This is not proof that separate Full regression, release, or physical gates passed.

## Known gaps retained

`tasks.md` is preserved byte-for-byte with **3 unchecked tasks** (4.3, 5.2, 5.3). Their complete original descriptions, existing evidence, and any historical pending or contradictory findings remain authoritative evidence gaps. No checkbox was automatically completed, including mixed legacy acceptance/archive tasks or the optional mechanical tasks.

Hover input/reuse safeguards are combined with #266's transient ownership and #320's Ctrl+End labels. Detailed physical scroll-only outcomes remain a gap, not inferred from the cache-race tests.

## Specification disposition

Synchronized implemented requirements into: `custom-session-viewport`. Shared requirements preserve unrelated scenarios and later merged behavior.

See [the batch reconciliation report](../../../reports/2026-09-14-merged-backlog.md) for shared-spec resolutions and retained plans. All selected requirement results were compared against canonical specs before the archive move; withheld/superseded requirements are explicitly excluded from a full-sync claim.

## Integration status

This record stages an OpenSpec-only archive follow-up. Archive integration and retained-worktree cleanup are complete only when the follow-up PR is confirmed merged; this file does not claim that future result.
