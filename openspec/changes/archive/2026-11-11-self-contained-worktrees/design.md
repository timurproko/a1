# Design

## Approved scope

The maintainer approved implementation of the presented command contract on 2026-11-11. A1 owns linkage and ordinary recovery. Repository instructions are identical usage guidance, not an additional inventory approval gate. Cleanup and merge permissions are unchanged.

## Commands and boundaries

`worktree enter <branch>` uses the startup repository's primary root, creates `.worktrees/<branch-slug>` from the explicit `--base` or the remote default branch (falling back to the primary branch for local-only repositories), then attaches it. It fetches the selected remote base before creating a new branch. A matching registered branch can be resumed without rejecting its existing edits. Ambiguous paths, foreign repositories, primary checkouts, Git locks, branch/path collisions, or other live owners are never adopted or overwritten. A failed attach preserves the prior association and leaves any newly created checkout available for a safe retry; it never deletes work to roll back. Git serializes branch creation, and the existing atomic claim protocol decides the attachment winner.

`attach` validates and claims one exact registered task worktree. `detach` releases only this runtime's attachment and preserves all Git data. `list` remains informational; success from enter/attach is the complete operation result, not a request for a second inventory sample. Old session commands remain aliases. Commands require the existing authenticated shell-tool runtime rather than inventing a runtime for an arbitrary terminal.

CLI results include the exact canonical root and branch. Bounded retries cover transient registration/coordination failures, not genuine ownership conflicts. Listing obtains a consistent bounded snapshot under the coordination gate instead of converting global contention into unverifiable ownership for every row. It never repairs claim records or takes editing ownership.

## Runtime observation and tool paths

A runtime activates persisted claims once for each session binding, retries initial failures, and subsequently reads verified context without rewriting claims. Healthy runtimes do not periodically rewrite an unchanged registration. Context reads validate the exact live runtime's claim and Git identities. Built-in tool execution resolves the durable attachment at invocation time, so the command's own bash process can finish in its original directory while subsequent tools use the attached root. No process-global chdir, arbitrary absolute-path rewriting, or shell-command rewriting is used. Detached tools return to the session's startup directory. Custom extensions retain their documented cwd behavior and should use the returned explicit root.

## Repository migration

A1 ships the canonical short instruction block. External/non-A1 agents retain ordinary Git support. XR Build keeps independent private provisioning, dependency setup, and protected cleanup separate from worktree linkage. Its instruction migration must not require commands absent from the installed A1: prepare the migration but activate only after the capability is available.

## Validation

Focused Git fixtures cover creation and resume with edits, both main/develop bases, collisions, cross-repository rejection, two contenders, preserved prior context, detach preservation, and pending coordination. Registry tests cover repeated polls without activation writes and recovery after startup failure. Tool tests cover relative paths before/after attach/detach and comparison-mode isolation. CLI tests cover grammar, aliases, authoritative outcomes, and diagnostics.

## Known gaps

Live multi-process installed-command acceptance and XR Build activation require installing the delivered A1 release; source tests do not claim publication. Destructive cleanup, arbitrary external editors, project-specific dependency setup, and custom extension cwd migration are outside this command contract.
