## Context

A1 already persists one repository-context association per stable Pi session and requires delivery agents to call `a1 session link-worktree`. That association validates the session file and Git worktree identity, drives footer/PR discovery, and survives resume. It intentionally does not represent live ownership. As a result, two independent sessions can persist associations to the same worktree and both receive a successful command result.

The cleanup subsystem has strong ownership semantics, but it is the wrong authority for this problem. Cleanup registration normally starts only when a pull request exists or is handed off, survives sessions for deletion safety, and controls destructive operations. Editing exclusivity is needed immediately, including before a draft PR exists, and must follow the lifetime of the running A1 session rather than the delivery cleanup lifecycle.

## Goals / Non-Goals

**Goals:**

- Give an agent an authoritative, bounded preflight before it chooses an existing worktree.
- Ensure at most one live A1 runtime can claim one canonical Git worktree for delivery work.
- Make the final link operation atomic so two sessions racing after the same status result cannot both succeed.
- Allow a cleanly stopped or verifiably dead owner's worktree to become available without treating age or inactivity as abandonment.
- Preserve durable same-session repository context and safe resume when no conflicting runtime owns the worktree.
- Keep editing claims independent from cleanup, Git, GitHub, OpenSpec approval, and merge authority.

**Non-Goals:**

- Determine whether two natural-language requests are duplicates or automatically choose the best existing branch.
- Prevent arbitrary external editors, terminals, scripts, or non-A1 processes from changing a checkout.
- Share a worktree concurrently for read-only or coordinated multi-agent work.
- Force-remove Git locks, stop another session, recover an unverifiable owner, or delete worktrees/branches.
- Replace the repository cleanup ownership journal or make a footer association sufficient cleanup authority.

## Decisions

### 1. Add a live claim beside, not inside, cleanup ownership

Introduce a versioned A1-owned live-claim store keyed by canonical repository common-directory identity and canonical worktree Git-directory identity. A claim names a stable session, a distinct runtime generation, verified process identity, and bounded liveness metadata. It contains no prompts, transcript content, credentials, branch contents, or cleanup token.

The durable repository-context record remains the source for resume and footer selection. A live claim answers only whether this running runtime may use the checkout. Existing version-1 context records remain readable. On first use after upgrade, a running session acquires a claim before its association becomes active; migration does not assume that a persisted historical association is still live.

The claim store and context store use atomic writes under one bounded mutation lock for claim/link transitions. Files are size bounded, ordinary regular files beneath the A1 data root, and validated before use. Canonical identity, not path spelling alone, prevents aliases or a reused directory from inheriting a claim.

### 2. Bind liveness to an A1 runtime generation and verified process identity

Each running bare-A1 session publishes one runtime-generation lease after the Pi session identity is known and before session-context commands can succeed. The owned runtime refreshes bounded liveness while active and closes it during orderly disposal or session replacement. The same stable Pi session opened in two processes has two runtime generations; it is not treated as one owner.

Liveness uses the repository's established platform process-identity primitives so PID reuse cannot establish continuity. A claim may be replaced only when its recorded runtime has cleanly released it or the recorded process identity is verified absent. Elapsed time, an old heartbeat, lack of recent transcript writes, a clean Git status, or a missing PR is never sufficient takeover evidence. When process identity cannot be verified, inventory reports `unverifiable` and linking fails closed; the agent uses a separate worktree.

A short atomic reservation covers the interval between the link command and the runtime's next lease refresh. If a command cannot bind the reservation to the invoking live runtime generation, it fails without changing the previous association. This avoids a race in which two link commands both observe an unclaimed target.

### 3. Make linking an atomic claim transfer

`a1 session link-worktree <path>` keeps its existing session-file and same-repository validation and adds one transaction:

1. Resolve and validate the invoking live runtime generation and target worktree identity.
2. Revalidate the target claim under the mutation lock.
3. Acquire it when absent, already owned by that exact runtime, cleanly released, or owned by a process identity verified absent.
4. Atomically update the durable repository-context association.
5. Release the runtime's previous worktree claim only after the new claim and association are committed.

If another live runtime owns the target, the command exits nonzero with a stable `worktree-active-in-another-session` diagnostic and leaves both the old association and both claims unchanged. Unverifiable ownership uses a distinct fail-closed diagnostic. Relinking the current target is idempotent. A failed stream switch never strands the current stream unclaimed.

`a1 session unlink-worktree` clears the durable association and releases only the invoking runtime's matching live claim. Runtime disposal releases live authority but may retain the durable association so the same stable session can restore it later. Resume reacquires the saved target only when no other live runtime owns it; otherwise A1 falls back to startup repository context and the agent must choose or create another worktree.

### 4. Add read-only repository worktree inventory

Add `a1 session worktrees`, available only from a validated active A1 shell-tool session. It enumerates canonical Git worktrees belonging to the startup repository and joins them with validated live claims. It reports deterministic path and branch rows with one of:

- `current`: claimed by this exact runtime generation;
- `busy`: claimed by another verified-live runtime;
- `available`: no claim, a clean release, or a prior process verified absent;
- `unverifiable`: malformed, contended, unsupported, or uncertain ownership that cannot safely be reused.

The command is observational: it does not link, reserve, release, recover, edit, clean, or delete anything. It does not show stable session IDs, process IDs, session files, prompts, or transcript data. A status result is only advisory because another session may race after it; successful `link-worktree` is the authoritative acquisition gate.

An absent claim does not mean the branch is relevant or safe to adopt. The agent still checks branch/change/PR identity from the primary checkout and must not enter the candidate path for active work before acquisition.

### 5. Make claim preflight a delivery checkpoint

Repository guidance changes from unconditional fresh creation to a guarded choice:

1. Run the existing cleanup sweep from primary and relay its lines.
2. Run `a1 session worktrees` before selecting an existing checkout.
3. Reuse an existing checkout only when it is reported `available`, its branch/OpenSpec change/PR match the exact requested stream, and atomic `link-worktree` succeeds.
4. Never work in a `busy` or `unverifiable` checkout. Create a fresh task worktree and link it instead.
5. If a previously available checkout loses the race, do not retry by overriding the owner; create a fresh worktree.

A new worktree is still linked immediately and before any planning, implementation, test, or delivery-documentation edit. Approved implementation retains the already claimed planning worktree. A resumed stream must reacquire its exact existing worktree before editing. Similar names, files, task descriptions, recent activity, or PR titles never establish permission to adopt a checkout.

The claim does not authorize cleanup, acceptance, finalization, merge, remote deletion, or local removal. Those continue through their existing commands and evidence.

## Failure and Concurrency Matrix

| Situation | Result |
| --- | --- |
| Two sessions race to link one available worktree | Exactly one atomic claim succeeds; the loser receives the active-owner diagnostic and creates a separate worktree |
| Another runtime is alive but idle | Worktree remains `busy`; inactivity does not release it |
| Owner exits cleanly | Live claim releases; durable context may remain resumable; inventory reports available to other sessions |
| Owner crashes | A later operation may replace the claim only after exact process identity is verified absent |
| PID is reused | Start identity mismatch prevents the new process from being treated as the old owner |
| Process verification is unavailable | Worktree is `unverifiable`; no takeover occurs |
| Same stable session is opened twice | Runtime generations differ; the second process cannot share the first process's claim |
| Stream switch cannot acquire target | Existing association and claim remain intact |
| Worktree path is reused for different Git metadata | Canonical Git-directory mismatch invalidates the old context/claim; linking requires fresh validation |
| Non-A1 editor changes files | Outside cooperative claim enforcement; Git status and delivery safeguards still apply |

## Risks / Trade-offs

- **[A cooperative claim cannot police external tools]** -> State the boundary explicitly and retain Git cleanliness, branch identity, and cleanup safeguards.
- **[A runtime crash leaves state behind]** -> Reclaim only after verified process absence; uncertainty blocks reuse rather than guessing.
- **[Status can become stale immediately]** -> Treat inventory as advisory and make atomic linking the mandatory final gate.
- **[Persisted association and live ownership diverge]** -> Keep separate schemas and require claim reacquisition before an association becomes active after resume.
- **[Extra process checks add latency]** -> Bound inventory, cache only within one operation, reuse established process identity helpers, and avoid GitHub access.
- **[A live but abandoned session blocks the preferred checkout]** -> Prefer a separate worktree. Stopping the original session releases it; no automated takeover of a live process is allowed.
- **[Agents mistake similarity for stream identity]** -> Require exact branch/change/PR checks and explicitly reject inference from names, recency, or similar files.

## Migration Plan

1. Add versioned runtime-generation and worktree-claim records with bounded atomic mutation, exact process identity, legacy context compatibility, and concurrency fixtures.
2. Integrate runtime lease publication, refresh, session replacement, clean disposal, crash detection, and conditional resume with the owned bare-A1 lifecycle.
3. Extend the session CLI with read-only `worktrees` inventory and atomic claim-aware link/unlink behavior and diagnostics.
4. Update OpenSpec workflow context, delivery skill, setup documentation, CLI help, and focused governance contracts.
5. Validate two simultaneous A1 runtimes against one and two real disposable Git worktrees, including races, idle owners, clean exit, crash, PID/start mismatch, uncertain liveness, resume, stream switching, and legacy records.

Rollback stops enforcing and authoring live claims while retaining readable version-1 durable associations. It does not delete worktrees, branches, cleanup registrations, session files, or Git state.
