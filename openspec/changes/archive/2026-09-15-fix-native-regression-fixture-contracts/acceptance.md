# Acceptance — fix-native-regression-fixture-contracts

## Verdict

**Archived with known gaps by explicit maintainer disposition on 2026-09-15. Not complete or automatically archive-eligible.**

After active-change drift and six unchecked tasks were disclosed, the maintainer instructed: “archive what possible unblock what blocked and archive as well”. This authorizes a manual post-merge archive disposition for the integrated fixture corrections and retained post-merge evidence; it does not convert failed or missing native, nightly, or final-review evidence into success. No machine-readable complete acceptance record is fabricated.

## Verified merge and validation provenance

- [PR #405](https://github.com/timurproko/a1/pull/405): confirmed `MERGED` at 2026-09-15T07:40:07Z; head `2d0dd1503edda48f8ad18075256c45b0fb59e177`; merge `2d992336c48790fb2f793883816905c9db2ec5e7`.
  - [Successful required Development validation](https://github.com/timurproko/a1/actions/runs/34940561264/job/104290882280).
  - [Full regression run 34940561468](https://github.com/timurproko/a1/actions/runs/34940561468) failed on Windows Node 22 while Linux Node 24, macOS Node 24, Windows Node 24, and documentation review passed. The failure remains evidence, not acceptance.
- Corrective [PR #407](https://github.com/timurproko/a1/pull/407) subsequently merged and its own acceptance/archive lifecycle integrated through #409 and #416. That separate lifecycle does not retroactively make #405's failed exact-head Full regression green or supply its missing numbered-package nightly.

## Known gaps retained

`tasks.md` is preserved with **6 unchecked tasks** (5.3, 6.1, 6.2, 6.3, 7.1, 7.2). Their complete descriptions and the post-merge evidence in `evidence.md` remain authoritative. The archive does not claim all four native lanes passed on #405, that a qualifying scheduled numbered-package nightly succeeded, or that final recovery acceptance occurred.

The active-change drift reported by automatic archival came from #407's post-merge evidence and task reconciliation. That evidence is deliberately retained in the archived copy rather than reverted to the original #405 head.

## Specification disposition

The implemented delta is synchronized into `isolated-regression-testing`: the hermetic-instance and architecture-appropriate-regression requirements now include the clipboard acquisition, failure-safe executor, filesystem alias, shell phase, and real-Git diagnostic scenarios. Unrelated canonical requirements and later merged scenarios are preserved.

## Integration status

This record stages an OpenSpec-only archive follow-up. Archive integration and retained-worktree cleanup are complete only after that follow-up PR is confirmed merged.
