# Implementation evidence

## Delivered behavior

- Attachment validation separates a definitively invalid checkout (missing directory, missing Git pointer, not a worktree root, replaced identity, all with a verified startup checkout) from uncertain failures. Only the definitive case releases the session's own association and claim.
- The runtime registry releases such an attachment whether a tool call or footer polling discovers it, fails the agent's next built-in tool call once with `worktree-attachment-invalid`, and then resolves tools and repository discovery from the startup checkout.
- `a1 worktree complete [--change <id>] [--pr <number>]` checks ownership, Git lock, and uncommitted or untracked content, detaches, and records one pending request. The shell tool wrapper settles it in the A1 process after the shell exits and appends the outcome to that command's result.
- The cleanup command comes from the repository's committed `.a1/worktree.json` as read from the primary checkout, runs without a shell from the startup checkout, and its report is relayed as authoritative. Missing configuration or selectors, a competing live claim, an unverifiable claim, and an expired request retain the checkout with a named outcome.
- The shared cleanup preflight behind `complete`, sweep, and the queue blocks a checkout whose A1 claim names a live process (`attached-session`) or cannot be read (`attached-session-unverifiable`).
- `AGENTS.md`, the worktree feature and protocol documents, the cleanup and delivery runbooks, the delivery skill, the diagnostics table, and the bash tool guideline describe the completion lifecycle.

## Windows lock finding

Measured on Windows 11 with Git for Windows: a process started through `Git\bin\bash.exe` with a directory as its working directory blocks `rmdir` of that directory with `EBUSY` for its whole life, including after `cd /` and after starting a child that changes directory. `Git\usr\bin\bash.exe` started the same way does not. Pi resolves its shell to `Git\bin\bash.exe` and A1 starts it in the attached checkout, so cleanup issued from an attached session pins its own target. This reproduces the `residual-locked` shape of the #914 incident from the issuing shell alone. Whether an editor, indexer, or development process also held the #910 and #914 directories was not investigated.

## Focused local validation

- Lifecycle: `session-attachment-recovery` (5), `session-worktree-completion` (6, including a real directory-handle case that runs only on Windows), and the existing `session-repository-context` suite.
- Composition through the real SDK tool entry path: `session-worktree-recovery` (3), `session-worktree-tools`, `session-runtime-registry` (one added case), `session-runtime-wiring`.
- CLI: `dispatch` grammar and help, `session-context` output.
- Repository tooling: `local-cleanup-attachment.node.mjs` (3), `local-cleanup-preflight` (one added case), and the full `local-cleanup` node bridge with the guard active.
- Governance: guidance regression, architecture, code documentation, naming, product identity, project structure, validation-suite policy, and startup graph policy after moving its byte ratchet to the measured total.
- `npm run typecheck` and strict validation of `guard-worktree-completion` passed.

All of the above ran on Windows. The Windows-only case is skipped, not claimed, elsewhere.

## Known-gap disposition

- Delivery evidence is judged by the repository cleanup command after detach; an unmerged task that runs completion ends detached with its files intact. Accepted for this change.
- The attached-session guard covers `complete`, sweep, and the queue. Explicit `discard` and `retire-redundant` do not apply it. Accepted; both need a separate confirmation and are not the post-merge path.
- The real `a1` executable was not driven through a real Git Bash tool shell in an automated test: the composition fixture issues the same request the CLI issues and then runs the real bash tool. No interactive session demonstration was performed.
- If the startup checkout itself is missing, no automatic choice is made; Pi's existing missing-session-directory prompt remains the recovery surface.
- A repository without `.a1/worktree.json` gets detach only and `cleanup-unavailable`; this repository now commits the file. The first list element must be a real executable.
- The existing #910 and #914 remnants were not touched and remain for the repository's guarded sweep.
- XR Build's guidance is a separate delivery in its own repository and is not part of this change.
