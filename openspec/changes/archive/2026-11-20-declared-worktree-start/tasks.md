# Tasks

## 1. A declared start command creates the task checkout

- [x] 1.1 Extract the `.a1/worktree.json` reader from the completion module so `cleanup` and `start` share one validation and one absent/invalid/usable answer; verify the existing completion tests still pass unchanged.
- [x] 1.2 In worktree entry, when the primary checkout declares a usable `start` command and the branch has no checkout, run it without a shell from the primary checkout with `{primary}`, `{branch}` and `{base}` substituted, under the cleanup execution rules; verify with an entry test that uses a stand-in command and asserts the arguments it received.
- [x] 1.3 Resolve `{base}` with the existing selection order and skip A1's own fetch when a command is declared; verify with tests for `--base`, `a1.worktreeBase`, the default branch and a repository without `origin`.
- [x] 1.4 Accept the reported path only when it is a registered, non-primary worktree of the repository with the requested branch checked out, then attach through the existing attach path; verify with tests for a checkout outside the repository folder, an unregistered path, a wrong branch, the primary checkout, empty output and a failing command, each asserting that nothing was created or deleted by A1.
- [x] 1.5 Refuse an invalid `start` entry or an unknown placeholder with `worktree-start-declaration` and create nothing; verify with tests for an empty array, a non-string element and `{unknown}`.

## 2. The command runs only for a trusted repository

- [x] 2.1 Confirm in the trust preflight that the owner runtime can answer "is this repository's primary checkout trusted" before entry; if it cannot, stop and report instead of continuing. Verify by naming the function used in the pull request description. Confirmed: `resolvePiProjectTrustPreflight` answers from saved and invocation decisions and, called without a prompt, fails closed.
- [x] 2.2 Pass that answer into entry and refuse with `worktree-start-untrusted` before running the command when the repository is not trusted; verify with a test that the stand-in command never ran and the previous context is kept.

## 3. A task branch is resumed where its checkout is

- [x] 3.1 With a declared `start` command, attach to a registered worktree that already has the branch checked out, wherever it lies, without running the command; verify with a test whose stand-in command fails if called.
- [x] 3.2 Keep the built-in behaviour when nothing is declared, including the collision refusal for a branch checked out outside `.worktrees/`; verify that the existing entry tests pass unchanged and add one for a file that declares only `cleanup`.

## 4. The repository and its docs use it

- [x] 4.1 Declare this repository's `start` command in `.a1/worktree.json` so its task checkouts come from the shared delivery workflow; verify by running worktree entry against a repository that carries this declaration and checking that the attached path is the checkout the command reported.
- [x] 4.2 Document the `start` declaration, its placeholders, the result contract, the trust rule and the new refusal codes in `docs/features/worktrees.md` and `docs/worktree-link-recovery.md`; verify that every code and placeholder named in the specs appears there.
