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
| `a1 worktree remove-local` | Queue the distinct preflighted local-removal operation. |

Shell mutations queue a request; they do not change context while their own process still pins the old directory. The shell's zero exit code means **requested, not attached**. The runtime resolves the request after that tool batch and reports the final outcome separately. Agents wait for that runtime confirmation, not another inventory check. An unrelated terminal lacks the exact shell-tool session identity and cannot operate on this session.

`a1 session link-worktree`, `unlink-worktree`, and `worktrees` remain compatible aliases. They use the same request/confirmation boundary.

## Repository selection and safety

An absolute attachment target intentionally selects its repository, including across repository boundaries. Enter/list use explicit `repo` first, otherwise the active repository, otherwise discovery from the immutable startup directory. When discovery finds no repository, supply a repository path or attach an absolute task checkout; a new session is not required. A later shell `cd` never silently rebinds the session.

Enter creates `.worktrees/<short-description>` under the selected repository's primary checkout. It fetches the selected origin base before creating a new topic branch. Base selection is explicit `base`, local Git configuration `a1.worktreeBase`, then the origin default branch; local-only repositories fall back to the primary branch. Matching worktrees retain their edits and history. An existing origin task branch is fetched and adopted at its observed proposal head; an unoccupied local branch retains its exact tip, including unpublished commits. Divergent local/remote histories block entry without reset. Path/branch collisions, primary checkouts, detached branches, Git locks, and live or unverifiable ownership remain blockers. A1 never forces takeover, installs dependencies, or runs checkout hooks or repository setup commands.

Authoritative Git operations ignore inherited repository/storage/discovery overrides such as `GIT_DIR`, `GIT_WORK_TREE`, `GIT_COMMON_DIR`, and `GIT_INDEX_FILE`. They preserve authentication and unrelated environment and never mutate the parent environment.

A transition claims the new checkout provisionally while retaining the previous attachment and claim. Target trust and project resources are prepared outside the mutation gate. The host replaces the Pi runtime only after the issuing tools finish and their results persist; it then commits the new association and releases the old claim. Validation, trust denial/cancellation, resource failures, extension vetoes, or changed session generations do not authorize losing the previous attachment. A failure after runtime teardown recreates the prior project context; if restoration itself fails, ordinary tools remain blocked rather than running with mismatched resources. Explicit attach/detach remain available for recovery.

No command removes worktrees, branches, user files, or private workspace data itself; complete only invokes the repository's configured cleanup. Claims coordinate participating A1 sessions, not arbitrary external editors, Git locks, repository cleanup ownership, or permission to merge/delete anything.

## Project resources and working directories

Successful attachment reloads target project settings, AGENTS.md context files, skills, extensions, and tool defaults through Pi's supported runtime lifecycle. Trust is resolved before project resources execute. A session-only trust decision in one project is not inherited by another. Refused or cancelled target trust keeps the prior context. The conversation, session ID, session file, and single-writer ownership stay intact; host subscriptions and extension UI are rebound. Pending user input or bash messages block replacement until consumed, rather than losing queued text or images. The agent then continues its existing task with the runtime's transition result.

Detach reloads startup resources as well as restoring tool cwd. An ordinary tool never executes against a new attachment under stale project resources. Built-in read, bash, edit, write, grep, find, and ls resolve relative paths from the verified current context. Explicit absolute paths retain their meaning. A1 never uses process-global chdir; independent terminals keep their cwd. New extension instances receive the new project cwd; captured contexts from the previous runtime are stale.

Project transitions respect explicit tool exclusions and extension overrides. Comparison sessions and runtimes without worktree ownership do not gain A1's control tool. Controls require a saved persistent conversation.

Background repository polling observes healthy claims without rewriting them. Shutdown releases the runtime's claims; crash recovery checks exact recorded process liveness before acquiring another owner's checkout. Definitively missing/replaced attachments release only this session's association and claim and fail the triggering ordinary tool once. Startup resources reload at the next safe idle boundary before more ordinary work runs. Uncertain identity, timeout, or I/O failures do not silently detach or redirect work. A verified selected-repository anchor, not a Git repository at startup, establishes whether a missing checkout is definitive.

Implementation completion and review handoff do not end the task attachment. Repository cleanup handoff is independent and does not require runtime detach. Attachment/handoff policy is [R12](../delivery-rules.md#r12---portable-handoff).

Informational listing waits for a consistent coordination snapshot. An abandoned in-flight mutation/execution gate is not reclaimed by age or parent-PID death; uncertain children remain blocking under [the execution interface](#supported-unclaimed-target-execution-interface).

## Completing a merged task

Never run repository cleanup directly against the attached checkout. In particular, a Windows shell started there pins its directory until it exits, even after a shell `cd`.

Completion requires a valid owned attachment, no Git lock, and no tracked, staged, or untracked changes. A blocker leaves the session attached. Completion also refuses when the immutable startup directory lies inside the checkout being completed: detach without cleanup and use the repository's ordinary primary-checkout cleanup instead of removing the session's own fallback directory.

Otherwise completion reloads startup resources, releases the attachment, and runs cleanup after the issuing shell/tool exits. **Tools return to the startup directory; cleanup runs in the selected repository's verified primary checkout.** Those directories need not be the same, and startup may be outside Git.

Before detaching, both operations run the selected primary checkout's exact preservation preflight and bind the paired execution digest. Both arrays must target `{worktree}`; execution additionally requires `{snapshot}`. A1 captures HEAD/ref and physical checkout/pointer/admin generations before preflight and rechecks before detaching. Missing support/selectors or failed preflight keeps the attachment; execution retains all [R15](../delivery-rules.md#r15---runtime-and-cleanup-boundaries) boundaries.

The selected repository declares cleanup once in a committed `.a1/worktree.json`:

```json
{
  "cleanupPreflight": ["node", "scripts/governance/local-worktree-cleanup.mjs", "preservation-preflight", "--repo", "{primary}", "--path", "{worktree}", "--runtime-preflight"],
  "cleanup": ["node", "scripts/governance/local-worktree-cleanup.mjs", "complete", "--repo", "{primary}", "--path", "{worktree}", "--change", "{change}", "--pr", "{pr}", "--approved-snapshot", "{snapshot}"]
}
```

A1 reads the file from the selected repository's verified primary checkout, never the task checkout being left or an unrelated startup directory, so a task branch cannot change what runs until it is merged. The list is run without a shell from the primary checkout, with `{primary}`, `{worktree}`, `{branch}`, `{change}`, `{pr}`, and the opaque base64url `{snapshot}` substituted in each element; the first element must be a real executable such as `node`, not a `.cmd` shim. A repository without the paired declaration reports an explicit unavailable blocker before detaching; its safe standalone cleanup remains available. The command keeps every eligibility and deletion safeguard; A1 adds no deletion of its own. Delivery evidence is the command's to judge, so completing an unmerged task ends detached with the files intact and the command's blocker.

## Removing a published local checkout

Policy is [R13-R15](../delivery-rules.md#r13---explicit-published-local-removal). `a1 worktree remove-local` requires the primary checkout's committed `.a1/worktree.json` to declare `localRemoval` with `preflight` and `execute` argument arrays. Each array uses the existing executable/argument and placeholder syntax (`primary`, `worktree`, `branch`); execution additionally requires `{snapshot}`. See this repository's declaration for exact wiring.

Preflight runs from the selected primary while this session still owns its attachment and must report one eligible exact path. Missing, malformed or failing support retains the attachment. After success, A1 records a version-2 request binding the adapter digest and full approved physical/HEAD snapshot, then detaches; settlement occurs only after the issuing shell exits. A changed/recreated checkout or published HEAD is not a new approval. A changed declaration, a new live/unverifiable claim, or an expired request blocks execution. The repository then independently rechecks publication, content and claims. Its report is authoritative; a post-detach blocker leaves the checkout intact and the session usable from startup. Runtime code does not remove checkout files or branch refs itself.

This is a separate operation from merged `complete` and confirmed remote-destructive `discard`; it has no sweep fallback. Deploy a compatible A1 release before downstream instruction migration. Source code or a task-branch declaration does not prove installed support is available. Standalone repository removal remains usable without A1 after that repository's tooling integrates.

## Paired runtime and repository rollout

Interface rollout follows [R15](../delivery-rules.md#r15---runtime-and-cleanup-boundaries); historical records remain governed by [R07](../delivery-rules.md#r07---trusted-finalization).

| Surface | Compatibility and deployment detail |
| --- | --- |
| Session commands | `session link-worktree`, `unlink-worktree` and `worktrees` dispatch the same requests/results as attach, detach and list. They do not install dependencies or create a nested runtime. |
| Completion adapters | Deploy the same compatible attachment/execution implementation before adopting paired declarations with mandatory `{snapshot}`. An older runtime cannot expand that selector before detaching; a new runtime rejects a legacy declaration lacking it. Task-branch source or a version string alone does not prove installed support. |
| Older pending completion | Version-1 requests remain readable but are not executable; even snapshot-shaped fields do not upgrade their authority. New requests use `a1-session-worktree-completion-v2`, which older settlers do not execute. Missing digest/snapshot support retains the checkout; there is no synthesized approval or sweep fallback. |
| Historical delivery evidence | Version-1/2 linkage, accepted records and immutable legacy version-3 layouts keep their existing readers. Rollout does not rewrite them into the new manifest/native-binding representation. |
| Cleanup journals | Older entries without newer completion-note fields load without an on-disk migration. Publication, ownership and accepted evidence remain separate facts. |
| Standalone repository tools | Checkout-independent planning uses explicit identity and ordinary GitHub authentication. Exact local removal uses the repository CLI and ordinary Node/Git; neither operation requires an A1 session, runtime registration, label creation or hosting-settings migration. |

The declaration is read from trusted primary, and repository cleanup still rechecks its own applicable evidence after the runtime leaves. An unavailable runtime interface does not prevent a separately authorized safe standalone operation. No package publication, companion-repository migration or live activation is implied by these instructions.

## Supported unclaimed-target execution interface

For exact-package reproduction, XR's queued-confirmation sequencing, stop/upgrade/restart prerequisites and the explicit **unsupported modern orphan recovery** limitation, see [consumer verification and recovery limits](../worktree-consumer-verification.md).

Repository consumers such as XR should use these public modules from one pinned, compatible **released** A1 package, not copy private runtime files:

- `@timurproko/a1/dist/foundation/lifecycle/worktree-cleanup-snapshot.mjs`: `captureWorktreeCleanupSnapshot(path)` returns the opaque version-1 approval snapshot; `assertWorktreeCleanupSnapshot()` compares all bound fields.
- `@timurproko/a1/dist/foundation/lifecycle/worktree-claim-boundary.mjs`: `executeUnclaimedWorktreeCleanup(snapshot, command, args, options)` runs a participating exact-target controller under attachment exclusion. `withUnclaimedWorktree(snapshot, options, callback)` supports repository-owned checks/purge around the same exclusion; destructive descendants use and await `executeCleanupCommand(command, args, { ...options, protectTarget: true })`.

Only the named snapshot/execution hooks above are the supported external contract; other exports and core files remain implementation details.

These standalone modules need ordinary Node/Git, not a session, profile initialization, dependency setup or hosting migration. Source snapshots become approval only through the caller's existing explicit authority and preservation/publication checks. Callers use the same A1 data-directory configuration as attachment and pass only the approved target to their existing controller. The mutex lives under the canonical Git common directory, outside removable worktree/admin directories; it does not create runtime storage when none exists. Shared local filesystem atomic exclusive creation and stable physical generation identity are required; unsupported or uncertain identities block.

Attachment/activation publication and cleanup use the same non-expiring target gate. Keep the **entire** destructive operation inside it and await every destructive child through the supported runner. Do not wrap an unmodified script that launches untracked destructive descendants, use an expiring lease, or unlock on timeout/abort notification. Intent is reserved synchronously before child validation/spawn; callback failure, suspension or process death cannot turn a pending child into an unguarded later spawn. Child close is the release boundary; a surviving/unverifiable descendant or orphaned intent retains the gate. Native Git removal disables hooks, fsmonitor, automatic GC and maintenance through the repository's existing argument-vector runner.

`WORKTREE_CLEANUP_RESERVATION` is a private generation-bound delegation from the gate holder to participating cleanup descendants. The held gate seals the exact target snapshot and configured claim namespace, so keeping its nonce cannot reapprove a changed HEAD or redirect claim inspection to an empty data directory. Nested controllers use that sealed namespace rather than the invoking shell's unrelated defaults. It is neither a user setting nor a substitute for repository eligibility checks. Never print, persist as agent evidence or manually fabricate its value. The A1 repository's `--approved-snapshot` selector carries the pre-detach approval into journal/purge/removal and rechecks it before destructive launch.

A suspended/dead holder's gate is not disposable or reclaimable after ten seconds (or any longer lease). `worktree-claim-busy` and `worktree-cleanup-child-unverifiable` preserve exclusion; uncertain state needs separately verified recovery after all related descendants are proven stopped. There is no automatic orphan eviction or unrelated-process termination in this interface. Ordinary dead editing claims remain inspectable through existing liveness rules when no in-flight gate blocks mutation.

Roll out attachment and cleanup support together, stop incompatible older writers before adoption, and rerun the consumer's actual competing-process/suspension/death probes against its pinned released artifact. Merely updating XR's cleanup wrapper while retaining the reviewed lease-based attachment files is not compatible. This PR neither publishes that release nor performs downstream migration; those remain deployment prerequisites.

## Completion settlement outcomes

| Outcome | Meaning |
| --- | --- |
| `cleanup-finished` | The command ran; its own report follows. A1 does not infer removal. |
| `cleanup-failed` | The command failed; the checkout may remain. |
| `cleanup-unavailable` | The adapter changed or the request lacks supported preflight/snapshot binding; the checkout is retained. |
| `cleanup-skipped` | Repository identity changed, another live/unverifiable claim exists, or the request expired. |

In all these cleanup outcomes the session is already detached and remains operational in its startup context. Do not attach a partially removed checkout again. Attachment and completion do not grant merge authority.

## Shared repository guidance

Read and follow [Shared delivery rules](../delivery-rules.md), using this repository's entry in [Delivery adapters](../delivery-adapters.json). R17 gives the exact repository routing paragraph; this operational reference does not define a second workflow policy.

Install an A1 release exposing this interface before integrating a repository's instruction migration. Older releases may expose only session-context aliases, require startup inside Git, or return quietly for unknown commands. A migration PR does not prove that the installed runtime supports these controls.
