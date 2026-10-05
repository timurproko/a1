## Context

See `proposal.md` for motivation. The repository already ignores `.artifacts/`, uses it for generated validation and delivery output, and treats the exact root as disposable through guarded local-worktree cleanup. Delivery guidance nevertheless demonstrates an agent-created pull-request body under `$TMPDIR`, and agents may similarly choose `%TEMP%`, `/tmp`, a desktop, or another path outside the worktree for transient diffs, logs, and command payloads.

## Goals / Non-Goals

**Goals:**
- Give agent-created delivery scratch files one visible, repository-owned location.
- Bind each scratch file to the repository worktree whose operation consumes it.
- Reuse the existing ignored `.artifacts/` and guarded cleanup contract.
- Make the distinction between agent-selected files and tool-internal temporary storage explicit.

**Non-Goals:**
- Relocating product runtime files, npm/Cargo internals, operating-system resources, or test framework temporary directories.
- Making `.artifacts/` durable evidence, tracked source, or a credential store.
- Expanding cleanup authority beyond the existing exact `.artifacts/` safeguards.
- Requiring agents to preserve scratch files after their operation or handoff.

## Decisions

### Put directly materialized delivery scratch under the owning worktree

When an agent chooses a path for a transient repository-delivery file, it will create that file beneath the exact `.artifacts/` root of the repository worktree that owns the operation. This includes pull-request and comment bodies, command input files, captured query output, temporary patches/diffs, and ad hoc logs. A linked task delivery uses its linked worktree rather than the primary checkout, another worktree, the system temp directory, home, or desktop.

Examples will use a purpose-specific descendant such as `.artifacts/agent/pr-body.md`; the root contract remains `.artifacts/` so agents and repository commands may organize descendants without introducing another cleanup-policy entry.

Alternative considered: continue using the OS temp directory and delete each file immediately. This was rejected because cleanup can be interrupted, the path remains outside repository ownership, and the file is harder to associate with the delivery that created it.

### Scope the rule to paths selected by the agent

The policy governs files an agent explicitly creates or asks a command to consume by a chosen path. It does not redefine paths internally allocated by Git, GitHub CLI, Node, OpenSpec, package managers, test frameworks, product runtime code, or other invoked tools. Hermetic tests may continue to use isolated temporary roots when temporary-path behavior is part of their contract.

This boundary prevents a delivery instruction from accidentally becoming a product-wide ban on temporary storage while still covering the screenshot's `write ...Temp\pr674-body.md` behavior.

### Keep scratch disposable, non-authoritative, and safe

Agent scratch beneath `.artifacts/` remains ignored and must not be staged or committed. Durable implementation evidence still belongs in its declared tracked OpenSpec location; moving a draft through `.artifacts/` does not make it authoritative. Existing restrictions on credentials and sensitive content continue to apply: the new location permits scratch storage but does not authorize materializing secrets.

The existing cleanup implementation already admits only the exact ignored `.artifacts/` root after containment, link, special-file, and nested-repository checks. This change reuses that policy and does not broaden deletion to near matches or outside targets.

### Pin the rule in all agent-facing delivery guidance

Implementation will align `openspec/config.yaml`, `.agents/skills/change-delivery/SKILL.md`, `docs/openspec-archive-automation.md`, and any directly relevant architecture guidance. The local finalization example will replace `$TMPDIR/openspec-pr-body.md` with an explicitly created `.artifacts/agent/` path in the owning worktree. Focused governance tests will require the positive `.artifacts/` rule and reject active guidance that instructs agents to place delivery scratch in OS temp.

## Risks / Trade-offs

- **[Risk] The primary checkout receives files intended for a task worktree** → Require the owning/linked worktree's exact `.artifacts/` root and test the worktree wording.
- **[Risk] A broad “no temp” assertion breaks valid runtime or test behavior** → Limit the contract to paths directly selected by delivery agents and state the tool/test exclusions explicitly.
- **[Risk] Scratch is mistaken for durable evidence** → Keep it ignored, uncommitted, and non-authoritative; tracked evidence retains its existing declared location.
- **[Risk] Sensitive data becomes easier to persist locally** → Preserve the rule that credentials and other prohibited content must not be written merely because `.artifacts/` is available.
- **[Trade-off] Scratch may remain until normal cleanup** → Accept bounded ignored residue inside the worktree because it is visible, associated with the task, and already covered by guarded disposal.

## Migration Plan

1. Add the canonical agent-scratch requirement and align all delivery guidance in the same implementation branch.
2. Replace active OS-temp examples with owning-worktree `.artifacts/agent/` examples.
3. Add focused guidance assertions for path ownership, exclusions, ignored/uncommitted status, and the absence of active `$TMPDIR` PR-body instructions.
4. Use the new location for this delivery's later PR-body updates once implementation is authorized.
5. Roll back through an ordinary corrective PR if the boundary proves incomplete; do not broaden cleanup or silently restore OS-temp guidance.
