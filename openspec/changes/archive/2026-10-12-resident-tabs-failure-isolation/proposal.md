# Proposal

## Why

Milestone 2 runs one A1 tab under a resident host that survives terminal closure. One tab cannot show that failures stay contained. The design in `docs/architecture/resident-tabs.md` claims more: one tab's crash or hang never touches another tab, a server crash loses no tab, a slow terminal stalls nothing, and no session ever gets two writers. The v2 prototype broke every one of these claims (Decision 16). This milestone proves them with two or more tabs before any tab UX is built on top. Session exclusivity must also hold for every A1 launch mode, not only for resident tabs, because direct `a1`, `a1 --session`, and `a1 pi` can select a session that a tab is writing.

This is milestone 3 of 6. Milestones 1 (`resident-tabs-contracts`, #586) and 2 (`resident-tabs-persistent-tab`) must be merged first. Everything resident stays behind `residentTabs=false`. The session-writer guard is the one exception: it applies to every launch mode whatever the setting is, and it only refuses conflicting writers.

## What Changes

- The server holds two or more tabs, each under its own holder. A hidden internal route creates, lists, views, and closes extra tabs for tests and manual evidence. The tab strip and its commands come in milestone 5.
- Each client connection gets a bounded reliable control lane and a single-slot render lane. A client that falls behind gets a full-surface resync when it drains. Surface patches flow only for tabs that a client views.
- A crashed or hung server is replaced under the writer lease. The replacement verifies and terminates the previous owner, increments the durable epoch, and re-admits surviving holders with derived credentials. Holders and bridges reject stale epochs. More than 3 starts in 60 s stop the cycle and show a stopped state.
- The server and holder state machines become sans-IO cores. Spawn, PTY creation, identity checks, fsync, and termination run on workers with deadlines. Each role has its own watchdog. The server supervises holders with 5 s heartbeats and declares a holder hung after 3 misses.
- Reconciliation is level-triggered and incarnation-aware, with at most one start in flight per tab.
- PTY flow control: a dedicated reader and writer per holder, a bounded input queue, a capacity reservation for a whole paste, visible rejection, and uncertain-delivery reports.
- The milestone-1 session-writer lock is wired into every A1 session-writing route: bare `a1` direct, the resident tab child, `a1 pi`, `a1 --session`, and every in-runtime switch (new, resume, fork, import, picker rename).
- `tabsMaxConcurrentStarts` (default 2) limits concurrent starts. Stops are graceful first and forced only after a deadline.
- Deterministic simulation, crash-point tests, and per-platform fixtures prove all of this on Windows x64, macOS, and Linux.

## Capabilities

### New Capabilities

- `resident-tab-reliability`: failure-domain isolation, crash-only roles, non-blocking control loops, role watchdogs and holder heartbeat supervision, PTY flow control, reconciliation, fencing, OS-enforced session exclusivity, and bounded concurrent starts.

### Modified Capabilities

- `resident-terminal-host`: adds slow-client isolation and self-healing server replacement. Milestone 1 created this capability; these are new requirements, and no milestone-1 or milestone-2 requirement changes.
- `launch-profiles`: interactive launch forms in either profile share the native session-writer guard for the same canonical session file, regardless of `residentTabs`, without starting any resident infrastructure.

## Impact

- `native/terminal-host`: the server, holder, and attach roles from milestone 2 gain lane scheduling, sans-IO cores, a worker pool with deadlines, watchdogs, replacement and re-admission, PTY flow control, a deterministic simulator, fault-injection hooks (test builds only), and per-platform fixtures.
- Node: a new `src/foundation/session-writer-lock/` binding is used by `src/integrations/pi/engine/runtime-integration.ts`, `adapter.ts`, `workflow-runner.ts`, and `workflow-contexts.ts`. A conflicting selection is refused or offered as an explicit fork. It is never silently attached or overwritten.
- Settings: `tabsMaxConcurrentStarts` is added to `src/ui/settings/declarations.ts`.
- CI: new native test suites run on the three-platform matrix from milestone 1. A governance check rejects session-writer construction that bypasses the guard.
- User-visible change with `residentTabs=false`: only the session-writer conflict refusal. Today, two writers can append to one session file silently.
