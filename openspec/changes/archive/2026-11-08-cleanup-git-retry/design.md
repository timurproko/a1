# Design

## Context

Local cleanup's worktree inspection already reads its required Git values through `requiredGitValue`, which retries an empty successful answer on Windows and then fails closed with `git-operation-failed`. Repository discovery read the common Git directory directly, so the one value it needs first skipped that protection.

## Decisions

- **Reuse the existing reader.** `discoverRepository` reads `--git-common-dir` through `requiredGitValue`. No new retry policy is introduced: the attempt count, the backoff and the Windows-only retry stay those the inspection path already uses.
- **Fail closed before the filesystem.** An answer that stays empty raises `git-operation-failed` before `canonical` runs, so cleanup never resolves an empty path and reports the same named reason as every other Git failure.
- **Test the race directly.** The regression case wraps the real bounded Git runner and makes only the common-directory query answer empty, so it exercises discovery's real repository checks around the injected empty answer.

## Risks

- **A slower discovery on a failing machine.** Mitigation: the retry adds at most two short waits, only on Windows and only when Git returned nothing.
