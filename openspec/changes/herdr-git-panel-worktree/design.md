## Current behavior

`PiWorktreeTransitions` replaces loaded project resources and the effective backend cwd without process-global chdir. `ReadySessionBinding` already fences the native Herdr reporter behind endpoint publication for the current binding. `createHerdrReporter` writes `a1.session`, `a1.runtime` and `a1.at` through the supported local Core CLI with coalescing, heartbeat and ownership fencing.

The private Git panel's `location.js` delegates to shared `ui/directory.js`. That helper prefers a non-shell foreground process cwd before shell reports, focused/pane cwd and terminal cwd. Node can therefore remain at the startup home directory even though A1 tools and its footer use the attached worktree. Reading Git from that directory fails before PR lookup begins.

## Decision

Add `a1.cwd` to the existing native reporter snapshot, sourcing it from the current backend's active project identity rather than `process.cwd()`, a transcript/footer parser, a pending request or the session-history storage directory. Keep publication endpoint-ready and recheck binding/ownership after asynchronous Core reads. Publish directory and identity together; heartbeat and successful context replacement refresh that snapshot. Preserve bounded literal-argv execution and existing failure behavior.

Keep ownership comparisons compatible with prior identity-only publications. Missing directory data must not prevent ordinary session identity publication or permit adoption of another runtime's labels. Shutdown clears directory metadata only while the reporter still owns the exact publication; delayed old reporters cannot clear a newer one.

In canonical Herdr source, validate the native session/runtime identity, timestamp and absolute directory before admitting an A1 override. Prefer that fresh report for the exact terminal ahead of foreground and shell cwd. Keep all existing non-A1 behavior and machine-qualified routing. Use one shared directory contract for Git and other existing consumers, not a Git-only hardcoded repository or second directory database. Existing Git request fencing must discard responses from the previously selected folder or terminal.

Directory reports are display/routing hints, not permission to control a session. Keep native reporting independent of optional color/name plugin switches. Do not persist runtime identities or cwd into portable preferences. Reject malformed/control-bearing paths and stale or implausibly future reports; preserve supported Windows, UNC and POSIX absolute paths, spaces and Unicode.

## Outcomes and ownership

1. A1 reports the active committed project directory through its existing fenced native reporter, with focused reporter/readiness regression fixtures and documented label contract.
2. The separately owned Herdr customization resolves Git against that fresh directory and safely falls back otherwise, with disposable fixtures for directory priority, machine routing, context changes and stale Git responses.

Canonical consumer source is `C:/Users/tprokopiev/.config/herdr-app/customizations/`. Its instructions require supported mod-layer source edits, packaging through `customization.json`, focused and required Custom checks, and conflict-safe build/deploy tooling. Do not relocate that source into this worktree, edit generated outputs, patch native binaries, restart agents or inject input. Record its actual yadm source revision/diff and deployment status separately in implementation evidence.

## Validation and rollout

A1 fixtures cover launch from nonrepository home, successful attach/switch/detach/complete, queued and failed transitions, endpoint readiness, replacement during an in-flight report, heartbeat, owned cleanup, foreign-label preservation and malformed paths. Run only focused tests, typecheck and strict OpenSpec validation locally.

Consumer fixtures cover fresh complete A1 reports beating stale foreground cwd; incomplete, expired, future and invalid reports falling back; independent local/remote terminals; switching between agents; Git result invalidation when cwd changes; unchanged ordinary shell/Claude directory resolution; and existing PR selection in the resolved worktree. Follow the external project's required build/test/host checks without real-session mutation tests. Report real UI inspection separately from fixture success.

A1 source implementation, version publication, consumer source/build and consumer deployment are distinct facts. Do not claim existing agents gain reporting without running a supporting A1 version. No implementation or deployed output changes exist at planning time.
