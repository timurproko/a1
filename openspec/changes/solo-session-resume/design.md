## Context

The screenshot shows an exited solo session printing `a1 --session <id>`; the ordinary session command instead enters the resident UI, while `a1 solo --session <id>` fails at the CLI's blanket solo-arguments rejection. The separate resident attach message, `1 agent still running run a1 to return`, already describes the right action for a multi-agent tab and needs no change. Current `InteractiveLaunchIntent` and bootstrap also reject selection with `launchMode: "solo"`. The owned runtime already supports `sessionSelection` and resolves IDs/paths via the pinned Pi API; the direct and resident paths share a canonical session-writer lease. The former solo hint does not carry launch-mode information.

## Goals / Non-Goals

**Goals:** Reopen an exited solo A1 conversation in one direct solo UI with the same ID/history/cwd and no tab strip, using the same parser and session-selection semantics as the existing tabbed command. Preserve a fresh argument-free solo launch, existing session-writer ownership, release/guardian retry, and a copy-pasteable solo exit hint.

**Non-goals:** Changing resident detach/return messaging, auto-converting a running resident tab into a solo process, stealing/killing its writer, changing conflict diagnostics or `a1 --session`, importing Pi's CLI, adding a second renderer, changing saved-session formats, or enabling Pi-comparison session selection.

## Decisions

### 1. Reuse the narrow grammar, not a general solo passthrough

Support `a1 solo --session <path|id>` and `a1 solo --session-dir <dir> --session <path|id>` in either option order. The same bounded parser enforces nonempty values, single occurrences, no extra arguments, and a required `--session`; invalid solo forms fail before interactive startup. Help lists the supported forms. `a1 solo` without arguments remains fresh; `a1 pi` remains unchanged.

### 2. Keep launch mode and selection independent through transport

Carry `launchMode: "solo"` alongside the invocation-scoped `SessionSelection` through the immutable release/bootstrap/guardian path to the owned UI, including retry and development `./scripts/dev solo` routing. Relax the two mode-specific rejects but retain profile validation, shell-free argv encoding, and resident suppression for solo. No persistent or inherited `PI_SESSION_ID`/`PI_SESSION_FILE` inference. The direct path must not start or discover the resident host merely because a session was requested.

### 3. Restore only with the existing single-writer lease

Use the existing owned Pi resolver, project/cwd trust ordering, explicit path versus local/global ID semantics, and session-writer admission guard. The exited, unoccupied solo session resumes with its original identity/context. Leave existing live-writer conflict handling untouched: do not silently open a second writer, request a resident host shutdown, or add a mode-transfer mechanism. Bare `a1` still reattaches to a running multi-agent host, and ordinary tabbed `a1 --session` still focuses a held tab.

### 4. Correct the exited solo session's hint

Carry the direct-solo launch mode to the existing resume formatter at the session shell boundary (including the unclean-exit notice). An exited solo session prints `a1 solo --session <id>` with the existing optional `--session-dir` quoting; keep existing tabbed hints as they are, and leave the resident attach message `run a1 to return` untouched for agents that are still running. Hint text still appears only for a persisted session, and its arguments pass the same public grammar. Avoid inferring mode from session storage or transcript state.

## Risks / Trade-offs

- A running resident tab remains a separate case: bare `a1` returns to it. This change deliberately does not transfer a live tab to solo mode.
- An exited solo hint may be copied after that session opens elsewhere. The existing live lease, not the hint, decides whether a later launch may write.
- Launch transport crosses packaged and development entry points; focused parser and mode/hint tests must be paired with packaged-entry evidence that the selection reaches the direct owned runtime without resident initialization.

## Planning clarification

The maintainer clarified that the requested case is an **exited solo session**, not a live multi-agent handoff. The resident attach client already directs users to run bare `a1`; no resident mode change or special new occupied-session guidance is needed. Implementation still awaits explicit plan approval.
