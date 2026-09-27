## 1. Reproduce and guard the workflow contract

- [x] 1.1 Preserve run `36329487925` evidence showing successful native validation and publication followed by skipped `post_publish`/`complete` and a failed aggregate; verify `.599` is described as published immutable bytes without claiming complete publication evidence.
- [x] 1.2 Extend focused release-pipeline policy coverage to isolate `post_publish` and `complete`; verify each requires always-evaluation, selected work/build, and successful direct prerequisites while the aggregate still requires all downstream outcomes.

## 2. Repair downstream publication evaluation

- [x] 2.1 Update `post_publish` to evaluate after allowed upstream skips only when plan, package, and publish direct dependencies succeeded; verify failed, cancelled, or skipped direct dependencies remain ineligible.
- [x] 2.2 Update `complete` to evaluate only after plan, package, publish, and post-publish success; preserve stable-only tag, GitHub Release, and `master` mutation guards and the development completion record.
- [x] 2.3 Verify workflow display name, triggers, channel/tag selection, validation matrices, package bytes, npm authentication, and aggregate requirements remain unchanged.

## 3. Validation and delivery

- [x] 3.1 Run focused release-pipeline policy tests, typechecking, changed-code documentation governance, and strict OpenSpec validation; do not run or weaken local full/release suites.
- [x] 3.2 Reconcile current `origin/develop`, complete implementation evidence and known-gap disposition, and prepare implementation-specific acceptance scenarios for the same PR.
- [x] 3.3 Keep exact-head PR validation and a newly numbered post-merge development publication mandatory; require successful publication, native published-pair smoke, completion, and aggregate before declaring the development installer fully proven.
