## Context

Release run `36324893276` built one installer tarball for `0.2.1-dev.591`. Its Windows Node 24 lane passed exact-package validation, while Linux Node 24 job `108636214969` and macOS Node 24 job `108636215022` both failed at `scripts/release/validate-installer-package.mjs:49` with `installer executable help contract is invalid`.

The validator installs the same tarball into an isolated global prefix and invokes the generated launcher with `--help`. Windows npm creates a command shim that launches the package file directly. Unix npm creates `<prefix>/bin/a1-install` as a symlink to the package executable. The installer currently runs `main()` only when `pathToFileURL(resolve(process.argv[1])).href === import.meta.url`; lexical resolution leaves the Unix symlink path different from the package file URL, so the process exits zero with empty stdout. The exact expected help is therefore absent.

No package was published: validation failed before the publish job, and the npm registry returned `404` for `@timurproko/a1-install` during investigation. The failed artifact is not eligible for manual bootstrap publication.

## Goals / Non-Goals

**Goals:**

- Execute the installer through npm's generated Unix bin symlink and existing Windows shim.
- Keep importing the ESM module side-effect free.
- Cover launcher indirection before publication rather than relying only on a live release lane.
- Preserve the exact help/output contract and existing exact-tarball platform gate.

**Non-Goals:**

- No installer behavior, output wording, target resolution, activation, or package layout redesign.
- No relaxation, skip, retry, or platform exclusion in release validation.
- No local publication, placeholder npm version, token bootstrap, or publication of the rejected `.591` artifact.
- No generalized executable-discovery abstraction outside this installer.

## Decisions

### 1. Compare canonical executable identities

Determine direct invocation by canonicalizing both the argv entry path and the current module file path through `realpath`, then compare those filesystem identities. This follows npm's Unix symlink to `package/bin/a1-install.js`, while direct source/package execution and the path supplied by Windows' generated shim continue to identify the same file.

If canonicalization fails, retain only the existing lexical direct-file comparison as a bounded fallback. A missing argv entry remains an import/non-entry case. Do not infer direct execution from the basename `a1-install`, package location, environment variables, or command-line options; those signals can produce false positives during import.

The helper remains local to the dependency-free executable and uses only already supported Node built-ins. Synchronous canonicalization is limited to this one-time entrypoint decision before installer work begins and avoids adding another asynchronous module-evaluation boundary.

### 2. Preserve inert imports as an independent assertion

Existing tests import installer functions. Add an explicit regression that proves importing the module does not print help, start installation, or alter the process verdict. This remains separate from launcher execution evidence so a change cannot make the symlink case pass by running `main()` on every import.

### 3. Exercise package-manager-shaped launcher indirection

Add focused process-level coverage using a disposable directory and a symlink whose target is the installer executable. Invoke that link with `--help` and assert status `0`, exact stdout, and empty stderr. Run the symlink case where file symlinks are supported; on Windows, retain the existing exact package validator's real npm-generated `.cmd` coverage rather than substituting a directory junction or requiring developer-mode symlink privileges.

The regression must fail against the current unresolved lexical comparison. It must not mock `process.argv`, duplicate production entrypoint logic as its oracle, contact npm, or mutate user/global state.

### 4. Keep release validation authoritative

Do not change the strict comparison in `validate-installer-package.mjs`. Focused tests prevent recurrence cheaply, while the release workflow still installs and invokes the exact packed bytes on Windows, Linux, and macOS. Implementation evidence must include the focused regression and required PR CI; after merge, a newly numbered `npm run develop` run must pass all native validation lanes before bootstrap publication proceeds.

The failed `.591` tarball remains immutable and unpublished. Rerunning its unchanged validation or manually publishing it cannot satisfy this change.

## Validation Matrix

| Layer | Evidence |
| --- | --- |
| Entry identity | Direct package-file invocation and Unix symlink invocation both run `main()` |
| Import safety | Importing exported helpers emits no output and performs no installation |
| Help contract | Launcher `--help` returns status `0`, exact expected stdout, and empty stderr |
| Package | Existing exact tarball installs globally and exposes one executable with valid mode |
| Native lanes | Windows npm shim plus Linux/macOS npm symlink validation pass for the same new candidate bytes |
| Negative control | The new symlink process regression fails against the pre-fix lexical entry comparison |

## Risks / Trade-offs

- **Canonicalization can fail because the entry disappeared or is inaccessible.** Fall back only to the current direct-path comparison; do not broaden execution heuristics.
- **Windows file-symlink creation may require privileges.** Keep process-level symlink coverage native to Unix and retain the real npm-generated Windows shim in exact-package validation.
- **Fixing execution could accidentally trigger installation on import.** Preserve and independently assert inert module imports.
- **A focused source test could differ from packed bytes.** Keep the exact packed-package validator and all native release lanes mandatory.

## Migration Plan

1. After explicit plan approval and implementation request, continue in this worktree, branch, and draft PR.
2. Add failing launcher-indirection/import-safety regression coverage, then implement canonical direct-entry detection.
3. Record focused validation and complete all substantive tasks; add final acceptance scenarios and mark the same PR ready for trusted finalization and required CI.
4. After authorized manual merge, run `npm run develop` from current `develop` to produce a new numbered candidate. Bootstrap npm only from a candidate whose Windows, Linux, and macOS exact-package lanes all pass.

No persisted-data or npm-package migration is required. Rollback restores the prior entrypoint check in a later corrective version; it must not publish the known-broken candidate.
