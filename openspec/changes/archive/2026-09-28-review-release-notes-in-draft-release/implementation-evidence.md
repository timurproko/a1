# Implementation evidence

## Corrective state

On 2026-09-28, read-only checks confirmed that recovery had not published `0.2.2`:

- GitHub returned no Release, draft or public, whose tag is `v0.2.2`.
- `git ls-remote --tags origin refs/tags/v0.2.2` returned no tag.
- npm returned `E404 No match found for version 0.2.2` for both `@timurproko/a1` and `@timurproko/a1-install`.
- The implementation deletes the automatically merged `docs/releases/0.2.2.md`; PR #615 and its merge grant no approval authority in the new protocol.

## Implemented boundaries

- Stable preparation creates or reuses one exact source-bound draft Release and preserves its editable body without creating a pull request or dispatching publication.
- `--approve` validates the authenticated human's repository permission, normalizes and hashes the exact draft body, and dispatches its source, version, Release database ID, and digest. The workflow independently revalidates the actor and draft before uploading one immutable snapshot artifact.
- Stable packing overlays that snapshot on committed history. Build and prepack gates enforce per-note and total resource bounds and require the packaged stable body to equal its approved source.
- The final tag, public Release body and asset, and `master` movement remain after registry and published-pair verification. The reopening PR persists the exact snapshot with the next `-dev` versions and requires a verified human merge.
- Documentation automation rejects current or renamed-from `docs/releases/**` paths, including the standalone shape that allowed PR #615 to auto-merge.

## Local evidence

The candidate passed build and typechecking; architecture, naming, repository-governance, release-documentation, full code-documentation, YAML parsing, and strict OpenSpec checks. The fast tier passed 3,937 parallel tests with 12 skips and 310 resource-sensitive tests. Focused release-note, target, publication-client, pipeline-policy, documentation-auto-merge, startup-note, and real disposable-Git release-command fixtures passed, including draft reuse/edit preservation, stale and ambiguous draft refusal, App/read-only approver refusal, digest propagation, reopening persistence, and bot-merge refusal. The `package-smoke` scope built one exact development package and passed all six package-surface checks plus seven packaged session-resume checks.

The local Windows host cannot provide the required Defender-enabled stable startup evidence. The exact-head Windows CI lane must retain real-time protection and remains the authority for that gate; no prerequisite was bypassed.

## Post-merge release evidence

A live `0.2.2` preparation or approval is deliberately not performed from this unmerged corrective candidate: doing so would violate the release hold and would bind production review state to code not yet on authoritative `develop`. After authorized manual merge, the first `0.2.2` operation is the acceptance exercise: preparation must create only an editable source-bound draft; explicit human approval must publish its exact edited body only after package verification; the stable install must show it once while `/changelog` retains it and `a1 pi` remains unchanged; and the manually merged reopening PR must store the same body with `0.2.3-dev`. No implementation gap is waived by deferring that production mutation to the protocol it validates.
