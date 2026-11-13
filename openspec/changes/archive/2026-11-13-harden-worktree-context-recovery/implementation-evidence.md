# Implementation evidence

## Delivered behavior

Explicit-root lifecycle Git calls use a cloned environment without checkout/storage/discovery overrides. Parent environment, ordinary Git configuration and authentication remain intact. Non-repository startup enter/attach fails with worktree-startup-not-repository before association or claim mutation; shell cd does not redefine session startup.

A claim-owning bare session exposes a sequential, argument-free worktree_detach tool. Its registry callback verifies the bound live runtime and serializes safe clearing without ordinary Git cwd resolution, including before initial activation. Ordinary tools remain fail-closed. Clearing failures, cancellation, disposal and session replacement do not report successful recovery. Comparison and callback-free sessions omit the tool; exclusions and extension overrides retain precedence. Recovery does not trigger completion cleanup.

## Regression evidence

The new real-Git environment integration file was run before the fix: all six cases failed, including unsupported startup and a foreign target incorrectly being accepted under matching environment overrides. After implementation all six pass.

The separate recovery integration fixture recreates the reported persisted mismatch using only scratch repositories and session storage. It establishes a valid attachment, poisons startup identity, observes ordinary write/bash/absolute-read rejection, then detaches through the real registry and tool. It asserts no earlier write ran, later calls use the original non-repository home, source/history bytes remain unchanged and another runtime's claim is unchanged. Additional cases cover pre-activation and malformed-state recovery. Unit and adapter fixtures cover cancellation, unavailable ownership, stale session/disposal, failed clearing, sequential/argument-free exposure, session replacement, composition restrictions and extension override/tool exclusion.

All fixture storage is isolated; the user's affected association and task worktree were not modified. An initial fixture newline mismatch was resolved by setting core.autocrlf=false in the throwaway repository, keeping exact byte-preservation assertions.

## Focused checks

Windows with Node v24.22.0:

- `npm run build`: passed.
- `npm run typecheck`: passed, including bin checks against the built output.
- `npm run check:architecture`: passed without changing the startup budget or pinned-source baseline. The first run caught eager growth; attachment definitions now load only when the runtime supplies worktree ownership callbacks.
- `npm run check:code-documentation:changed`: passed.
- `npx openspec validate harden-worktree-context-recovery --strict`: passed.
- `git diff --check`: passed.
- One focused Vitest invocation passed 130 tests across these 12 files:
  - test/foundation/lifecycle/session-worktree-environment.integration.test.ts
  - test/foundation/lifecycle/worktree-git-environment.test.ts
  - test/foundation/lifecycle/session-worktree-entry.test.ts
  - test/foundation/lifecycle/session-worktree-completion.test.ts
  - test/foundation/lifecycle/session-repository-context.test.ts
  - test/foundation/lifecycle/session-attachment-recovery.test.ts
  - test/cli/session-context.test.ts
  - test/composition/session-runtime-registry.test.ts
  - test/composition/session-runtime-wiring.test.ts
  - test/composition/session-worktree-recovery.integration.test.ts
  - test/integrations/pi/engine/worktree-tools.test.ts
  - test/integrations/pi/engine/runtime-integration.test.ts

No broad suite, CI watcher, physical terminal automation, live-session metadata repair, merge or release was performed.

## Known-gap disposition

No substantive implementation gaps remain. Interactive end-user acceptance and recovery of the actual older affected session have not been performed and require the new runtime plus an explicit user request. The recovery route intentionally still requires readable matching session identity, an existing startup directory, verifiable live process ownership and usable mutation coordination; it is not an arbitrary damaged-state repair or unvalidated shell bypass. Ordinary Git configuration and credentials remain trusted and preserved; this change isolates repository-redirection environment variables rather than sandboxing Git configuration or custom extensions.
