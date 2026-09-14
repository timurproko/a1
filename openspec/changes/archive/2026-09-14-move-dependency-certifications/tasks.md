## 1. Canonical storage and validated migration

- [x] 1.1 Introduce canonical and legacy certification path helpers with validated layer IDs and managed-directory creation; verify exact `dependency-certifications/<layerId>.json` placement, absent-directory handling, and unchanged payload identities in focused dependency-layer tests.
- [x] 1.2 Route materialization and full-verification writers to canonical storage with complete read-only publication; verify fresh writes create no legacy record and valid canonical reuse preserves file evidence.
- [x] 1.3 Add canonical-first reads and validated legacy-only migration without broadening the authenticated-parent compatibility exception; verify valid legacy reuse avoids payload reads, preserves certification contents, and rejects schema, digest, identity, and platform mismatches.
- [x] 1.4 Make migration interruption-safe and concurrent-winner-safe while retaining legacy sources; verify interrupted publication, concurrent migration, conflicting canonical evidence, and permission failures cannot produce trusted partial records or silent legacy fallback.
- [x] 1.5 Enforce managed containment and non-link ownership for certification directories and records; verify traversal, directory symlink/junction, and record symlink fixtures cannot cause reads, writes, or deletion of external evidence.

## 2. Restart and retained-release compatibility

- [x] 2.1 Ensure new restart seals capture canonical certification evidence after publication; update path-based fixtures and verify unchanged canonical restart requires only bounded metadata evidence reads.
- [x] 2.2 Preserve legacy certification metadata and old sealed paths throughout migration; verify no-live-supervisor legacy restart, retained older-runtime rollback, and concurrent old/new cohorts remain valid without relocation-induced payload verification.
- [x] 2.3 Derive legacy-path protection from retained release metadata, live cohorts, and active transactions within existing bounded cleanup coordination; verify explicit legacy references and uncertain older consumers preserve their records while canonical-only consumers do not indefinitely pin obsolete duplicates.

## 3. Dual-layout cleanup

- [x] 3.1 Extend safe dependency-layer deletion and orphan discovery to both record layouts; verify obsolete records are removed after layer deletion, an absent dedicated directory is tolerated, and protected records survive.
- [x] 3.2 Remove migrated legacy duplicates once canonical evidence is valid and no protected consumer needs the old path; verify a still-retained shared layer can shed its obsolete root-level copy after the final legacy consumer retires.
- [x] 3.3 Preserve bounded scheduling, transient-failure retries, and ownership-safe matching; verify Windows read-only/sharing failures, interrupted cleanup, unknown entries, symbolic links, and external directories do not block startup or trigger unrelated deletion.

## 4. Integration and acceptance

- [ ] 4.1 Add isolated upgrade-to-canonical, restart, rollback, and eventual-cleanup integration coverage; verify CI exercises the transition on Windows and POSIX without changing layer IDs, certification schemas, or payload paths.
- [ ] 4.2 Deliver the implementation PR citing this accepted change with required CI results and exact focused manual validation commands; verify the handoff demonstrates canonical file placement and explains temporary protected legacy copies.
- [ ] 4.3 Record maintainer acceptance of migration, restart/rollback, and cleanup behavior after manual validation; verify the acceptance record exists before implementation merge authorization and completed-change archival.
