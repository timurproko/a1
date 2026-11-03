# Design: Recover npm publication from duplicate transparency-log entries

## Context

Development publication run `41670654403` validated both exact package tarballs and completed trusted-publishing preflight, but the installer upload failed with npm `TLOG_CREATE_ENTRY_ERROR` and HTTP 409 because an equivalent Sigstore transparency-log entry already existed. npm served neither package version afterward. The workflow currently invokes `npm publish` directly, so it cannot distinguish this transient provenance failure from authentication, package, policy, or registry failures.

## Decisions

### Use one exact-package publication helper

A release helper will own each `npm publish` invocation. The workflow will pass the already validated tarball, channel, and expected registry identity. The helper will preserve `--provenance`, public access, ignored lifecycle scripts, and the public npm registry.

### Retry only the observed duplicate-entry failure

The helper will capture bounded npm output while still forwarding it to the job log. It will retry only when npm exits nonzero and the output identifies both `TLOG_CREATE_ENTRY_ERROR` and an equivalent transparency-log entry. Authentication failures, policy refusals, package conflicts, networking errors without that identity, and all other failures will exit without retry.

### Reconcile registry state before another upload

After the recognized failure, the helper will query the exact package version without cache. If npm already serves the expected integrity and shasum, publication is complete. If npm serves different bytes, the helper fails. Only an absent version permits another publish attempt. This prevents a retry from overwriting or masking an unexpected publication.

### Keep retries bounded

The helper will use a small fixed attempt limit and delay. Exhaustion remains a visible failure so publication cannot loop indefinitely or weaken the aggregate result.

### Preserve pair ordering and final verification

The installer remains first, followed by the application. The existing final registry verification remains authoritative for both exact package identities and the requested dist-tag. A later workflow rerun still treats an already published exact package as a no-op.

## Rejected Alternatives

- Publishing without provenance was rejected because it weakens the trusted-publication contract.
- Treating every HTTP 409 or every npm failure as retryable was rejected because package conflicts and policy failures must remain final.
- Ignoring the duplicate transparency-log error was rejected because the registry may still return 404, as in the observed failure.
- Retrying the entire publication workflow automatically was rejected because it repeats expensive validation and broadens mutation authority instead of recovering locally around the transient operation.
