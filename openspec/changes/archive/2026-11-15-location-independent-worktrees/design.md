## Context

Vanilla Pi 1.5.2 accepts an explicit cwd at session creation and exposes runtime session replacement with a cwd override. It does not provide Git worktree attachment. Its project resources, settings, extension context, and tool defaults are cwd-bound. Replacing a session during an executing tool would abort that tool and can deadlock if replacement waits for its own execution to finish.

## Decisions

1. Separate immutable session startup directory, selected repository identity (canonical primary root/common Git directory), and selected task worktree identity. Explicit absolute attachment paths select their own repository; enter/list accept an explicit repository and otherwise use the active repository or startup discovery.
2. Expose a structured, sequential worktree control tool that never resolves ordinary tool cwd before dispatch. Retain the argument-free detach compatibility tool and command aliases. Bind every request to the exact session/runtime; never accept another session identity from tool arguments.
3. Coordinate CLI requests and structured-tool transitions through the runtime. Prepare target trust and cwd-bound services before publishing a successful switch. Finish active shell/tool execution before replacing the Pi session, preserve the persisted conversation/session ID, and rebind host subscriptions. Do not mutate Pi-private fields or process-global cwd.
4. Failed target validation, uncertain ownership, denied/cancelled transition, or resource preparation must retain the old effective context and attachment. No ordinary tool may run against a new attachment while old project resources remain active. Serialized transitions must not overwrite a later session or attachment generation.
5. Detach restores startup resources as well as tool cwd, without needing a valid old checkout. Completion records the selected repository's primary checkout independently from the startup destination and runs cleanup there only after the issuing shell exits. Completion refuses when startup lies inside the removable checkout, since deleting that fallback would make later tools unusable.
6. Project trust remains explicit and fail-closed. Load target project resources only after trust resolution; do not inherit another project's session-only trust decision. Maintain explicit invocation tool exclusions and extension precedence.

## Delivered outcome

One implementation outcome spans the lifecycle protocol, public control surfaces, supported Pi project-context transitions, documentation, and focused tests. Keeping it atomic avoids delivering a temporarily unsafe cross-repository attach without resource reloads.

## Focused validation

Use typecheck, strict validation of this OpenSpec change, and named tests covering CLI parsing, lifecycle target identity/claims/completion, composition recovery, Pi worktree tools, and runtime recreation. Add cases for home-directory startup, cross-repository attach, active-run transition boundaries, retained conversation/writer ownership, trust denial/cancellation, resource failures, stale generations, and invalid-checkout detach. No broad test tier is required locally.

## Known gaps

Full project transitions use the documented Pi terminating-tool/idle-host pattern, not private-field mutation. Target trust refusal retains the old context. If recreation fails after teardown, the old context is recreated with its own prior trust decision; if that restoration also fails, ordinary work stays blocked and explicit controls remain available. Completion whose startup is inside the removable checkout is intentionally refused rather than deleting the fallback directory. Queued user input and bash messages deliberately block replacement until consumed so Pi's in-memory text/image queues are not lost. No unresolved implementation gap is identified.

## Implementation notes

The dependency-free worktree control request/outcome contract belongs to agent-engine contracts and is consumed by lifecycle and the Pi adapter. Lifecycle gains only that contract dependency. Per-session factory and trust-aware service preparation are separated from runtime lifetime/writer ownership; optional worktree coordination remains lazy. Existing architecture, cycle, function-size, and eager-startup budgets are unchanged.

## Local validation

- Typecheck, architecture boundaries, writer guard, product identity boundaries, and the pinned Pi source ledger passed during implementation.
- Strict OpenSpec validation passed.
- The initial focused command/tool/queue/project-context/guidance run passed 196 tests, including a real offline agent tool-result/idle-host transition and automatic continuation.
- Follow-up checks caught and fixed a TypeScript compiler self-inference error, missing archive schema metadata, and a mismatched identity in the provisional-claim regression. The actual managed build and both typecheck configurations passed after repair.
- A larger named-test run exceeded the local Windows time budget and is not a passing result. Isolated queued-input, stale-request, claim-retention, semantic-revision, and primary/locked/busy safeguards passed after repair. Repository inventory is reused and non-host mutations retain a single-gate fast path without changing ownership checks or test budgets.
