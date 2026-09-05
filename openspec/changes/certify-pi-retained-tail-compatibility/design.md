## Context

See `proposal.md` for motivation and availability. This is a dependency-compatibility prerequisite, not another implementation of the CLI resume repair. Design is required because selecting a corrected Pi package affects typed engine APIs, context reconstruction, presentation inputs, and exact-package certification.

### Evidence and its limits

Investigation on 2026-09-05 found:

| Artifact | Observation |
| --- | --- |
| Pi 0.84.2 `docs/session-format.md` | Documents materialized `retainedTail`, checkpoint precedence over `firstKeptEntryId`, and summary-plus-tail context conversion |
| Clean and installed Pi 0.84.2 runtime | A checkpoint with one retained user message produces only `compactionSummary`; independently reproduced against both copies |
| Published 0.84.3, 0.84.4, and 0.85.0 `dist/core/session-manager.js` | Source inspection shows legacy-pointer context selection and summary-only compaction conversion, with no retained-tail handling |
| Upstream main source inspected during planning | Same missing retained-tail behavior; main was reported as `9841914c71a74d81abe07f751aefd271fd924e63` during investigation |

The reproduction uses synthetic data: a v3 compaction with `summary: "checkpoint"`, `tokensBefore: 1000`, and `retainedTail: [{ role: "user", content: "retained-tail-proof", timestamp: 1 }]`. The required message roles are `compactionSummary, user`; 0.84.2 returns only `compactionSummary`. A later ordinary message may still appear, which explains why a shallow test that merely checks whether a resumed transcript is nonempty misses the defect.

Package inspection is planning/provenance tooling only. Production must not read guessed dependency paths. The newer packages were inspected, not certified by a full candidate run. No passing version or upstream correction is claimed, and the original user's session has not been proved to contain retained-tail-only checkpoints. The original silent CLI no-op remains an independently demonstrated A1 defect.

## Goals / Non-Goals

**Goals:**
- Preserve the documented retained checkpoint semantics without duplicating Pi's compaction engine in A1.
- Establish artifact-level proof before any dependency change is accepted.
- Keep the independent CLI repair's existing message-preservation acceptance meaningful.
- Produce an explicit blocker, not a guessed fix, when upstream cannot yet supply the capability.

**Non-Goals:**
- Patching `node_modules`, subclass/prototype interception of concrete Pi internals, or private imports.
- Rewriting stored checkpoints into synthetic tree entries, mutating files on open, or stripping `retainedTail` to make an old runtime accept them.
- A1-owned compaction generation, summarization, or provider behavior.
- Automatically adopting the latest version, new upstream UI, unrelated features, or wider CLI grammar.
- Modifying/publishing upstream source through this A1 planning PR. An upstream contribution needs its own explicit scope and repository workflow.

## Decisions

### 1. Correct upstream public behavior, then certify a published candidate

The selected approach is upstream-first, preserving A1's public-API-only boundary and the CLI change's no-compaction-reimplementation rule. Establish a minimal upstream issue/reproduction packet and seek a corrected public package. Do not nominate 0.85.0 merely because it is newer. The exact target version is an output of artifact qualification, not a guessed input to this proposal.

The upstream correction must make its exported compaction type describe the actual supported payload and make its public context-building path implement `specs/pi-session-compatibility/spec.md`. The evidence packet should point to the missing behavior in `CompactionEntry`, `buildContextEntries`, and `sessionEntryToContextMessages`/`buildSessionContext` and request published-runtime regression coverage, not just corrected documentation.

This has a concrete external gate: without a corrected immutable published package, stop before pin migration. Preparing test fixtures and the upstream reproduction does not satisfy that gate. A1-owned compatibility projection is an alternative requiring a separately approved design, not an automatic fallback if upstream publication is slow.

### 2. Specify checkpoint semantics independently of the broken runtime

The expected context is derived from persisted data and the documented format:

- Find the latest checkpoint on the selected branch using the public session tree contract.
- If it has a valid `retainedTail`, its summary and ordered materialized messages are the checkpoint context; add only its active descendants. Presence of an empty array is authoritative and must not trigger the legacy path.
- Only absence of the field selects the existing `firstKeptEntryId` behavior.
- Keep branch-wide model/thinking resolution, normal model fallback, and supported non-message entries under the public Pi semantics.

These describe upstream acceptance, not an A1 algorithm to inject into Pi. The corrected runtime must supply the result through its documented public APIs. Tests use explicit marker order and complete payload expectations rather than computing expected output with the same candidate helper under test.

For malformed retained payloads, A1 validates the supported public message-shape contract at its integration boundary or consumes a documented upstream validation error. It must not turn `null`, a scalar, or invalid messages into absent/empty data. Diagnostics identify capability and operation, never message bodies. This bounded validation is not a second parser/context reconstruction engine.

### 3. Certify the exact package family and isolate required adapter migrations

Once an upstream publication exists, use an isolated candidate installation and record package version, registry integrity, public declaration/runtime evidence, and its resolved Pi family. Run public-package probes and stored-file reopening tests before considering the candidate eligible. A source commit or source checkout passing tests is insufficient if published JavaScript still omits the fix.

Adopt only a single exact manifest/lockfile-authoritative family through the normal code PR. Migrate public adapter call sites only where required for compatibility. Check extension APIs, settings inventory, one TUI module identity, session replacement, tools, authentication/model state, and existing packaging/lifecycle contracts. A candidate that requires broader product behavior or presentation changes is rejected for this scoped change until that scope is separately approved.

Do not automatically update owned upstream-derived UI units or blindly regenerate accepted visual baselines. The established owned presentation remains the baseline. Correctly showing messages previously omitted is the targeted behavior change, not permission for an unrelated visual refresh.

### 4. Check context and display together across public session transitions

Use `SessionManager` context/tree APIs and `createAgentSessionRuntime`/session replacement APIs to prove that the corrected package supplies complete context. Check A1's existing adapter and shell restoration inputs against that output. If a public rendering input needs a narrow adaptation for materialized messages that have no standalone entries, perform it once at the Pi integration boundary; do not generate persisted synthetic entries or inject extra messages through a private engine mutation.

Cover initial open, `switchSession`, public tree navigation, and fork/clone paths. Test retained-only messages so a renderer cannot pass by recovering the same text from older tree entries. On rejected targets, validate before invalidating the current session wherever the existing replacement API permits transactional preservation; do not claim successful replacement after failed context validation.

Runtime capability validation must fail before conversation use, while candidate certification must prevent a known-broken package from being released as compatible. A1's normal fresh/legacy-session behavior is not replaced with an automatic conversion or a new rendering path.

### 5. Keep the CLI dependency relationship explicit

`fix-cli-session-resume` remains responsible for grammar, instance-scoped target forwarding, cwd/trust initialization, hints, and installed-entry tests. Its partially implemented worktree is retained unchanged while this proposal is prepared. This compatibility change neither marks its tasks done nor merges its local implementation.

After the corrected dependency change passes acceptance and integrates, resume the CLI stream against that accepted integration state. Re-run its retained-tail restoration fixture with the original history-preservation expectation; do not change the assertion to match summary-only output. Its installed-command round trip must still pass independently. Existing no-upgrade language in the CLI design means that stream does not itself own dependency adoption; this separate accepted stream supplies the prerequisite.

## Validation Matrix

| Layer | Evidence |
| --- | --- |
| Public API behavior | Retained-only checkpoint; explicit empty tail; both fields with conflicting history; latest checkpoint; unrelated branch; legacy-only and uncompacted sessions |
| Message preservation | User text/images, assistant thinking/text/tool calls, matching tool results, supported custom messages, intentional repeated messages, original order and metadata |
| Declarations versus runtime | Compile-time construction of documented compaction payload plus execution through root exports from the same published package |
| Persistence | Valid v3 file opens/closes without changing ID, path, or bytes; rejected malformed file remains unchanged |
| Runtime and UI | Initial open, replacement, tree navigation, fork/clone; engine and visible retained messages agree; no automatic model/tool execution |
| Failure | Unsupported runtime and malformed retained payload fail before use with bounded non-content diagnostics; failed replacement retains the previous session where transactional semantics apply |
| Release | Exact installed artifact, public API compatibility, settings/extensions, TUI module identity, existing required regressions, and user-controlled manual restoration evidence |

Tests use disposable home/profile/release/control state and synthetic fixtures. A configured offline model fixture may establish model/thinking restoration without sending a network request. Source/package inspection belongs to provenance tooling; runtime capability decisions must use public behavior, not source text or distribution hashes.

## Risks / Trade-offs

- [No corrected upstream artifact exists yet] -> Treat availability as an external blocking prerequisite; do not describe complete planning as a runnable fix.
- [Upstream release contains unrelated breaking changes] -> Reject it unless the scoped compatibility gates pass without silently expanding product changes.
- [Documentation and declarations can drift from emitted JavaScript] -> Gate the actual published package and retain independent expected payloads.
- [A fixture retains messages both in the tail and older tree entries] -> Include retained-only messages and conflicting dual-format data to expose loss/duplication.
- [A runtime-only fix leaves transcript gaps] -> Compare public agent context with the owned visible transcript across all restoration paths.
- [Rollback to the old pin loses retained context again] -> Preserve files, report unsupported retained sessions, and avoid presenting an old unguarded package as a safe retained-tail runtime.

## Migration Plan

1. Prepare the upstream reproduction and compatibility corpus after implementation is explicitly requested. External upstream modifications/publication require their own authorized stream.
2. Wait for a corrected public package; record the exact artifact and qualifying evidence. If none exists, stop with dependency adoption blocked.
3. Evaluate the candidate in isolation; update A1's pin and narrowly required integration in a separate code PR only after all required gates and user acceptance.
4. Rebase/continue the independently accepted CLI repair against that integrated dependency, preserving its retained-history assertions and installed-entry acceptance.

No stored-session migration is required or authorized. Rollback uses normal ownership-safe A1 replacement and never edits retained session data. If the selected older runtime lacks this capability, retained-tail sessions are unavailable rather than safely resumable; upgrading to a certified runtime remains the recovery path.
