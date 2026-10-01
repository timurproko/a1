## Context

GitHub resolves a reusable workflow call before evaluating the called jobs' `if` conditions. The calling workflow's permissions are an upper bound for every nested job. `publish.yml` has two jobs that request `contents: write`: `approval`, used by candidate/stable publication to read draft Release data, and `complete`, used by stable publication to upload the Release asset and fast-forward `master`.

`release-candidate.yml` and `finalize-release.yml` already grant `contents: write`. `develop.yml` grants only `contents: read`, so GitHub rejects the entire call with:

> The nested job 'approval' is requesting 'contents: write', but is only allowed 'contents: read'.
> The nested job 'complete' is requesting 'contents: write', but is only allowed 'contents: read'.

Because validation fails during workflow expansion, the run contains no jobs and the local client can report only `startup_failure` / `no job reported failure`.

## Goals / Non-Goals

**Goals:**

- Let the authorized `develop.yml` dispatch instantiate and run the reusable publisher.
- Preserve the reusable workflow's existing per-job least-privilege boundaries.
- Prevent caller/callee permission-envelope drift with a focused repository test.

**Non-Goals:**

- Changing which source or preview version is selected.
- Giving executing development jobs write access they do not already request.
- Refactoring the shared publisher into separate channel-specific workflows.
- Retrying or republishing failed run 36857604265 automatically.

## Decisions

### Grant the required caller ceiling

Change `develop.yml` from `contents: read` to `contents: write`. This is a permission ceiling for the reusable call, not the effective permission of every called job. The reusable workflow keeps top-level `actions: read` and `contents: read`; only jobs with explicit job-level permission overrides receive more. In development mode the write-scoped `approval` and `complete` jobs are skipped by their existing conditions, while the npm publishing job separately requests only the OIDC and read permissions it needs.

This matches the pattern already documented in `release-candidate.yml`: a caller must grant permissions required by the reusable workflow's complete static graph even when a selected mode skips write-scoped jobs.

### Pin the reusable-call contract in focused policy tests

Extend release pipeline policy coverage to parse each trusted publication wrapper and assert that callers of `publish.yml` grant the reusable workflow's required permission ceiling. The regression assertion will include the development wrapper, which was previously checked only for its trigger and publisher reference.

A generalized GitHub workflow compiler is out of scope. The focused assertion protects the repository's known wrappers and the specific permission relationship that caused the live startup failure.

## Risks / Trade-offs

- The caller declaration becomes broader than development mode's runtime needs. This is required by GitHub's static reusable-workflow validation; the called workflow's top-level and job-level permissions continue to bound effective tokens.
- A future write-scoped job could become reachable in development mode. Existing mode-condition policy tests and the new wrapper ceiling test do not replace review of job conditions, so the implementation will retain the current mode assertions.
- Local YAML parsing cannot prove GitHub's full workflow semantics. The test targets the exact checked contract, and the next explicit development publication is the live confirmation.

## Migration Plan

Merge the workflow correction, then rerun `npm run develop`. The command should dispatch a run with jobs instead of a startup failure and continue through the existing exact-package validation/publication path for the current authoritative `develop` head. Run 36857604265 remains immutable failure evidence and is not rerun.

## Evidence

Planning evidence only: GitHub run 36857604265 has conclusion `startup_failure`, zero jobs, and its run page identifies `develop.yml` line 22 as an invalid reusable-workflow call because nested `approval` and `complete` request `contents: write` above the caller's `contents: read` ceiling. Implementation and focused test evidence remain pending explicit approval.
