# Design

## Context

See proposal.md for the motivation.

Observed in the code today:

- `enterSessionRepositoryWorktree` (`session-worktree-entry.ts`) validates the branch name, resolves the base (explicit `--base`, then `git config a1.worktreeBase`, then the default branch of `origin`, then the primary branch of a repository without `origin`), fetches that base and runs `git worktree add`. A branch that is checked out anywhere other than `.worktrees/<name>` is refused with `worktree-branch-collision`.
- It deliberately executes nothing from the repository ("never execute repository setup"), disables Git hooks and scrubs Git environment overrides.
- Completion already runs a repository command: `settleSessionWorktreeCompletion` reads `cleanup` from `.a1/worktree.json` of the verified primary checkout, validates it as an array of bounded strings, substitutes placeholders and runs it without a shell with a five-minute limit. The first element must be a real executable, not a `.cmd` shim.
- Attaching to an arbitrary registered worktree is already supported and safe: `setSessionRepositoryContext` is what `a1 worktree attach <path>` uses.
- For `enter`, the owner runtime resolves trust of the target only after the checkout exists (`worktree-transitions.ts`); an untrusted target keeps the previous context.

## Goals / Non-Goals

**Goals:**

- A repository decides how a task checkout is made, through one declared command, the same way it decides cleanup.
- A1 stays ignorant of the tool behind that command.
- A repository without a declaration behaves exactly as before.

**Non-Goals:**

- No built-in knowledge of any pooling tool, and no setting in A1 to choose one.
- No change to `attach`, `detach`, `status`, `list` or `complete`.
- No change to how the declared cleanup command works.

## Decisions

### One declaration file, one reader

`start` sits next to `cleanup` in `.a1/worktree.json` and is validated by the same rule (a non-empty array of at most 64 non-empty strings, each bounded, no NUL). The reader in the completion module is extracted so both commands share it and return the same three answers: absent, invalid, usable.

Alternative considered: a separate file or a Git config key. Rejected: the repository already has one committed place where it tells A1 which commands to run, and a Git config key is per machine, not per repository.

### A1 resolves the base name, the command fetches

A1 keeps its existing base selection and passes the resulting branch name as `{base}`. It no longer fetches when a command is declared; the command owns how the checkout is cut. This keeps `--base` and `a1.worktreeBase` meaningful without A1 doing work the command will repeat.

Alternative considered: pass `{base}` only when the person named one. Rejected: a declaration would then need two shapes, and the cleanup precedent treats a missing placeholder as an error.

### The result is a path, checked against Git

The command prints the checkout's absolute path as the last non-empty line of standard output. A1 then re-reads the repository's worktrees and accepts the path only if it is a registered, non-primary worktree with the requested branch checked out. Everything after that is the existing attach path.

Alternative considered: have A1 discover the checkout by looking for the branch after the command exits, ignoring its output. Rejected: an explicit answer makes a wrong or empty result a clear refusal instead of a silent mismatch, and costs the command one line.

### A branch that already has a checkout is attached without running anything

When a `start` command is declared and the branch is already checked out in a registered worktree, A1 attaches there directly. The collision refusal for "checked out at another path" applies only when nothing is declared.

Alternative considered: always run the command and let it report the existing checkout. Rejected: resuming is the common case and needs no execution.

### Trust comes first

Running a repository's command before the person has trusted that repository would widen what `enter` can do today. So the owner runtime supplies entry with the trust answer for the selected repository's primary checkout, and entry refuses with `worktree-start-untrusted` before reading or running the command when the answer is not "trusted". The person trusts the repository the ordinary way (a session started or attached there) and enters again.

Alternative considered: resolve trust interactively as part of `enter`. Rejected for this change: trust prompts are tied to runtime replacement, which happens after the checkout exists, and reordering that is a larger change than this one needs.

### An unusable declaration stops entry

A present but invalid `start` entry, or one with an unknown placeholder, is refused with `worktree-start-declaration`. Falling back to the built-in checkout would silently do something the repository said it does not want.

### Same execution rules as cleanup

No shell, working directory is the primary checkout, the scrubbed Git environment, bounded output, and a five-minute limit (a pooled checkout may fetch and prepare). The 15-second limit of the built-in Git calls is too short for that.

## Risks / Trade-offs

- [A declared command can do anything the person's account can] → It runs only for a trusted repository, from the committed file of the primary checkout, never from a task checkout; this is the same trust the declared cleanup command already has.
- [The trust answer for a repository other than the session's own has to be available before the runtime is replaced] → I have read where the runtime resolves trust for a target after entry, not the preflight itself. Task 2.1 confirms a pre-entry answer is available there; if it is not, the change stops and returns for a decision rather than running the command untrusted.
- [The command reports a checkout A1 then fails to attach, for example a refused claim] → The checkout stays where the command made it and is entered again later; A1 deletes nothing, as today.
- [A slow command holds the entry for minutes] → Bounded by the limit and by cancellation through the existing abort signal.
- [On Windows the declared command cannot be a `.cmd` shim] → Same rule as cleanup; the docs repeat it and this repository's own declaration uses `node`.

## Migration Plan

Nothing to migrate: the `start` entry is optional and absent everywhere today. Rolling back is removing the entry from a repository's `.a1/worktree.json`, after which entry is the built-in one again. Checkouts made by a declared command remain ordinary registered worktrees and stay attachable with `a1 worktree attach`.
