## Context

`.github/workflows/release.yml` is the repository's sole npm publisher for nightly previews, explicitly requested development previews, and stable releases. Consumers identify it in three different ways: dispatchers use the filename, `workflow_run` triage uses the displayed workflow name, and generated regression provenance stores both. Governance inventories, path-based validation policy, documentation, and focused tests also pin the current filename.

## Goals / Non-Goals

**Goals:**

- Give the active workflow one publication-oriented filename and display name.
- Update every active producer and consumer atomically so dispatch, scheduling, triage, governance inspection, and validation retain their current behavior.
- Keep historical regression provenance readable after the active identity changes.

**Non-Goals:**

- Changing publication channels, schedules, permissions, environments, package preparation, validation scope, registry behavior, or stable-release semantics.
- Rewriting archived OpenSpec records that accurately refer to the old workflow identity.
- Renaming release-domain modules or commands whose purpose is specifically stable release orchestration.

## Decisions

### Rename both workflow identities

The file becomes `publish.yml` and its top-level Actions name becomes `Publish`. Renaming only the file would leave the same ambiguity in the Actions UI and in workflow-run provenance. The run-name remains channel-specific, so nightly and requested publications retain their existing visible detail.

All active exact-path consumers move together: command dispatch/listing, governance and naming policy, validation invalidators and ownership, documentation, and tests. The nightly triage trigger listens for `Publish`, and new provenance records `Publish` with `publish.yml`.

### Retain bounded historical provenance compatibility

Readers that validate or report persisted workflow provenance accept both the former `Release`/`release.yml` pair and the new `Publish`/`publish.yml` pair, while current dispatchers and producers use only the new identity. This preserves diagnostics for already-recorded run IDs without leaving the old workflow active or permitting mismatched name/file pairs.

### Treat the rename as operationally behavior-preserving

The workflow body is moved without changing triggers, jobs, permissions, concurrency, environments, or commands. Focused tests will assert the new sole-publisher path, dispatch target, governance inventory, triage source identity, and unchanged publication policy.

## Risks / Trade-offs

- **GitHub presents the renamed workflow as a new identity and old run history remains under `Release`.** → Documentation and callers switch atomically, while compatibility readers retain access to old provenance.
- **A missed filename reference could break dispatch or reduce policy coverage.** → Search active repository content for both old identifiers and run the focused governance suites that parse the workflow and its inventories.
- **Accepting legacy provenance could accidentally permit mixed identities.** → Model supported identities as exact name/file pairs and test that mismatched combinations fail closed.

## Migration Plan

Merge the coordinated rename and reference updates in one change. GitHub will schedule and expose `Publish` from `publish.yml`; existing `Release` run records remain immutable history. Rollback is the inverse coordinated rename and reference update, with no package or data migration.
