## Context

Vanilla Pi 1.5.2 accepts an explicit cwd at session creation and exposes runtime session replacement with a cwd override. It does not provide Git worktree attachment. Its project resources, settings, extension context, and tool defaults are cwd-bound. Replacing a session during an executing tool would abort that tool and can deadlock if replacement waits for its own execution to finish.

## Decisions

1. Separate immutable session startup directory, selected repository identity (canonical primary root/common Git directory), and selected task worktree identity. Explicit absolute attachment paths select their own repository; enter/list accept an explicit repository and otherwise use the active repository or startup discovery.
2. Expose a structured, sequential worktree control tool that never resolves ordinary tool cwd before dispatch. Retain the argument-free detach compatibility tool and command aliases. Bind every request to the exact session/runtime; never accept another session identity from tool arguments.
3. Coordinate CLI requests and structured-tool transitions through the runtime. Prepare target trust and cwd-bound services before publishing a successful switch. Finish active shell/tool execution before replacing the Pi session, preserve the persisted conversation/session ID, and rebind host subscriptions. Do not mutate Pi-private fields or process-global cwd.
4. Failed target validation, uncertain ownership, denied/cancelled transition, or resource preparation must retain the old effective context and attachment. No ordinary tool may run against a new attachment while old project resources remain active. Serialized transitions must not overwrite a later session or attachment generation.
5. Detach restores startup resources as well as tool cwd, without needing a valid old checkout. Completion records the selected repository's primary checkout independently from the startup destination and runs cleanup there only after the issuing shell exits.
6. Project trust remains explicit and fail-closed. Load target project resources only after trust resolution; do not inherit another project's session-only trust decision. Maintain explicit invocation tool exclusions and extension precedence.

## Delivered outcome

One implementation outcome spans the lifecycle protocol, public control surfaces, supported Pi project-context transitions, documentation, and focused tests. Keeping it atomic avoids delivering a temporarily unsafe cross-repository attach without resource reloads.

## Focused validation

Use typecheck, strict validation of this OpenSpec change, and named tests covering CLI parsing, lifecycle target identity/claims/completion, composition recovery, Pi worktree tools, and runtime recreation. Add cases for home-directory startup, cross-repository attach, active-run transition boundaries, retained conversation/writer ownership, trust denial/cancellation, resource failures, stale generations, and invalid-checkout detach. No broad test tier is required locally.

## Known gaps

None identified during planning. Implementation findings and explicit dispositions must be reconciled before completion.
