# Implementation evidence

## Pre-implementation incident

- Development publication: [run 36329487925](https://github.com/timurproko/a1/actions/runs/36329487925), source `040ba369494e17439cb33bbbc80bba958a4e1df2`, version `0.2.1-dev.599`.
- Exact package validation passed on Windows Node 24, Linux Node 24, and macOS Node 24.
- Publish job `108650252531` succeeded: the installer upload was correctly skipped because its exact bytes already existed, the application was published by GitHub Actions, and registry verification passed for both identities and `next` tags.
- Required `Published pair / ${{ matrix.label }}` job `108650799066` was skipped, `Complete release records` was skipped, and aggregate job `108650799095` failed because `POST_PUBLISH` and `COMPLETE` were not successful.
- Registry inspection confirmed both `@timurproko/a1@0.2.1-dev.599` and `@timurproko/a1-install@0.2.1-dev.599` exist under `next`. These immutable bytes are published but the run remains incomplete evidence.

## Planning diagnosis

Development mode intentionally skips the full documentation review. The publish job uses `always()` and explicit allowed-skip/result checks, so it ran successfully. `post_publish` and `complete` use ordinary conditions without `always()`, allowing GitHub's upstream skipped status to suppress them before their direct-success predicates can establish eligibility. The aggregate correctly refused to turn those skips into success.

## Implementation results

Pending explicit plan approval and implementation.

## Known gaps

- A pull request cannot safely publish npm artifacts, so live downstream execution remains a post-merge requirement for the new numbered candidate.
- Run `36329487925` and version `.599` remain immutable and are not retroactively repaired by this change.
