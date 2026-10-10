# Tasks

## 1. Recognize method-specific enables

- [x] 1.1 Add one shared predicate accepting `auto_merge_enabled`, `auto_squash_enabled`, and `auto_rebase_enabled`.
- [x] 1.2 Use it for active-arm tracking, legacy manual-only refusal, and version-3 abandoned-enable actor checks.

## 2. Cover the observed workflow

- [x] 2.1 Prove squash and rebase enables verify as human auto-merge and as a current human arm, while pre-commit, bot, and legacy cases still refuse.
- [x] 2.2 Replay #742's three disarmed squash enables followed by a manual merge and prove it verifies as manual integration.
- [x] 2.3 Prove documentation automation preserves a method-specific human arm that follows an earlier policy-disarmed attempt.

## 3. Validate the delivered behavior

- [x] 3.1 Run focused repository-governance tests, confirm the new cases fail on the previous policy, run OpenSpec validation and whitespace checks, and record exact results in implementation evidence.
