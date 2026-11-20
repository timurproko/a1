# Worktree commands

A1 owns worktree creation, attachment, cooperative editing claims, project-context transitions, and ordinary recovery. Startup location is a fallback directory, not repository authority. A session started at home can attach a task checkout in any repository without restarting.

## Control API

Claim-owning A1 sessions expose the sequential `worktree` agent tool. It does not resolve ordinary tool cwd before dispatch, so attach, detach, and status remain callable when the previous checkout is invalid.

| Action | Inputs | Result |
| --- | --- | --- |
| `attach` | Absolute `path` | Select that registered task worktree and its repository. |
| `enter` | `branch`, optional absolute `repo`, `base` | Create or resume a task checkout and select it. |
| `detach` | None | Release this session's attachment and restore its original startup directory. |
| `status` | None | Report startup directory, effective cwd, repository, branch, and attachment health. An invalid context reports no effective cwd. |
| `list` | Optional absolute `repo` | Informational repository inventory; never an attachment approval gate. |
| `complete` | Optional `change`, `pr` | After a verified merge, detach and run repository-declared cleanup. |

For example, an agent can request `{"action":"attach","path":"D:/Git/project/.worktrees/task"}` or `{"action":"enter","repo":"D:/Git/project","branch":"fix/task"}`. Tools cannot select another session or runtime. `worktree_detach` remains an argument-free compatibility/recovery tool and uses the same project-context transition in the normal product runtime.

### Shell commands

Run these through the active A1 session's shell tool:

| Command | Result |
| --- | --- |
| `a1 worktree enter <type/short-description> [--repo <absolute-path>] [--base <branch>]` | Request creation/resumption and attachment. |
| `a1 worktree attach <absolute-path>` | Request attachment to the target repository's task checkout. |
| `a1 worktree detach` | Request detach without deleting files or branches. |
| `a1 worktree status` | Inspect this session's context. |
| `a1 worktree list [--repo <absolute-path>]` | Informational inventory. |
| `a1 worktree complete [--change <id>] [--pr <number>]` | Request guarded completion after a verified merge. |

Shell mutations queue a request; they do not change context while their own process still pins the old directory. The shell's zero exit code means **requested, not attached**. The runtime resolves the request after that tool batch and reports the final outcome separately. Agents wait for that runtime confirmation, not another inventory check. An unrelated terminal lacks the exact shell-tool session identity and cannot operate on this session.

`a1 session link-worktree`, `unlink-worktree`, and `worktrees` remain compatible aliases. They use the same request/confirmation boundary.

## Repository selection and safety

An absolute attachment target intentionally selects its repository, including across repository boundaries. Enter/list use explicit `repo` first, otherwise the active repository, otherwise discovery from the immutable startup directory. When discovery finds no repository, supply a repository path or attach an absolute task checkout; a new session is not required. A later shell `cd` never silently rebinds the session.

Enter creates `.worktrees/<short-description>` under the selected repository's primary checkout. It fetches the selected origin base before creating a new topic branch. Base selection is explicit `base`, local Git configuration `a1.worktreeBase`, then the origin default branch; local-only repositories fall back to the primary branch. Matching worktrees retain their edits and history. Path/branch collisions, primary checkouts, detached branches, Git locks, and live or unverifiable ownership remain blockers. A1 never forces takeover, installs dependencies, or runs checkout hooks. The only repository command it runs at entry is a start command the repository declares, described next.

### A repository-declared start command

A repository can decide how its task checkouts are made, for example from a pool of prepared checkouts, by declaring a `start` command next to its `cleanup` command in the committed `.a1/worktree.json`:

```json
{ "start": ["node", "tools/start-worktree.mjs", "--repo", "{primary}", "--branch", "{branch}", "--base", "{base}"] }
```

When a task branch has no checkout yet, enter runs this command instead of creating `.worktrees/<short-description>`, and attaches to the checkout the command reports. A1 does not know or care which tool is behind it.

- **How it runs.** From the verified primary checkout, without a shell, with `{primary}`, `{branch}` and `{base}` substituted. `{base}` is the base branch name chosen by the selection order above; A1 does not fetch it, the command does. The first element must be a real executable such as `node`, not a `.cmd` shim. The command has five minutes.
- **What it must report.** The checkout's absolute path as the last non-empty line of standard output. A1 attaches only when that path is a registered worktree of the repository, is not the primary checkout, and has the requested branch checked out. Otherwise entry is refused with `worktree-start-invalid`, the session keeps its previous context, and A1 deletes nothing.
- **Trust.** The command runs only for a repository the person already trusts. For any other repository entry is refused with `worktree-start-untrusted` before anything runs; trust the repository the ordinary way (a session started in it) and enter again.
- **Resuming.** A branch that already has a registered checkout is attached where it is, also outside `.worktrees/`, and nothing runs.
- **A broken declaration.** A `start` entry that is not an argument list, or that uses another placeholder, refuses entry with `worktree-start-declaration`. A1 does not fall back to creating the checkout itself.
- **A failing command.** Entry is refused with `worktree-start-failed` and the command's own output; A1 creates no checkout itself.

A repository that declares no `start` command, including one that declares only `cleanup`, is entered as described above.

Authoritative Git operations ignore inherited repository/storage/discovery overrides such as `GIT_DIR`, `GIT_WORK_TREE`, `GIT_COMMON_DIR`, and `GIT_INDEX_FILE`. They preserve authentication and unrelated environment and never mutate the parent environment.

A transition claims the new checkout provisionally while retaining the previous attachment and claim. Target trust and project resources are prepared outside the mutation gate. The host replaces the Pi runtime only after the issuing tools finish and their results persist; it then commits the new association and releases the old claim. Validation, trust denial/cancellation, resource failures, extension vetoes, or changed session generations do not authorize losing the previous attachment. A failure after runtime teardown recreates the prior project context; if restoration itself fails, ordinary tools remain blocked rather than running with mismatched resources. Explicit attach/detach remain available for recovery.

No command removes worktrees, branches, user files, or private workspace data itself; complete only invokes the repository's configured cleanup. Claims coordinate participating A1 sessions, not arbitrary external editors, Git locks, repository cleanup ownership, or permission to merge/delete anything.

## Project resources and working directories

Successful attachment reloads target project settings, AGENTS.md context files, skills, extensions, and tool defaults through Pi's supported runtime lifecycle. Trust is resolved before project resources execute. A session-only trust decision in one project is not inherited by another. Refused or cancelled target trust keeps the prior context. The conversation, session ID, session file, and single-writer ownership stay intact; host subscriptions and extension UI are rebound. Pending user input or bash messages block replacement until consumed, rather than losing queued text or images. The agent then continues its existing task with the runtime's transition result.

Detach reloads startup resources as well as restoring tool cwd. An ordinary tool never executes against a new attachment under stale project resources. Built-in read, bash, edit, write, grep, find, and ls resolve relative paths from the verified current context. Explicit absolute paths retain their meaning. A1 never uses process-global chdir; independent terminals keep their cwd. New extension instances receive the new project cwd; captured contexts from the previous runtime are stale.

Project transitions respect explicit tool exclusions and extension overrides. Comparison sessions and runtimes without worktree ownership do not gain A1's control tool. Controls require a saved persistent conversation.

Background repository polling observes healthy claims without rewriting them. Shutdown releases the runtime's claims; crash recovery checks exact recorded process liveness before acquiring another owner's checkout. Definitively missing/replaced attachments release only this session's association and claim and fail the triggering ordinary tool once. Startup resources reload at the next safe idle boundary before more ordinary work runs. Uncertain identity, timeout, or I/O failures do not silently detach or redirect work. A verified selected-repository anchor, not a Git repository at startup, establishes whether a missing checkout is definitive.

Implementation completion and review handoff do not end the task attachment. Repository cleanup handoff is independent and does not require runtime detach.

## Completing a merged task

Never run repository cleanup directly against the attached checkout. In particular, a Windows shell started there pins its directory until it exits, even after a shell `cd`.

Completion requires a valid owned attachment, no Git lock, and no tracked, staged, or untracked changes. A blocker leaves the session attached. Completion also refuses when the immutable startup directory lies inside the checkout being completed: detach without cleanup and use the repository's ordinary primary-checkout cleanup instead of removing the session's own fallback directory.

Otherwise completion reloads startup resources, releases the attachment, and runs cleanup after the issuing shell/tool exits. **Tools return to the startup directory; cleanup runs in the selected repository's verified primary checkout.** Those directories need not be the same, and startup may be outside Git.

The selected repository declares cleanup once in a committed `.a1/worktree.json`:

```json
{ "cleanup": ["node", "tools/remove-worktree.mjs", "--repo", "{primary}", "--path", "{worktree}", "--pr", "{pr}"] }
```

A1 reads the declaration from the verified primary checkout, never the task checkout being left or an unrelated startup directory. It runs the array without a shell, substituting `{primary}`, `{worktree}`, `{branch}`, `{change}`, and `{pr}`. The first element must be a real executable such as `node`, not a `.cmd` shim. No per-machine setup is required. The cleanup command retains every eligibility, acceptance, ownership, and deletion safeguard; its report remains authoritative.

| Outcome | Meaning |
| --- | --- |
| `cleanup-finished` | The command ran; its own report follows. A1 does not infer removal. |
| `cleanup-failed` | The command failed; the checkout may remain. |
| `cleanup-unavailable` | No declaration or a required selector is missing; the checkout is retained. |
| `cleanup-skipped` | Repository identity changed, another live/unverifiable claim exists, or the request expired. |

In all these cleanup outcomes the session is already detached and remains operational in its startup context. Do not attach a partially removed checkout again. Attachment and completion do not grant merge authority.
