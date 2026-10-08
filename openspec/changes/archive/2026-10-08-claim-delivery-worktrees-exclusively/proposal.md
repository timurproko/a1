## Why

A delivery session can see an existing worktree whose branch or planning resembles the new request and continue there without knowing that another live A1 session is already using it. The current `a1 session link-worktree` association is session-scoped presentation metadata, so two live sessions can link the same checkout and concurrently edit one worktree. Guidance says not to adopt another session's work, but there is no authoritative live-owner check that an agent can run before making that decision.

## What Changes

- Give every running bare-A1 session a process-bound, fail-closed worktree claim distinct from Git state and cleanup ownership.
- Add a read-only `a1 session worktrees` preflight that reports same-repository worktrees as current, busy in another live session, available, or unverifiable without exposing prompts or session contents.
- Make `a1 session link-worktree <absolute-worktree>` atomically acquire or transfer the current runtime's claim before changing its durable repository-context association, and reject a target claimed by another live runtime.
- Release the live claim on unlink, successful stream switch, and clean session disposal; permit takeover only after the prior runtime is absent under verified process identity, never from elapsed time alone.
- Update delivery policy so every session checks worktree claims before selecting an existing checkout, never works in a busy or unverifiable checkout, and may reuse an available checkout only when its branch, change, and pull request actually match the intended stream and the atomic link succeeds.
- Preserve fresh-worktree delivery as the safe fallback whenever ownership or stream identity is ambiguous.

The claim does not change tool cwd, lock Git, register cleanup, transfer acceptance or merge authority, infer semantic task ownership, terminate another session, or permit deletion.

## Capabilities

### Modified Capabilities

- `owned-pi-ui-foundation`: Session repository context gains live-runtime exclusivity, worktree inventory, atomic claim transfer, and safe release/recovery behavior.
- `change-delivery-workflow`: Agents must preflight and claim an existing worktree before using it, and must create a separate worktree when another live session owns the candidate or ownership cannot be verified.

## Impact

Implementation is expected to affect the session repository-context store, owned runtime lifecycle integration, session-context CLI, focused lifecycle/CLI tests, delivery guidance, and worktree setup documentation. Existing durable session associations remain readable, but they do not establish a live claim until a running session safely acquires one. The existing local-worktree-cleanup journal and ownership protocol remain separate and unchanged.
