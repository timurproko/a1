# Design

## Three modules, not one

The plan named one `PiWorkflows` class. The cluster splits naturally into what runs a workflow (admission, the command switch, authentication completion) and what the owned dialogs read before one runs (selector contexts and option lists), and the two have different port needs: the contexts read the session, runtime, cwd, and active model and publish a view after committing a selection; the runner additionally needs the generation, the interaction host, admission state, running-command accounting, model and thinking-level writes, reconciliation, extension rebinding, pinned-setting application, snapshot, and disposal. Keeping them apart keeps each port list honest and keeps the contexts under 350 lines. The pure helpers go to a third module so neither class file carries 380 lines of wording and matching code.

## Ports read at call time

Every port is a closure over adapter state evaluated when called, not a value captured at construction: the session and runtime change on bind, `cwd` changes on a resumed session with a fallback directory, the interaction host is swapped when the shell binds, and the active model is written by both sides. The two collaborators are constructed in the adapter constructor before any session exists, which is safe for the same reason.

## Admission stays split across the boundary

The adapter's `execute` and the runner's `executeWorkflow` share one budget of 32 admitted operations. The runner asks `pendingCommandCount()` and adds its own pending set; the adapter asks `workflows.pendingCount` and adds its own map. `admissionStopped()` folds the adapter's overload, stopped-admission, and disposed flags into one port, matching the guard `executeWorkflow` had inline. `beginRunning`/`endRunning` keep the adapter's `#runningCommands` counter authoritative because the overload reconciliation reads it.

## Cancellation semantics are preserved by name

`dispose` used to cancel every pending workflow except `/quit`, and the overload path cancelled all of them. `cancelPending(except?)` carries both, and the runner keeps the same pending-entry shape (`command`, `cancel`) so `/quit` still reports its own completion.

## Verbatim move

Method bodies move without edits beyond renaming the collaborators above, reading the interaction host once per publish instead of twice, and replacing the literal `32` with a named constant. `#sessionOptions`, which nothing called, is not moved. The adapter keeps its private `#requireWorkflowSession` because the settings port and the extension readers still use it; each collaborator has its own three-line equivalent.
