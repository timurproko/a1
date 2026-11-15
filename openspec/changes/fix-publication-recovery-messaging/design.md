## Context

The failed development publication built and installed the exact package successfully; Linux and Windows validation passed. macOS failed two tests in `package-install.integration.test.ts`: cancellation recovery timed out after 15 seconds, and updater-loss recovery never produced owner.json within 10 seconds. The npm staging job was skipped; the lane aggregate and final result failed as consequences.

`bin/update-recovery.js` only dispatches when `fileURLToPath(import.meta.url) === resolve(process.argv[1])`. Node resolves an entry's symlinked ancestors when loading its module. On macOS, temporary fixtures commonly enter through `/var/folders` while the module URL names `/private/var/folders`. A lexical inequality silently skips dispatch and exits successfully without owner/result evidence. The proposed correction targets entry dispatch, not longer timeouts.

`dispatchPublication` currently inherits `gh run watch` output, including every setup and teardown step. `describePublicationFailure` lists all failed jobs equally and repeats long job labels before annotation lines. A known platform failure is therefore drowned by derivative lane/result failures.

## Decisions

### Canonical direct-entry recognition

Canonicalize the invoked entry before comparing it with the module entry. Preserve the import-only behavior needed by recovery atomic-write tests. Fail closed on unavailable entry identity; do not interpret an unrelated import as a command invocation. Retain all existing capsule identity, digest, prior-release, npm-prefix, sidecar, and launcher-set validation.

Exercise dispatch through a symlinked directory, including a Windows junction where supported, so regression coverage does not depend solely on macOS's built-in `/var` alias. Cover successful worker startup, cancellation restoration, and updater loss against the actual packaged entry as appropriate. Ensure fixtures terminate their own processes and surface captured diagnostics instead of only a timeout.

### Compact development-publication progress

Replace the development dispatcher's inherited step watcher with structured run/job status reads and concise state-change output. Print the requested version and Actions URL once, then only changed meaningful job/phase states; omit repeated unchanged snapshots and setup/post steps. Preserve the existing stable-candidate waiting contract unless a shared reporting helper is required.

At failure, prioritize failed producer/validation jobs over known derivative lane/result aggregates. Deduplicate and bound annotation text, strip terminal control sequences, shorten platform/job labels, and retain the log URL. Use known downstream jobs only as secondary context when a primary failure exists; retain unknown failures rather than hiding them. Report unavailable diagnostics explicitly. Distinguish a completed failure from interrupted watching or an unavailable status read; never imply that a still-running run failed or that an unknown/partial publication published nothing.

The final summary identifies the version, failing lane or stage, concrete error(s), known publication state, and the next action to inspect/fix and retry. The local command must still exit nonzero for failure. No required lane, assertion, timeout, or registry identity check is weakened.

## Validation Strategy

Use focused recovery-entry and publication-client tests, including aliased direct entry, import-only use, cancellation, updater loss, repeated polling snapshots, completed failure, missing annotations, generic downstream failures, and interrupted/unavailable status reads. Run strict OpenSpec validation and relevant type checking. Reproduce only the affected exact-package installation contracts locally when feasible; native macOS validation remains necessary to confirm the reported platform failure is resolved. Do not claim publication success without a later successful authoritative publication run.

## Risks and Boundaries

- Canonical path comparisons must not enable dispatch when the module is only imported.
- Progress polling must not flood output, mask cancellation, or turn status-read failure into a false publication outcome.
- Failure summaries cannot infer no npm writes merely from a failed aggregate.
- Current environment is Windows; local tests cannot substitute for native macOS evidence.
- Integration and a new publication remain separate maintainer decisions.

## Known Gaps

None in the proposed implementation scope. Live publication recovery and native macOS confirmation are pending implementation and subsequent authoritative validation, not claimed results.
