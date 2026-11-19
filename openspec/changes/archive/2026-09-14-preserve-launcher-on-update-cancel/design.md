## Context

See `proposal.md` for motivation. The current updater launches `npm install --global` as an attached child. npm replaces a global package by temporarily renaming the old package directory and every generated launcher before committing the target. A terminal interrupt is delivered to both A1 and npm, so the process can stop while the canonical `a1`, `a1.cmd`, and `a1.ps1` paths are absent. The update journal and immutable release store remain sound, but neither can recover themselves when the only public command is missing.

The existing immutable prior release is sufficient to launch normal A1 behavior, and the update journal already identifies the prior release, target version, package root, and durable phase. Recovery must not trust npm's randomly named temporary directories, broaden execution to arbitrary paths, or require a second public command. A signal handler in the invoking updater is insufficient because terminal closure or process termination can remove that handler while npm is still mutating files.

## Goals / Non-Goals

**Goals:**

- Make Ctrl+C a coordinated cancellation with a callable-launcher postcondition.
- Survive loss of the invoking updater or terminal during npm replacement.
- Preserve npm diagnostics, exact target selection, immutable release authority, and transaction recovery.
- Restore every launcher form required by the current platform from narrowly bound evidence.
- Keep cancellation recovery independent from interactive supervisors and user sessions.

**Non-Goals:**

- Guarantee recovery across machine power loss or reboot during the launcher write interval.
- Introduce a separately published permanent launcher package.
- Replace npm as the global package installer.
- Promise that launchers remain continuously present during npm's private mutation window; the guarantee begins before cancellation is acknowledged or recovery is declared complete.
- Treat a second interrupt as permission to abandon the launcher postcondition.

## Decisions

### 1. Define an explicit destructive interval and launcher postcondition

The updater will distinguish pre-replacement work, the destructive global-package interval, and post-replacement activation. Before the destructive interval it may honor cancellation immediately. During that interval cancellation becomes a durable request and is not reported complete until a recovery owner proves the canonical launcher set is callable.

The postcondition is platform-specific: Windows requires the shell launcher, `.cmd`, and `.ps1` files; Unix requires the executable launcher. Each launcher must be a regular managed file at the exact canonical npm bin path, match recorded bytes or the completely installed target, and resolve only to the selected target or transaction-scoped recovery entry.

Alternative: consider package-directory existence sufficient. Rejected because the observed failure had a complete target package but no public launcher.

### 2. Delegate npm replacement to a detached recovery guardian

A small packaged recovery entry will be copied to A1-owned transaction storage and started detached before npm begins replacement. The guardian, not the terminal-bound updater, will own the npm child and the final launcher check. The updater communicates cancellation through a durable request and waits for the guardian's authenticated result; loss of the updater does not terminate the guardian.

On ordinary completion the guardian verifies npm's exit status, the installed target identity, and all launchers. On cancellation it requests bounded npm termination, waits for process exit, and establishes either complete target launchers or recovery launchers before recording cancellation. If the updater disappears without a cancellation request, the guardian may safely let npm finish, then records the resulting package and launcher disposition.

The guardian will use the repository's native process identity and bounded cleanup facilities rather than shell commands or unverified PIDs.

Alternative: install a signal handler while retaining the attached npm child. Rejected because terminal closure and process-tree termination can still kill both processes in the unsafe window.

Alternative: always let npm finish after Ctrl+C. Rejected because npm can hang and because cancellation must remain a real bounded request, not merely hidden success.

### 3. Commit a transaction-scoped recovery capsule before mutation

The capsule will contain a self-contained recovery entry and a manifest binding:

- update transaction ID and phase,
- canonical npm global bin and package roots,
- exact package identity and target version,
- prior approved immutable release ID, root, and digest,
- required launcher names and recovery launcher digests,
- guardian process identity and result paths,
- creation and bounded-retention metadata.

The payload is written privately, hashed, and atomically committed before npm starts. Recovery accepts only direct canonical paths within the recorded npm bin root and A1 data root. It never executes npm's hidden rename candidates or derives authority from their random names.

Alternative: copy npm's temporary `.a1-*` files back into place. Rejected because those names are implementation details, are not known before mutation, and do not independently prove package or launcher identity.

### 4. Use recovery launchers as a bounded bridge, not a second product command

If npm does not leave a complete target, the guardian writes canonical launchers that invoke the transaction-scoped recovery entry. For ordinary interactive arguments the entry launches the prior approved immutable release. For a self-update invocation it resumes the exact journaled package transaction. It does not expose another command name or accept a different target.

A recovery launcher is replaced by normal npm-generated target launchers when package installation succeeds. The capsule remains protected while any launcher points to it and becomes collectible only after the transaction is terminal and all canonical launchers resolve elsewhere.

Alternative: restore only the prior npm-generated launcher text. Rejected because it may still point at a package directory npm renamed or partially replaced.

### 5. Serialize recovery and make repeated cancellation idempotent

The update journal gains additive recovery state recording capsule identity, guardian process identity, cancellation request, package outcome, launcher disposition, and completion. The updater, guardian, and later invocations use one lock/compare-and-update boundary so only one process owns npm or writes launchers. A stale recorded PID is insufficient; native start identity and transaction identity must agree.

Repeated Ctrl+C updates the same cancellation request and emits at most one focused diagnostic. It does not kill the guardian or start another recovery path. A later invocation observes the durable disposition and either resumes activation of a complete target or uses the prior immutable release while package recovery continues.

### 6. Preserve existing update semantics outside cancellation

Target resolution, ownership-safe session behavior, npm diagnostics, immutable materialization, certification, warmup, supervisor verification, rollback, and progress remain unchanged after the package boundary. Recovery adds no supervisor or UI startup to the update command. Normal successful updates remove their recovery capsule through bounded maintenance.

## Risks / Trade-offs

- **[Risk] Detached npm or guardian processes outlive the terminal unexpectedly.** → Bind them to one transaction, record native process identity, impose phase deadlines, and retire stale workers through existing bounded cleanup.
- **[Risk] Recovery launcher writes race npm's own launcher creation.** → Only the guardian owns npm and writes recovery launchers after npm has exited; later invocations serialize on the durable recovery disposition.
- **[Risk] A malformed capsule could overwrite arbitrary files.** → Canonicalize the npm global root before mutation, allow only the exact platform launcher names as direct children, bind payload digests, and fail closed on any mismatch.
- **[Risk] Recovery launchers remain after a successful update.** → Verify target launchers after npm success and protect/collect capsules according to actual launcher targets rather than journal intent alone.
- **[Risk] Cancellation takes longer than an immediate process exit.** → Show one concise cancellation/recovery status and bound npm termination plus launcher restoration; correctness takes precedence over returning while the command is missing.
- **[Risk] The immutable prior release cannot handle a future transaction shape.** → Keep the recovery entry self-contained for transaction repair and use the prior release only for ordinary launch behavior.
- **[Risk] Power loss occurs during launcher restoration.** → This change does not claim reboot-safe continuity; all writes are temp-plus-rename to minimize exposure, and a permanent stable launcher remains the future solution for that guarantee.

## Migration Plan

1. Add the recovery manifest and additive transaction fields with readers that tolerate existing journals.
2. Implement recovery payload creation and strict path/identity validation without changing npm execution.
3. Add the detached guardian and launcher postcondition behind exact-package fault tests.
4. Route npm replacement through the guardian and coordinate Ctrl+C through the durable cancellation request.
5. Enable recovery launchers and later-invocation convergence for incomplete package outcomes.
6. Gate publication on Windows and Unix cancellation/process-loss matrices, including the three Windows launcher forms.
7. Retain the existing direct runner as rollback until exact-package evidence proves guardian cleanup and normal updates; remove the fallback only after acceptance.
