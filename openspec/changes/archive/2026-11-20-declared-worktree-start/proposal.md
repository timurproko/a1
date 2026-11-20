# Proposal

## Why

`a1 worktree enter` always creates the task checkout itself as `.worktrees/<name>`, so a repository cannot choose how its task checkouts are made. Repositories that use a pooled checkout (a reused, pre-warmed slot outside the repository) cannot be entered at all: a task branch checked out anywhere else is rejected as a collision. A repository already tells A1 how to remove a task checkout through its declared cleanup command; it needs the same say over how one is created, without A1 knowing which tool does it.

## What Changes

- A repository may declare a `start` command in `.a1/worktree.json`, next to its `cleanup` command. `a1 worktree enter` runs it and attaches to the checkout the command reports.
- With a declared `start` command, a task branch that is already checked out in another registered worktree of the same repository is resumed there, wherever it lies, instead of being refused as a collision.
- The declared command runs only for a repository the person already trusts, from the repository's committed declaration in its primary checkout, without a shell.
- A repository that declares no `start` command is entered exactly as today: A1 creates `.worktrees/<name>` itself and applies the same collision rules.
- This repository declares a `start` command, so its own task checkouts come from the shared delivery workflow.

## Capabilities

### New Capabilities

- `worktree-entry`: how `a1 worktree enter` obtains the checkout of a task branch, including the repository-declared start command, what A1 accepts as that command's result, and the fallback when nothing is declared.

### Modified Capabilities

None. No existing spec covers worktree entry.

## Impact

- Code: `src/foundation/lifecycle/session-worktree-entry.ts` (entry), the declaration reader in `src/foundation/lifecycle/session-worktree-completion.ts` (shared with cleanup), and the owner runtime that supplies the trust answer for the selected repository (`src/integrations/pi/engine/worktree-transitions.ts` and its preflight).
- Configuration: `.a1/worktree.json` gains an optional `start` array; existing files with only `cleanup` keep working unchanged.
- Docs: `docs/features/worktrees.md` (the declaration, the result contract, the trust rule) and `docs/worktree-link-recovery.md` (new refusal codes).
- Behaviour for existing users: none unless their repository adds a `start` declaration.
- Dependencies: none added. A1 does not learn about any particular checkout tool.
