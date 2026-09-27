## Context

Run `36335398692` selected merged source `329522874ace9cb90b7949ecf25b9c3d89ab8a26` and candidate `0.2.1-dev.602`. The publisher succeeded for both package identities through GitHub Actions OIDC and verified their exact registry bytes. The Linux and Windows published-pair jobs then succeeded. The macOS job `108667582781` failed during exact-pair installation with `launcher verification failed`; its evidence upload also failed because the smoke harness had exited before writing its success record. `Publication result` failed and `Complete release records` was skipped as intended.

The isolated smoke prefix is rooted in macOS's temporary directory. macOS exposes `/var` as a lexical alias whose canonical filesystem path is `/private/var`. npm creates the Unix `a1` launcher as a symlink. `verifyLaunchers` canonicalizes that launcher with `realpath` but compares it to the lexical package entry derived from `npm root --global`. Thus a valid launcher target under `/private/var/...` differs textually from the expected `/var/...` entry even though both identify the same file.

## Goals / Non-Goals

**Goals:**

- Accept an npm launcher only when its canonical target is the canonical installed `bin/cli.js` entry.
- Cover lexical parent aliases deterministically without depending on macOS runner state.
- Keep foreign, missing, partial, or malformed launchers fail-closed.
- Prove a new OIDC-published candidate installs and launches through Windows, Linux, and macOS published-pair lanes.

**Non-Goals:**

- No mutation or republish of `.602`.
- No basename, suffix-only, or directory-shape relaxation of launcher ownership.
- No change to command precedence, package/version verification, activation, npm trusted-publisher identity, release matrices, or stable mutation guards.

## Decisions

### 1. Canonicalize both sides of Unix launcher ownership

Resolve the expected installed entry with `realpath` once and compare that canonical path with each symlink launcher's canonical target. Continue using platform-aware normalization after canonicalization. A missing expected entry, unreadable path, or unequal target remains `launcher verification failed`.

Canonicalizing only the launcher is rejected because it reproduces the macOS alias mismatch. Lexical-only comparison is rejected because npm's relative symlink target and filesystem aliases are legitimate indirection. Suffix or basename comparison is rejected because it could accept a foreign package tree.

### 2. Preserve Windows shim validation

Windows npm launchers remain regular command shims validated by bounded content and the authoritative application-package suffix. The canonical-target change applies only to symbolic links and does not alter the complete Windows launcher set.

### 3. Test alias equivalence and foreign ownership

Add a platform-conditional regression that materializes a valid Unix package and launcher beneath a real prefix, accesses them through a symlinked parent alias, and exercises installer verification with the aliased global root. The corrected implementation must accept the canonical identity match. A companion assertion points the launcher to another entry and requires failure, preventing the regression from becoming a broad alias bypass.

### 4. Require another numbered publication

`.602` proves both OIDC publications, exact registry-byte verification, and successful Linux/Windows installation, but not macOS installation or release completion. Its aggregate remains failed. After this correction merges, `npm run develop` must create a new candidate and pass both publications, registry verification, all three published-pair jobs, completion, and the aggregate.

## Validation Matrix

| Layer | Evidence |
| --- | --- |
| Canonical alias | A lexical prefix alias and its resolved package entry are accepted as one launcher identity |
| Foreign ownership | A launcher resolving outside the expected package entry remains rejected |
| Existing contracts | Focused installer orchestration retains silent success, strict ownership, activation, and command-resolution behavior |
| PR | Exact-head selected CI validates implementation, package behavior, governance, and OpenSpec delivery |
| Post-merge | A new candidate publishes through OIDC and passes Windows, Linux, and macOS published-pair installation plus completion/aggregate |

## Risks / Trade-offs

- **Canonicalization performs one additional filesystem lookup.** Launcher verification is already filesystem-bound and runs only during installation, so the cost is negligible.
- **Canonical paths may differ in case or aliases.** Platform-aware normalization remains in place; equality still requires both names to resolve to the same exact target.
- **The regression needs symlink support.** It is platform-conditional like the existing Unix npm-launcher test and runs on Linux/macOS CI, where npm uses this launcher form.
- **Another preview is required.** Only a newly packed installer can prove the fix on the native macOS publication lane without mutating `.602`.

## Migration Plan

1. After explicit plan approval and implementation request, continue in this worktree, branch, and draft PR.
2. Add the focused alias/foreign-target regression and canonicalize the expected Unix entry.
3. Complete implementation evidence, finalization, and exact-head PR validation before authorized manual merge.
4. After merge, publish one newly numbered development candidate and require all publication and native installation gates to succeed.

Rollback uses a later corrective PR and never removes or rewrites published versions.
