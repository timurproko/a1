## Context

PR #858 correctly made candidate activation fail closed when a newer client cannot prove control continuity for every affected live resident source. During the first subsequent automatic update, package replacement, immutable materialization, certification, and candidate startup all succeeded. Continuity inspection nevertheless rejected the candidate because `tabs/91eb3e7a9f4872131a67/server.json` was an old owner record with no `releaseId`. The recorded owner process was dead. Removing only that dead directory made the same workspace check return compatible.

`native/terminal-host/src/roles/source_route.rs::profiles()` currently deserializes each owner marker as the complete current `Owner` before it asks native process identity whether the owner is alive. That order makes schema evolution stronger than liveness: a dead old marker can block every future compatible update forever. `release_holds.rs` already demonstrates the safer ordering for uncertain historical evidence by extracting the minimum process identity first.

The automatic updater then collapses activation refusal into ordinary attempt failure. Its coordinator records no installed version and applies the 24-hour failed-target cooldown, even though npm replacement and certified release preparation do not need to run again. Existing UI deliberately shows only verified restart readiness, so the user receives no indication that a prepared update is waiting on continuity.

## Goals / Non-Goals

**Goals:**
- Ignore only historical resident owner records whose exact recorded process identity is provably gone.
- Preserve strict current-schema and compatibility checks for any record that may still represent live authority.
- Preserve the certified candidate and retry only activation after a continuity blocker clears.
- Distinguish prepared/blocked activation from failed installation in durable state and user-visible diagnostics.
- Keep the prior verified client selected and every resident process untouched until candidate activation succeeds.

**Non-Goals:**
- Deleting or rewriting legacy tab directories as part of continuity inspection.
- Treating malformed records, inaccessible process identity, PID-only evidence, or schema mismatch as proof of death.
- Relaxing current source-route profile, release, credential, epoch, protocol, or controller compatibility checks.
- Retrying registry lookup, npm installation, materialization, or certification merely to retry activation.
- Exposing native paths, PIDs, credentials, protocol internals, or raw continuity diagnostics in the interactive notice.

## Decisions

### 1. Establish liveness from a minimal historical identity before decoding modern authority

Source-route discovery will parse owner JSON into a bounded generic/minimal representation sufficient to extract `pid` and `startIdentity`. It will ask the existing native exact-process-identity primitive whether that recorded identity is live, gone/PID-reused, or uninspectable.

If the exact recorded identity is provably gone, discovery will omit that owner record before requiring fields introduced by newer schemas. The directory and files remain untouched. If the identity is live or cannot be inspected, discovery will require the complete current owner schema and all existing profile/release/namespace checks. Missing or invalid minimal identity cannot prove death and therefore remains a typed blocking error.

This is not legacy compatibility. No old live host is admitted through a current route, no obsolete contract is executed, and no record is migrated. It only prevents dead metadata from impersonating live continuity authority.

### 2. Cover the realistic mixed-history workspace

The primary regression will construct one supported live predecessor source plus one dead legacy owner record lacking modern release fields. Candidate workspace inspection must remain compatible and return only the live source. Separate cases will prove that a live legacy owner, an owner whose identity cannot be inspected, malformed JSON without an exact dead identity, a wrong-profile current owner, and a current live incompatible source still block.

PID reuse is treated as recorded-process death, using the same exact start-identity rule as the rest of resident custody. Tests will assert that no ignored record is removed or signalled.

### 3. Model continuity refusal after certification as prepared activation, not installation failure

Automatic update state will gain a distinct durable prepared/activation-blocked disposition bound to the exact target and certified immutable candidate. The state records a bounded sanitized reason category and retry timing, while detailed native diagnostics remain in bounded internal transaction/update evidence.

When activation refuses solely because resident continuity cannot currently be verified, rollback will restore/retain the prior selected client as it does now, but it will not discard proof that the target package and immutable candidate were successfully prepared. Ordinary package, registry, recovery, certification, warmup, or non-continuity activation failures remain failed attempts and retain the existing 24-hour same-target cooldown.

### 4. Retry the activation boundary without reinstalling

Auto observation will recognize an exact prepared candidate and schedule bounded activation retries on the normal short observation cadence. A retry will revalidate candidate certification, target identity, prior-client eligibility, and current resident workspace continuity, then enter the existing activation commit path. It will not rerun registry resolution or npm global replacement when the installed target and certified candidate still match.

A changed/newer discovered target may supersede the prepared target through the existing updater lease rules. Missing or invalid candidate proof converts the attempt to an ordinary safe failure or fresh update path; it never bypasses materialization/certification. Explicit update remains available for immediate detailed troubleshooting and may reuse the same prepared target when valid.

### 5. Surface one sanitized blocked status without claiming restart readiness

Automatic-update observation will expose a release diagnostic distinct from `installed`. Bare A1 and `a1 pi` will render exact text `Update prepared; activation blocked` in the same non-transcript semantic status area used for update lifecycle feedback. The notice is persistent for the observing process, noninteractive, and contains no raw native reason.

The blocked notice never says restart, never claims the candidate is active, and never replaces ordinary Agent status. Once activation succeeds it becomes the existing `Update installed, restart to update` notice. If the prepared candidate becomes invalid or an ordinary failure replaces it, the blocked notice disappears under the corresponding state rules; automatic failures still do not produce a raw failure popup.

## Risks / Trade-offs

- A too-permissive legacy parser could hide a live old host. Mitigation: omission requires both a valid exact recorded identity and a native `gone`/start-mismatch verdict; every other outcome blocks.
- Prepared state could outlive its candidate. Mitigation: bind it to exact target/release certification and revalidate before each activation retry.
- Repeated retries could cause churn. Mitigation: use bounded observation cadence and the existing single-owner update lease; do not retry the expensive installation path.
- A blocked status may persist for a genuinely incompatible live predecessor. This is truthful: the prior client remains usable, the candidate is prepared, and activation remains intentionally blocked until that source exits or a compatible candidate supersedes it.

## Validation Plan

- Native unit/process tests for dead legacy, PID-reused, live legacy, uninspectable, malformed, wrong-profile, and mixed live-current plus dead-legacy owner records.
- Resident continuity tests proving the mixed workspace is compatible while every uncertain/live unsupported case remains fail-closed.
- Automatic-update state tests for prepared/blocked persistence, restart-safe observation, short activation retry, no npm reinstall, successful transition to installed, superseding targets, and invalid candidate proof.
- Activation tests proving the prior client remains selected and live Agents remain unchanged through refusal and later retry.
- UI tests for exact blocked wording, sanitized content, placement/priority, transition to restart-ready, and absence for ordinary failed/skipped attempts.
- Typecheck, targeted Node and native suites, strict OpenSpec validation, and repository architecture checks before delivery handoff; exact-head CI remains authoritative.

## Approval

The maintainer requested implementation of this corrective PR in the current interaction.
