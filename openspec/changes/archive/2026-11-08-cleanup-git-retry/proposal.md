# Proposal

## Why

Under heavy concurrent Git use on Windows, `git rev-parse` can exit successfully with empty output. Local cleanup already handles this:

- Worktree inspection reads its Git values through `requiredGitValue`, which retries an empty result twice on Windows and then fails closed with `git-operation-failed`.
- The worktree inventory retries a truncated listing.

`discoverRepository` (`scripts/governance/local-cleanup-git.mjs`) reads `--git-common-dir` without that retry and passes the trimmed result straight to `realpath`. An empty result becomes `ENOENT: no such file or directory, realpath ''`.

- Locally, `test/repository-governance/local-cleanup.test.ts` fails on Windows whenever its four node test files run in parallel: "complete blocks unknown ignored content and conflicting ownership" fails in repository discovery. Each file passes alone.
- In the cleanup tool itself, the same race can end a sweep or handoff with a raw `ENOENT` instead of the named, retried, fail-closed result.

## What Changes

- **Repository discovery reads the common Git directory through `requiredGitValue`**, so an empty result is retried on Windows and otherwise fails closed as `git-operation-failed`, like every other required Git value in cleanup.
- **A regression test** drives `discoverRepository` with a Git runner that returns an empty common directory first, and asserts that discovery retries on Windows and fails closed elsewhere.
- **Unchanged.** Every cleanup decision, result code and journal entry when Git answers normally.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `local-worktree-cleanup`: repository discovery treats an empty required Git value like every other required Git value.

## Impact

- `scripts/governance/local-cleanup-git.mjs`.
- A new case in `test/repository-governance/local-cleanup.node.mjs`.
