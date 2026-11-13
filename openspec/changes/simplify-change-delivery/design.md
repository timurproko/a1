## Context

The audit used develop at 41ab0cfa23a7793ed80bec89aff54c804d8973ec. Read-only GitHub inspection confirmed active no-bypass development protection, strict target currency and active docs auto-merge. The paired public repository has different adapters and metadata; shared behavior must not imply identical internals.

Instructions require a planning worktree and worktree-local scratch. Runtime entry does not deliberately adopt existing remote proposals or unoccupied local branches. Completion checks acceptance/archive/remote-ref absence, blocking published open-PR local removal. Handoff records local state but does not prove publication. Canonical specs also retain obsolete same-worktree and duplicate-inventory rules.

## Goals / Non-Goals

Goals: portable identity; operation-scoped authorization; preservation-based local disposal; coherent progress/readiness; one owning procedure per operation; compatibility for existing PRs and records.

Non-goals: a new workflow framework, distributed editing locks, weaker checks, agent-armed implementation auto-merge, independent bot integration, release changes, private export, forced metadata migration or deleting actual user resources in tests.

## Decisions

### Independent state and authorization

Change progress, optional local workspace and authorized operations are independent. Planning-only remains planning-only; one clear instruction may approve a presented plan and request implementation without another phrase or turn. Deliver-through-PR includes scoped commits/pushes and routine metadata updates; edit-only does not imply publishing. Only material scope/behavior changes need renewed approval. Merge, remote deletion, export and hosting mutation remain separate permissions.

### Remote planning and scratch

Use explicit repository/base/head identity and real planning commits limited to the selected change folder. Ordinary GitHub CLI/API use remains supported; any convenience helper accepts stdin and needs no Git cwd, runtime or dependency install. Branch creation is create-only; subsequent writes have expected-head protection. Retries discover the same branch/PR; partial publication is reported without automatically deleting refs. Draft outcomes remain unchecked. No dummy diff is introduced. Remote payloads use memory/stdin or isolated secret-free session scratch; implementation scratch stays in its checkout artifacts. Required durable evidence is never scratch-only.

### Branch entry and portable handoff

Extend the existing entry boundary for an explicit PR/head or unoccupied local branch. Verify repository/ref/head, fetch remote state, preserve local tips and dirty owned edits, and report divergence/collisions rather than reset. Dependency setup is separate. Same-repository runtime attachment remains; a remote-planning session need not attach, and implementation may start in the selected repository. External agents use ordinary Git without forged runtime identity.

Handoff names repository, branch, change/PR, observed heads, publication state, remaining work and optional path. Clean status, detach and cleanup release do not prove push. Cleanup enrollment is not required for remote handoff; existing cleanup handoff commands retain their limited meaning.

### Exact local-only removal

Add a remove-local repository operation and runtime adapter distinct from complete/discard. One unambiguous request authorizes the named checkout. Fresh evidence must show local HEAD equals or is ancestral to its intended live remote branch; a descendant pushed by the receiving machine is valid. Open PR, pending CI, unfinished implementation and absent acceptance/archive are not blockers. Remote reads are read-only; preserve remote refs/PRs and local branch refs by default.

Reuse scoped locks, bounded content inspection, identity rechecks, approved disposables, journaled non-force removal and partial recovery. Preserve dirty/untracked/unknown-ignored data, nested Git/submodules, private data, KEEP and live/unverifiable owners. Preflight before detach; run the trusted exact repository operation after shell exit and revalidate before deletion. Runtime code never owns filesystem deletion. Post-detach failures retain resources and leave the session usable. Record local retirement separately from delivery acceptance so later sweeps neither delete retained refs nor wait forever for merge. Automatic sweep gains no open-PR removal authority. Legacy remote-destructive discard remains compatible and explicitly distinct.

### Progress and validation

Map tasks usefully to outcomes without forcing one network round trip per outcome. Record local progress promptly and synchronize PR completion to published work at coherent checkpoints and before handoff. Never claim unpublished work is remote. Small changes may have one outcome and declared no-spec planning where contracts are unchanged, without invented scope or a planning merge. Keep implementation, focused results, final-head CI and optional manual observation separate. Broader local checks are allowed when proportionate, not mandatory loops or categorically forbidden.

The audit passed 135 selected tests but one delivery-body suite failed to load in Vitest; standalone Node syntax checking passed. Diagnose that touched-suite failure rather than claiming the suite is green or broadening runtime scope automatically.

### Structural readiness and explicit pause

Retain Proposal, Implementation, Acceptance and machine Automation linkage with one or more meaningful outcomes. Sentence/byte/item limits and lexical bans on tests, coverage, links or ordinary notation become guidance. Machine association, unambiguous structure, complete required tasks, exact-head validation and acceptance-to-manifest binding remain hard checks. Checkpoint tooling may invoke the shared body validator internally.

Use delivery-hold across promotion, finalization, automated branch refresh and auto-merge, including pre-mutation snapshot checks. Release triggers fresh bounded reconciliation. Finalized drafts resume from archive/history without manually undoing finalization. A persistent pause uses hold, not repeated draft toggling with all outcomes checked. Existing candidate-change invalidation of human integration authority remains.

### Integration and owning guidance

Retain current explicit one-shot protected expected-head merge and personally armed exact-candidate routes. Do not add deferred merge promises, bot implementation merges, bypasses or inferred permission. Keep routine docs integration active but exclude governance/agent/cleanup authority and privileged-policy instructions even under docs/Markdown paths. Classify complete rename sources/destinations and lifecycle association; respect hold/opt-out. Required checks, strictness and live workflow activation stay unchanged.

Root/tool/generic skill instructions route to lifecycle/worktree/cleanup owners, without competing approval/inventory/archive authority. Remote commands use explicit repository identity; local examples use platform-appropriate paths. Preserve aliases, metadata and historical evidence. Downstream runtime adapters require a compatible released interface; standalone Git/repository operations do not require installing A1.

## Risks / Trade-offs

- External remote deletion races -> fresh bound evidence, retained local branch by default, no distributed backup guarantee.
- Windows locks/concurrent owners -> settle outside the target, scoped rechecks and recoverable journaling.
- Relaxed prose mistaken for relaxed correctness -> retain structural/completion/identity checks and negative fixtures.
- Old canonical contradictions -> reconcile affected full blocks and preserve scenario identities rather than append competing summaries.
- Untrusted proposed policy -> integrate through deployed trusted policy before activation; no self-authorizing bootstrap.

## Migration Plan

1. Land compatible tooling and coherent guidance through the current delivery route.
2. Introduce local-retirement records compatibly; keep automatic completion/sweep conservative and preserve existing PRs.
3. Release runtime support before paired repository adoption; remote planning and standalone operations remain independent.
4. Exercise no-checkout publication, branch reuse, two-machine handoff, open-PR removal, unknown data, races, holds and protected integration using isolated fixtures only.
5. Roll back new entry points without rewriting history/deleting records/weakening protection. Report live observations separately from implementation completion.
