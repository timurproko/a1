# Acceptance

Accepted by the maintainer on 2026-09-02 after exact-artifact Windows Terminal comparison and required validation of PR #206. The maintainer confirmed that physical acceptance occurred before the manual merge.

## Specification and implementation

- Specification PR #205 merged planning commit `6aacb5330b8a4b72e17b873ebed90bfad397751a` as `c0852eb7dd9a645f38642b6675ef0e7b3263737e`.
- Implementation PR #206 added bare-A1-only finite-grammar input coordination, revisioned custom-viewport reuse, phase evidence, deterministic budgets, and impact-aware input validation. It did not modify installed Pi code, `a1 pi`, pinned Pi, or the unrelated primary-worktree `bin/pi-tui.d.ts` change.
- Implementation head `8e64e2dde1f445acf0f21637e259a8b7fefdb92e` was squash-merged manually as `78f8804be01f4c68e2ba91b6a58d638286353909`. Auto-merge remained disabled.
- Required development-validation run `33612424395` passed for the exact implementation head. Fast validation, changed-file documentation, full rendering/input validation, Linux and macOS containment, and the aggregate required check all succeeded.
- An earlier run exposed a pre-existing five-second timeout in a process-backed documentation-governance test under Windows contention. Commit `8e64e2dde1f445acf0f21637e259a8b7fefdb92e` bounded those integration tests at fifteen seconds; the focused test and final required run passed.
- Trusted merged-branch cleanup run `33612891875` succeeded. The implementation branch and worktree were removed after merge.

## Deterministic input and paint evidence

- Independent bare-A1, `a1 pi`, and pinned-Pi producers preserved semantic parity for ordinary typing, editing, Unicode and grapheme input, submit, menu navigation, replacement surfaces, resize, barriers, long transcripts, and input during pending streamed presentation.
- The ordinary bare-A1 editor workload improved from eight baseline input-driven frames to four candidate frames and from seven terminal writes to three.
- The menu-and-stream workload improved from five frames to three and from four terminal writes to two.
- Every accepted candidate workload kept at most one keyboard presentation pending, drained accepted-but-unpresented backlog to zero, emitted no stale post-drain frame, and produced no unexpected fullscreen clear.
- Geometry-stable dock input rerendered zero settled transcript blocks and did not paint stable transcript rows. Empty and 200-block settled transcripts retained equivalent bounded input and viewport work.
- Full validation captured fourteen rendering/input workloads, two deliberate determinism repeats, sixty matrix producer launches, ten isolated protocol launches, and seventy total launches without duplicating assertions over recaptured evidence.

## Physical Windows Terminal acceptance

The maintainer compared the exact implementation candidate with `a1 pi` in Windows Terminal and accepted the result before manually merging PR #206. The accepted behavior includes:

- isolated typing visibly starts immediately;
- rapid text, movement, deletion, and editing bursts finish without visible catch-up after input stops;
- held and repeated menu navigation tracks the current selection;
- wrapped editors, long settled transcripts, replacement surfaces, submit and cancellation barriers, and input during streaming retain current-state presentation;
- transcript styling, selection, controls, dock ordering, focus, cursor, auto-scroll, overlays, extension behavior, and terminal restoration remain accepted.

Wall-clock phase values remain diagnostic. Structural ordering, backlog, frame, stable-work, and paint budgets are the automated gates; the maintainer-controlled physical comparison is authoritative for perceived responsiveness.

## Verdict

Accepted. Bare `a1` now presents keyboard-driven current state immediately through its owned fullscreen viewport while preserving exact input semantics, conservative terminal authority, bounded stable-transcript work, and unchanged comparison profiles.
