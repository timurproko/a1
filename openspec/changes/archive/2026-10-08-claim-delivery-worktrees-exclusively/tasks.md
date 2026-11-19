## 1. Live claim foundation

- [x] 1.1 Add versioned bounded runtime-generation and canonical worktree-claim records under A1-owned data, with atomic mutation locking and legacy repository-context compatibility; verify malformed, oversized, linked, aliased, foreign, reused-path, and concurrent-writer cases fail closed.
- [x] 1.2 Bind claims to exact runtime generation and platform process identity; verify live-idle ownership, clean release, verified-dead replacement, PID reuse, stale heartbeat, and unavailable process verification never permit an uncertain takeover.
- [x] 1.3 Implement atomic acquire/relink/unlink transfer semantics; verify two simultaneous claim attempts produce one winner, a failed switch preserves the old claim and association, same-target relink is idempotent, and no operation mutates Git or cleanup state.

## 2. Runtime lifecycle and resume

- [x] 2.1 Publish and maintain one liveness lease for the active bare-A1 session runtime, including session replacement and orderly disposal; verify bounded refresh, timer/process cleanup, and no lease publication from the `a1 pi` comparison profile.
- [x] 2.2 Reacquire a durable associated worktree on restart/resume only when no other runtime owns it; verify successful same-session restore, duplicate-process refusal, conflicting-owner fallback to startup context, and legacy association migration.
- [x] 2.3 Verify runtime or command crashes cannot leave two valid live owners and that a later session reuses the checkout only after exact owner death is established.

## 3. Session command surface

- [x] 3.1 Add read-only `a1 session worktrees` parsing, help, and deterministic current/busy/available/unverifiable output for the validated startup repository; verify it exposes no session, process, transcript, or credential identity and performs no reservation or mutation.
- [x] 3.2 Make `a1 session link-worktree` require successful atomic claim acquisition and emit stable active-owner and unverifiable-owner failures while retaining existing canonical same-repository checks and exact-path success confirmation.
- [x] 3.3 Make unlink and stream switching release only the invoking runtime's matching claim; verify foreign claims, cleanup registrations, worktree locks, branches, PRs, and Git content remain untouched.

## 4. Delivery policy and documentation

- [x] 4.1 Update `openspec/config.yaml` and `.agents/skills/change-delivery/SKILL.md` so every delivery preflights worktrees, never uses busy/unverifiable candidates, and reuses an available checkout only after exact stream checks and successful atomic linking; preserve fresh-worktree fallback and same-PR approved implementation.
- [x] 4.2 Update worktree setup and CLI documentation to distinguish live editing claim, durable footer context, tool cwd, Git state, and cleanup ownership, including clean stop, crash, resume, and race behavior.
- [x] 4.3 Add focused governance/documentation contracts that reject guidance based on worktree similarity, age, recency, clean status, or override of a live/uncertain owner.

## 5. Integrated evidence

- [x] 5.1 Exercise two live bare-A1 sessions against disposable same-repository worktrees; verify distinct worktrees can be claimed independently and one shared target permits exactly one owner without either process editing the other's checkout.
- [x] 5.2 Exercise available-check then link races, idle ownership, clean exit, forced owner termination, unverifiable liveness, duplicate resume, stream switching, and reused paths; record bounded evidence without terminating user sessions or touching retained repository worktrees.
- [x] 5.3 Validate the focused lifecycle, CLI, runtime, governance, architecture, and strict OpenSpec scopes required by the final implementation, then provide a build-first manual handoff demonstrating status, refusal, release, and safe reuse.
