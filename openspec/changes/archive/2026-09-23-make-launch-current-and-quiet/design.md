## Context

See `proposal.md` for motivation. Release state currently has one global active reference and one endpoint per immutable cohort. A superseded cohort correctly keeps its existing launch instances and refuses new ones, but bootstrap decides from a previously read state and from the candidate cohort's endpoint. If another invocation changes the active reference, bootstrap can send a new guardian to a cohort that will reject it. A previously approved candidate with a live endpoint is also launched without first restoring that candidate as active, which makes the rejection deterministic rather than transient.

The same state is shared by npm-managed installations under different confirmed prefixes. A command from an older installation can therefore present an older approved candidate after a newer release was activated. Explicit self-update may intentionally select an older numbered preview, but ordinary launch has no rollback authority.

`node:sqlite` is owned by the detached supervisor control store and by the captured prompt-history worker. The terminal-attached guardian currently imports the supervision barrel for path helpers; that barrel also exports the server and pulls the control store into the guardian module graph even though the guardian never opens SQLite. On Node builds that emit the SQLite stability warning, this unnecessary import makes the warning user-visible.

## Goals / Non-Goals

**Goals:**
- Make ordinary launch converge on the newest eligible installed or active release without stopping retained sessions.
- Preserve explicit update/rollback authority, including an intentionally selected older preview.
- Close the selection-to-admission race without printing an expected internal handoff diagnostic.
- Keep the SQLite stability notice off the user terminal while preserving unrelated Node warnings and actionable A1 failures.
- Preserve profile and explicit session selection across any internal retry.

**Non-Goals:**
- Terminate, migrate, or reconnect an already-running UI to a different cohort.
- Delete retained releases, control state, history, or endpoint data as recovery.
- Make separately installed old package trees share mutable files or silently update each other.
- Suppress all Node warnings or weaken supervisor ownership checks.

## Decisions

### 1. Ordinary launch is monotonic; explicit update remains the downgrade authority

Bootstrap will compare the verified installed candidate with the verified active release by semantic package version before changing the active reference. If active is newer, ordinary launch follows active and does not reactivate the older candidate. If the installed candidate is newer, bootstrap certifies and atomically activates it for new launches even while older cohorts are busy. Existing instances remain bound to their original endpoints. Equal-version reuse keeps the currently active verified identity.

An explicit update transaction continues to activate its exact selected target through the update activation path, so `a1 update --develop <older-preview>` remains an intentional downgrade. Once committed, ordinary launches follow that active target unless they are invoked from a genuinely newer installed package.

Alternative: always let the invoked installation become active. Rejected because two npm prefixes can then move the global reference backward and forward indefinitely. Alternative: always retain a busy older cohort for new launches. Rejected because per-cohort endpoints already permit old and new sessions to coexist and the product contract says the next launch uses the successful update.

### 2. Activate the selected cohort before reusing its endpoint

Selection will be based on the global active reference as well as endpoint ownership. A verified live endpoint for the selected newer candidate is reusable only after the active reference names that release. Activation does not request shutdown from another retained cohort; each endpoint remains independently owned. A newer cohort that was temporarily marked superseded can become active again and continue serving its existing instance plus the new launch.

Alternative: wait for the candidate's existing instances to end so its supervisor retires and can be restarted. Rejected because this recreates the manual-close/reboot failure and serves no ownership purpose.

### 3. Supervisor admission revalidates the active reference at command time

The supervisor will not rely solely on its polling cache when a new launch-instance command arrives. Before refusing a previously unseen instance as superseded, it will read the current active reference. It accepts when that fresh value names its release, updates its cached role, and otherwise returns a dedicated machine-readable superseded result. Existing-instance idempotency remains available regardless of a later role change.

Alternative: shorten the polling interval or sleep after activation. Rejected because timing reduces but does not close the race. Alternative: allow every retained cohort to accept new instances. Rejected because it would violate active-release selection.

### 4. One bounded internal reselection handles a concurrent handoff

If admission reports the dedicated superseded result, the guardian exits through a private retry outcome without printing the server's internal release message. Bootstrap rereads durable release state, reselects once, and relaunches with the original profile, working directory, environment, and session-selection arguments. A second supersession or any different error remains a real bounded failure and is reported concisely.

The monotonic rule means supported launchers converge rather than continually invalidate each other; the retry exists for a genuine concurrent activation and for transition from pre-fix retained processes.

Alternative: parse the current diagnostic text. Rejected because user-facing prose is not a protocol. Alternative: retry without a bound. Rejected because persistent state churn must remain diagnosable and startup must not loop.

### 5. Remove SQLite from terminal-attached import graphs instead of muting Node globally

The guardian will import cohort path helpers from their narrow lifecycle owner rather than from the supervision barrel, and startup graph governance will assert that terminal-attached bootstrap/guardian/UI entry paths do not eagerly import the control store or `node:sqlite`. SQLite remains in the detached supervisor and the prompt-history worker, whose output is already captured and whose failures cross typed/sanitized channels. Exact-package startup coverage will assert that a successful interactive launch emits neither the SQLite `ExperimentalWarning` nor release-selection chatter.

This suppresses the SQLite notice at the ownership boundary without `--no-warnings`, `NODE_NO_WARNINGS`, or disabling the entire `ExperimentalWarning` class, so unrelated warnings remain observable.

Alternative: add `--no-warnings` globally. Rejected because it hides actionable runtime and dependency warnings. Alternative: filter warning prose by monkey-patching `process.emitWarning`. Rejected because it changes a global Node API and depends on unstable message text.

## Risks / Trade-offs

- **[A stale pre-fix installation can still move the reference backward once]** → A current launcher reclaims the newer eligible release, command-time admission revalidation closes the local race, and the bounded retry hides the expected transition; retained sessions remain untouched.
- **[Version ordering could conflict with an intentional downgrade]** → Only ordinary bootstrap is monotonic; the explicit update transaction keeps exact-target activation authority.
- **[A warning could reappear through a future broad import]** → Module-graph and exact-package stderr tests make the terminal boundary enforceable.
- **[Concurrent newer candidates race]** → Serialized state mutation plus semantic ordering converges on the newest eligible version, while command-time admission and one retry cover the handoff interval.
- **[The retry could mask another failure]** → Only the dedicated superseded result is silent and retryable; storage, identity, containment, protocol, and startup errors retain existing diagnostics.

## Implementation Evidence

- Source and bin typechecking, build, architecture/product-identity/ledger/terminal-host governance, code-documentation governance, docs governance, naming audit, strict OpenSpec validation, and whitespace validation pass.
- Sixteen focused release, update, guardian, protocol, storage, supervision, and module-boundary files pass 113 tests. Coverage includes older-installation monotonicity, activation while the old cohort remains live, atomic concurrency ordering, typed command-time readmission, one silent retry, and bounded repeated handoff failure.
- Exact-package startup now rejects SQLite and superseded-release stderr before first render. The local exact-package attempt installed the packed candidate successfully but stopped at its pre-existing Windows Defender prerequisite because real-time protection is disabled on this workstation; it did not reach product startup. The required package-startup CI owner runs that assertion on its certified Windows environment.
- No product behavior, migration, privacy, or ownership gaps remain undispositioned.

## Migration Plan

1. Ship the monotonic selection, activation-before-reuse, fresh admission check, private retry outcome, and narrow SQLite import boundary together.
2. Existing release state and retained endpoints need no migration. The first new launch reads them, selects the newest eligible release, and leaves every live older instance unchanged.
3. Rollback restores the prior launcher behavior without transforming state; releases and endpoints remain in their existing formats.
