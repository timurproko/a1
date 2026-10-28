## Context

The screenshot shows a solo session printing `a1 --session <id>` on exit; the ordinary session command instead finds the still-running resident agent, while `a1 solo --session <id>` fails at the CLI's blanket solo-arguments rejection. Current `InteractiveLaunchIntent` and bootstrap also reject selection with `launchMode: "solo"`. The owned runtime already supports `sessionSelection` and resolves IDs/paths via the pinned Pi API; the direct and resident paths share a canonical session-writer lease. The former solo hint does not carry launch-mode information.

## Goals / Non-Goals

**Goals:** Resume a saved A1 conversation explicitly in one direct solo UI with the same ID/history/cwd and no tab strip, using the same parser and session-selection semantics as the existing tabbed command. Preserve a fresh argument-free solo launch, safe session ownership, release/guardian retry, and a copy-pasteable mode-appropriate resume hint.

**Non-goals:** Auto-converting a running resident tab into a solo process, stealing/killing its writer, reinterpreting `a1 --session`, importing Pi's CLI, adding a second renderer, changing saved-session formats, or enabling Pi-comparison session selection.

## Decisions

### 1. Reuse the narrow grammar, not a general solo passthrough

Support `a1 solo --session <path|id>` and `a1 solo --session-dir <dir> --session <path|id>` in either option order. The same bounded parser enforces nonempty values, single occurrences, no extra arguments, and a required `--session`; invalid solo forms fail before interactive startup. Help lists the supported forms. `a1 solo` without arguments remains fresh; `a1 pi` remains unchanged.

### 2. Keep launch mode and selection independent through transport

Carry `launchMode: "solo"` alongside the invocation-scoped `SessionSelection` through the immutable release/bootstrap/guardian path to the owned UI, including retry and development `./scripts/dev solo` routing. Relax the two mode-specific rejects but retain profile validation, shell-free argv encoding, and resident suppression for solo. No persistent or inherited `PI_SESSION_ID`/`PI_SESSION_FILE` inference. The direct path must not start or discover the resident host merely because a session was requested.

### 3. Restore only with the single-writer lease

Use the existing owned Pi resolver, project/cwd trust ordering, explicit path versus local/global ID semantics, and session-writer admission guard. A free saved session resumes with its original identity/context. If a resident tab or another solo process still owns it, fail with a concise conflict and actionable instruction to stop the owning tab/agent and retry. Do not silently fork, request that the resident host terminate a writer, or open a second writer. Closing a tab through the existing `a1 tabs stop <tab-id>`/tab UI releases ownership while leaving its saved session resumable. The ordinary tabbed `a1 --session` continues to focus a held tab.

### 4. Make the exit hint match the runtime that exited

Carry the direct-solo versus ordinary tabbed launch mode to the existing resume formatter at the session shell boundary (including the unclean-exit notice). A solo session prints `a1 solo --session <id>` with the existing optional `--session-dir` quoting; tabbed sessions keep `a1 --session <id>`. Hint text still appears only for a persisted session, and its arguments pass the same public grammar. Avoid inferring mode from session storage or transcript state.

## Risks / Trade-offs

- A still-running resident tab holds a real writer; accepting solo selection alone cannot make that tab disappear safely. The user must explicitly stop the tab before a true same-ID solo resume, unless the maintainer approves a separate ownership handoff design.
- The hint may be copied from a solo session that has since been opened elsewhere. The live lease, not the hint, decides whether the later launch may write.
- Launch transport crosses packaged and development entry points; focused parser and mode/hint tests must be paired with packaged-entry evidence that the selection reaches the direct owned runtime without resident initialization.

## Open Question

Please confirm that an occupied session should **fail safely with guidance to stop its resident tab and retry**, rather than having `a1 solo --session` automatically close or transfer that live tab. The screenshot demonstrates an occupied writer, so this behavior is part of the approval decision.
