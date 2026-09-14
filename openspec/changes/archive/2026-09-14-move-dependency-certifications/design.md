## Context

See `proposal.md` for motivation. `dependency-layer.ts` currently shares a root-level naming helper between certification reads and writes. `restart-certification.ts` captures the certification's absolute path and filesystem metadata in a release restart seal. `release-gc.ts` deletes records by the shared helper when collecting a layer and separately scans the data root with a legacy-name regular expression.

Changing only the helper would strand existing records. Renaming existing files immediately would also invalidate retained restart seals, including seals belonging to older immutable runtimes. This migration therefore needs a dual-reader, single-writer transition rather than a filesystem-only move.

## Goals / Non-Goals

**Goals:**
- Centralize canonical and legacy path handling without changing layer identity or certification contents.
- Keep normal reuse and restart validation bounded independently of payload size.
- Make migration and cleanup safe under interruption, concurrent updates, Windows read-only files, and retained old cohorts.

**Non-Goals:**
- Relocate dependency payloads, product release certificates, or other data-directory artifacts.
- Introduce a new certification schema, shorten layer IDs, change hashing, or redesign restart authority.
- Rewrite immutable older runtimes or force a global migration during interactive startup.

## Decisions

### 1. Use the existing layer ID as the filename

The canonical record is `<dataDir>/dependency-certifications/<layerId>.json`. For the motivating example this is `dependency-certifications/dependencies-87101f0c6bfed833661f02f68c7f315d.json`. Preserve `dependencies-` as part of the existing stable layer ID; the directory replaces the redundant `dependency-layer-certification-` prefix.

Use a canonical path helper for new writes and a clearly separate legacy helper for compatibility and cleanup. Validate layer IDs before constructing either path. Create the directory on demand with the existing managed-directory permissions, and validate containment and non-link ownership before trusting or mutating records. A missing directory is normal for legacy installations and empty stores.

Alternatives: retaining the entire old filename inside the new folder keeps unnecessary repetition; using only the digest requires stripping and reconstructing an otherwise unchanged identifier. Neither improves the migration.

### 2. Prefer canonical evidence and migrate only validated legacy evidence

Readers try the canonical record first. Only a genuinely absent canonical record permits legacy lookup; parse errors, permission errors, and validation failures do not silently select the legacy file. Both layouts use the same manifest, schema, layer ID, full digest, and platform checks. Keep the existing authenticated-parent-only exception for old records lacking platform fields narrow; changing storage location must not expand that exception.

When valid legacy evidence is used, publish its validated document in the new directory without changing its content or certification timestamp merely for relocation. Publish a complete read-only file via a same-directory temporary file and an atomic commit, protecting an already-published concurrent winner. Re-read and validate a concurrent winner rather than overwrite uncertain evidence. Interrupted migration leaves the legacy source intact; retry can complete later. Temporary files never count as certificates. Existing complete-verification recovery remains the route for invalid or uncertain evidence.

New materialization and full verification write only canonical certificates. Reuse must not rewrite an already-valid canonical file because unnecessary metadata changes can invalidate new restart seals.

Alternatives: bulk renaming at startup invalidates path-bound seals and adds unbounded work; unconditional fallback can hide damaged canonical evidence; mandatory full verification of every legacy layer defeats the existing bounded reuse behavior.

### 3. Copy first and retain legacy paths for protected consumers

New restart-seal creation ensures canonical publication has completed before capturing evidence using the canonical helper. Existing seals retain their original recorded paths and filesystem evidence; do not rewrite or regenerate them solely for relocation. Legacy source files remain unchanged while protected consumers require them.

Extend cleanup protection discovery to account for the certification paths in retained release seals, verified live cohorts, and active update transactions. A retained older runtime with a layer reference but insufficient metadata to prove canonical support conservatively protects its legacy record. Inspect managed release metadata, not payload files; reuse the existing bounded cleanup scheduling and ownership rules. Do not put an unbounded release scan in layer reads or interactive startup. Legacy deletion requires positive proof that no protected consumer needs that path, not just existence of a canonical copy.

Alternatives: immediate source deletion can break restart and rollback; permanent dual-writing perpetuates root clutter. A temporary duplicate is preferable to either failure mode. No alias or symlink is introduced.

### 4. Integrate both layouts into bounded cleanup

Teach layer deletion to remove obsolete canonical and legacy records. Scan the dedicated directory for direct regular files matching `dependencies-[a-f0-9]{32}.json`, and retain the existing strict legacy scan during the transition. A migrated legacy duplicate can be removed even if its layer is still retained, but only when canonical evidence is valid and all protected consumers have ceased requiring the old path. If the layer has been safely deleted and has no protected references, both record forms are obsolete.

Use the existing cleanup lease, item/time budgets, retries, and failure recording. Tolerate missing directories and already-removed records. Do not follow directory or record links, recursively delete unknown content, or remove unrelated files. Retry read-only/sharing violations without blocking foreground startup. After the transition, normal new writes produce no root-level dependency certificates; obsolete copies disappear as old protected consumers retire.

Alternatives: handling only layer-deletion cleanup leaves redundant legacy copies forever when a shared layer is reused; broad recursive deletion has unsafe ownership semantics.

## Risks / Trade-offs

- Protected old releases can keep root-level copies for a while -> document the transition and test eventual removal after the last old consumer retires; correctness takes precedence over immediate cosmetic cleanup.
- Certification metadata is embedded in restart seals -> leave protected legacy files and valid canonical records untouched, and bind only new seals to the new location.
- Concurrent migration or Windows sharing failures can interrupt publication -> preserve the source, validate the concurrent winner, and retry safely without accepting partial evidence.
- Legacy protection may be ambiguous -> retain records conservatively and report cleanup diagnostics rather than weakening rollback or liveness protections.
- Existing naming or restart work may change these modules -> implement from current integrated code and retain current identity constants and compatibility checks rather than restoring old literals.

## Migration Plan

1. Deliver path handling and new writers together with validated legacy reads; keep existing certificate formats and payload identities unchanged.
2. Lazily copy valid legacy records as their layers are used by updated code. New seals refer to canonical records; old protected seals and runtimes keep their legacy records.
3. Run bounded cleanup for obsolete duplicates and unreferenced records in both locations. No user-driven file moves or global startup migration are required.
4. Verify upgrade, interrupted migration, concurrent reuse, no-live-supervisor restart, retained-old-release rollback, and eventual legacy cleanup in isolated fixtures on Windows and POSIX runners.
5. Rollback to a retained older release uses its preserved legacy records and seal. If unrelated evidence is missing or invalid, retain the pre-existing safe full-verification recovery; never edit an old seal's paths merely to make validation pass.
