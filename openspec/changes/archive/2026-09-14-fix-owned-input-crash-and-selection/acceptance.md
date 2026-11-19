# Acceptance — fix-owned-input-crash-and-selection

## Verdict

**Accepted with known gaps for manual archival on 2026-09-14. Not complete or automatically archive-eligible.**

The maintainer accepted the recent merged implementations, was informed that unchecked tasks include substantive validation and implementation evidence gaps, and explicitly replied: “yes archive all merged with known gaps keep unfinished plans”. This post-merge authorization accepts the integrated work and this manual disposition; it does not assert that missing tests or detailed physical/spec review happened before integration. No machine-readable complete `openspec-acceptance` record is fabricated.

## Verified merge and required-CI provenance

- [PR #312](https://github.com/timurproko/a1/pull/312): confirmed `MERGED` at 2026-09-12T08:26:20Z; head `e1713d710ae9cbcd1e730baf1f03fe63b3e8970d`; merge `87da3672012708f1bd80a9914443724abbbd2b98`.
  - [Successful required Development validation](https://github.com/timurproko/a1/actions/runs/34682709116/job/103525564805). This is not proof that separate Full regression, release, or physical gates passed.
- [PR #306](https://github.com/timurproko/a1/pull/306): confirmed `MERGED` at 2026-09-12T07:33:40Z; head `5224e5d8d6be2fa22e039de68b0f7e9df3435011`; merge `63fd5bf2cd0ac7a3cba4270e22e67f2ce502961d`.
  - [Successful required Development validation](https://github.com/timurproko/a1/actions/runs/34635032000/job/103386107578). This is not proof that separate Full regression, release, or physical gates passed.
- [PR #289](https://github.com/timurproko/a1/pull/289): confirmed `MERGED` at 2026-09-09T17:47:42Z; head `800cc15c9f9f6ea04cec1d436d28696180688378`; merge `4f7ef5741166199af6cfbd54524c42f8fce22f2d`.
  - [Successful required Development validation](https://github.com/timurproko/a1/actions/runs/34376786174/job/102572642449). This is not proof that separate Full regression, release, or physical gates passed.
- [PR #287](https://github.com/timurproko/a1/pull/287): confirmed `MERGED` at 2026-09-09T11:56:06Z; head `10b355fc59978ae48d64597a816db5385a113a30`; merge `c7977493dbe82c0802cfe7f393a7021932f02aaa`.
  - [Successful required Development validation](https://github.com/timurproko/a1/actions/runs/34346560082/job/102452555994). This is not proof that separate Full regression, release, or physical gates passed.

## Known gaps retained

`tasks.md` is preserved byte-for-byte with **2 unchecked tasks** (6.3, 6.4). Their complete original descriptions, existing evidence, and any historical pending or contradictory findings remain authoritative evidence gaps. No checkbox was automatically completed, including mixed legacy acceptance/archive tasks or the optional mechanical tasks.

The unconditional pre-acquisition visible-marker requirement is withheld: merged #312 explicitly hides unknown clipboard reservations so plain text does not flash screenshot chips. The other implemented attachment/selection/fatal-exit contracts are synchronized. No cold/warm 100 ms measurements or screenshot-quality physical evidence are invented.

## Specification disposition

Synchronized implemented requirements into: `custom-session-viewport`, `owned-pi-ui-foundation`. Shared requirements preserve unrelated scenarios and later merged behavior.

- **Withheld `Image paste remains responsive during background preparation`**: The unconditional visible feedback before clipboard acquisition is superseded by #312: unknown clipboard reservations are intentionally hidden to avoid text-paste screenshot flashes. The 100 ms physical target and full acquisition responsiveness are not verified. Keep this historical requirement unsynchronized rather than promise behavior contradicted by the merged refinement.

See [the batch reconciliation report](../../../reports/2026-09-14-merged-backlog.md) for shared-spec resolutions and retained plans. All selected requirement results were compared against canonical specs before the archive move; withheld/superseded requirements are explicitly excluded from a full-sync claim.

## Integration status

This record stages an OpenSpec-only archive follow-up. Archive integration and retained-worktree cleanup are complete only when the follow-up PR is confirmed merged; this file does not claim that future result.
